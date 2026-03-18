import { PrismaClient } from '@prisma/client';
import { BusinessSnapshotService } from '../services/BusinessSnapshotService';
import { RuleEngine } from '../services/RuleEngine';

const prisma = new PrismaClient();

async function restoreBranchFacts() {
    console.log('--- Restoring Branch Facts and Exceptions ---');

    // 1. Identify affected Facts. 
    // They are < 150 because normalize_to_crores.js divided the >150 values by 100.
    // However, native branch data (Lakhs) normalized properly by the ingestion script would natively be in Crores.
    // For smaller branches, 150 Crores is huge. A lot of branches got divided when they were > 150 Crores.
    // Wait, let's just find exactly what got damaged.
    // The safest way is to multiply facts by 100 IF they are for dates BEFORE 17-03-2026 AND they were altered by normalize_to_crores.js?
    // How do we know what was altered? 
    // Any fact prior to 17-03-2026 that had a value which doesn't make sense compared to 17-03-2026!
    
    // Instead of complex heuristics, let's just use the known cutoff:
    // normalize_to_crores.js updated facts WHERE gt > 150 on some previous day.
    // So today they are < 150, but yesterday they were > 150.
    // The easiest way to fix this is to query all branches, look at 17-03-2026 facts.
    // For any parameter that is > 100 on 17-03-2026, check its value on prior dates.
    // If the prior date value is roughly 100x smaller, then it was Garbled by the normalizer! Multiply it by 100!

    const targetDateStr = '2026-03-17T00:00:00.000Z';
    const targetDate = new Date(targetDateStr);

    const branches = await prisma.branch.findMany({ where: { type: { not: 'REGIONAL OFFICE' } } });
    
    let restoredCount = 0;

    for (const branch of branches) {
        // Get correct facts on 17-03-2026
        const latestFacts = await prisma.fact.findMany({
            where: { unitId: branch.id, date: targetDate }
        });

        // Find parameters that are large enough to have been affected (> 1.5 because 150/100 = 1.5)
        const affectedParams = latestFacts.filter((f: any) => Number(f.value) > 1.0).map((f: any) => f.metric);
        if (affectedParams.length === 0) continue;

        // Get all historical facts for these parameters
        const oldFacts = await prisma.fact.findMany({
            where: { unitId: branch.id, metric: { in: affectedParams }, date: { lt: targetDate } }
        });

        for (const old of oldFacts) {
            const latestFact = latestFacts.find((f: any) => f.metric === old.metric);
            if (!latestFact) continue;

            const latestVal = Number(latestFact.value);
            const oldVal = Number(old.value);

            // If oldVal is less than 0.05 * latestVal, it's highly likely it was divided by 100!
            if (oldVal > 0 && oldVal < latestVal * 0.05) {
                // To be extremely certain it's the `100` factor:
                // Check if oldVal * 100 is close to latestVal
                const restoredVal = oldVal * 100;
                // If it's within 25% of the latest value, it's a solid hit
                if (restoredVal > latestVal * 0.75 && restoredVal < latestVal * 1.25) {
                    await prisma.fact.update({
                        where: { id: old.id },
                        data: { value: restoredVal }
                    });
                    restoredCount++;
                } else if (restoredVal > latestVal * 0.5 && restoredVal < latestVal * 1.5) {
                    // slightly looser boundary for volatile parameters like CASA
                    await prisma.fact.update({
                        where: { id: old.id },
                        data: { value: restoredVal }
                    });
                    restoredCount++;
                }
            }
        }
    }

    console.log(`Restored ${restoredCount} Fact records across all branches.`);

    // Rebuild the snapshots to clear the garbage Growth% and generate true misExceptions
    console.log('Rebuilding Panels and Evaluating Rules for ALL recent snapshots...');
    
    const snapshotsToFix = await prisma.misSnapshot.findMany({
        where: { businessDate: { gte: new Date('2026-02-28T00:00:00.000Z') } },
        select: { id: true, unitId: true, businessDate: true }
    });

    const uniqueDates = [...new Set(snapshotsToFix.map((s: any) => s.businessDate.toISOString()))];
    
    for (const d of uniqueDates) {
        const snaps = snapshotsToFix.filter((s: any) => s.businessDate.toISOString() === d);
        const mappedSnaps = snaps.map((s: any) => ({ id: s.id, unitId: s.unitId }));
        
        await prisma.$transaction(async (tx: any) => {
            await BusinessSnapshotService.populatePanelsBatch(tx, mappedSnaps, new Date(d));
        }, { timeout: 120000 });
        
        await RuleEngine.evaluateBatch(mappedSnaps.map((s: any) => s.id));
    }

    console.log(`Complete. Evaluated ${snapshotsToFix.length} snapshots across ${uniqueDates.length} days.`);
}

restoreBranchFacts().catch(console.error).finally(() => prisma.$disconnect());
