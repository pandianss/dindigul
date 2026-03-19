const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { RuleEngine } = require('./src/services/RuleEngine');
const { BusinessSnapshotService } = require('./src/services/BusinessSnapshotService');

async function fixRO() {
    console.log('--- Recalculating RO Facts from Branches ---');
    
    // 1. Get the RO
    const ro = await prisma.branch.findUnique({ where: { code: '3933' } });
    if (!ro) return;

    // 2. Identify all unique dates where RO has facts
    const uniqueDatesRaw = await prisma.fact.findMany({
        where: { unitId: ro.id },
        select: { date: true },
        distinct: ['date']
    });
    
    // Process each date
    let updatedFacts = 0;
    const dates = uniqueDatesRaw.map(d => d.date);

    for (const d of dates) {
        // Sum all branches except RO
        const sums = await prisma.fact.groupBy({
            by: ['metric'],
            where: {
                unitId: { not: ro.id },
                date: d
            },
            _sum: { value: true }
        });

        if (sums.length === 0) continue;

        // Ensure we calculate CASA% and CD_Ratio
        const sumMap = Object.fromEntries(sums.map(s => [s.metric, s._sum.value || 0]));
        const dep = sumMap['Total Dep'] || 0;
        const adv = sumMap['Adv'] || 0;
        const casa = sumMap['CASA'] || 0;
        
        sumMap['CASA%'] = dep > 0 ? (casa / dep) * 100 : 0;
        sumMap['CD_Ratio'] = dep > 0 ? (adv / dep) * 100 : 0;
        sumMap['Bus'] = dep + adv;

        // Update RO facts with these sums
        for (const [metric, val] of Object.entries(sumMap)) {
            // Find existing RO fact to update, avoiding creating new ones for now if not exists
            const existingFact = await prisma.fact.findFirst({
                where: { unitId: ro.id, date: d, metric: metric }
            });
            
            if (existingFact) {
                // Only update if difference is large (to avoid floating point churn)
                if (Math.abs(existingFact.value - val) > 0.1) {
                    await prisma.fact.update({
                        where: { id: existingFact.id },
                        data: { value: val }
                    });
                    updatedFacts++;
                }
            } else {
                // We'll create it if it didn't exist but branches have it
                // To keep ingestion simple, we'll borrow the first ingestionId from that date
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

    // 4. Update the Snapshots / Panels
    console.log('Re-generating Panels for RO...');
    const roSnapshots = await prisma.misSnapshot.findMany({
        where: { unitId: ro.id }
    });
    
    // we must populate Panels manually via the service logic
    // But since the service is typescript in the app, we can just call it if we use npx tsx OR just write the TS version.
    console.log(`Need to refresh panels for ${roSnapshots.length} snapshot(s).`);
}

fixRO().catch(console.error).finally(() => prisma.$disconnect());
