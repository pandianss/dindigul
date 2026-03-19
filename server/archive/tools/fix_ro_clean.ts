import { PrismaClient } from '@prisma/client';
import { BusinessSnapshotService } from '../services/BusinessSnapshotService';
import { RuleEngine } from '../services/RuleEngine';

const prisma = new PrismaClient();

async function cleanAndFixRO() {
    console.log('--- Cleaning and Recalculating RO Facts from Branches ---');
    
    const ro = await prisma.branch.findUnique({ where: { code: '3933' } });
    if (!ro) return;

    const uniqueDatesRaw = await prisma.fact.findMany({
        where: { unitId: ro.id },
        select: { date: true },
        distinct: ['date']
    });
    
    const dates = uniqueDatesRaw.map((d: any) => d.date);

    for (const d of dates) {
        const sums = await prisma.fact.groupBy({
            by: ['metric'],
            where: {
                unitId: { not: ro.id },
                date: d
            },
            _sum: { value: true }
        });

        if (sums.length === 0) continue;

        const sumMap: Record<string, number> = Object.fromEntries(sums.map((s: any) => [s.metric, Number(s._sum.value || 0)]));
        const dep = sumMap['Total Dep'] || 0;
        const adv = sumMap['Adv'] || 0;
        const casa = sumMap['CASA'] || 0;
        
        sumMap['CASA%'] = dep > 0 ? (casa / dep) * 100 : 0;
        sumMap['CD_Ratio'] = dep > 0 ? (adv / dep) * 100 : 0;
        sumMap['Bus'] = dep + adv;

        await prisma.fact.deleteMany({
            where: { unitId: ro.id, date: d }
        });

        const factsToCreate = [];
        for (const [metric, val] of Object.entries(sumMap)) {
            factsToCreate.push({
                unitId: ro.id,
                date: d,
                metric: metric,
                value: val,
                ingestionId: "00000000-0000-0000-0000-000000000000" // Use a dummy UUID instead of null since schema might require it or not, better safe
            });
        }
        
        let validLog = await prisma.ingestionLog.findFirst({ where: { unitId: ro.id } });
        if (validLog) {
             for (let f of factsToCreate) {
                 f.ingestionId = validLog.id;
             }
        } else {
             const anyLog = await prisma.ingestionLog.findFirst();
             if (anyLog) {
                 for (let f of factsToCreate) {
                     f.ingestionId = anyLog.id;
                 }
             }
        }
        
        await prisma.fact.createMany({ data: factsToCreate });
    }
    
    console.log(`Cleaned and re-created facts for ${dates.length} dates.`);

    console.log('Re-generating Panels for RO...');
    const roSnapshots = await prisma.misSnapshot.findMany({
        where: { unitId: ro.id }
    });
    
    for (const s of roSnapshots) {
        await prisma.$transaction(async (tx: any) => {
            await BusinessSnapshotService.populatePanelsBatch(tx, [{ id: s.id, unitId: ro.id }], s.businessDate);
        });
        await RuleEngine.evaluate(s.id);
    }
    
    console.log(`Re-populated panels for ${roSnapshots.length} snapshot(s).`);
}

cleanAndFixRO().catch(console.error).finally(() => prisma.$disconnect());
