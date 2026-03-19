import { PrismaClient } from '@prisma/client';
import { BusinessSnapshotService } from '../services/BusinessSnapshotService';
import { RuleEngine } from '../services/RuleEngine';

const prisma = new PrismaClient();

async function fixRO() {
    console.log('--- Recalculating RO Facts from Branches ---');
    
    const ro = await prisma.branch.findUnique({ where: { code: '3933' } });
    if (!ro) return;

    const uniqueDatesRaw = await prisma.fact.findMany({
        where: { unitId: ro.id },
        select: { date: true },
        distinct: ['date']
    });
    
    let updatedFacts = 0;
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

        const sumMap: Record<string, number> = Object.fromEntries(sums.map((s: any) => [s.metric, s._sum.value || 0]));
        const dep = sumMap['Total Dep'] || 0;
        const adv = sumMap['Adv'] || 0;
        const casa = sumMap['CASA'] || 0;
        
        sumMap['CASA%'] = dep > 0 ? (casa / dep) * 100 : 0;
        sumMap['CD_Ratio'] = dep > 0 ? (adv / dep) * 100 : 0;
        sumMap['Bus'] = dep + adv;

        for (const [metric, val] of Object.entries(sumMap)) {
            const existingFact = await prisma.fact.findFirst({
                where: { unitId: ro.id, date: d, metric: metric }
            });
            
            if (existingFact) {
                if (Math.abs(Number(existingFact.value) - val) > 0.01) {
                    await prisma.fact.update({
                        where: { id: existingFact.id },
                        data: { value: val }
                    });
                    updatedFacts++;
                }
            } else {
                const anyFactOnDate = await prisma.fact.findFirst({ where: { unitId: ro.id, date: d } });
                if (anyFactOnDate) {
                    await prisma.fact.create({
                        data: {
                            unitId: ro.id, 
                            date: d, 
                            metric: metric, 
                            value: val,
                            ingestionId: anyFactOnDate.ingestionId
                        }
                    });
                    updatedFacts++;
                }
            }
        }
    }
    
    console.log(`Updated ${updatedFacts} RO Fact records.`);

    console.log('Re-generating Panels for RO...');
    const roSnapshots = await prisma.misSnapshot.findMany({
        where: { unitId: ro.id }
    });
    
    const snapshotsToPopulate = roSnapshots.map((s: any) => ({ id: s.id, unitId: ro.id }));
    
    // Group snapshots by unique business dates
    const uniqueSnapshotDates = [...new Set(roSnapshots.map((s: any) => s.businessDate.toISOString()))]
        .map(dStr => new Date(dStr as string));

    for (const d of uniqueSnapshotDates) {
        const snapsForDate = snapshotsToPopulate.filter(s => {
            const snap = roSnapshots.find((ss: any) => ss.id === s.id);
            return snap?.businessDate.toISOString() === d.toISOString();
        });
        
        await prisma.$transaction(async (tx: any) => {
            await BusinessSnapshotService.populatePanelsBatch(tx, snapsForDate, d);
        });
        
        for (const s of snapsForDate) {
             await RuleEngine.evaluate(s.id);
        }
    }
    
    console.log(`Re-populated panels for ${roSnapshots.length} snapshot(s).`);
}

fixRO().catch(console.error).finally(() => prisma.$disconnect());
