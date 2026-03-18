import { PrismaClient } from '@prisma/client';
import { BusinessSnapshotService } from '../services/BusinessSnapshotService';
import { RuleEngine } from '../services/RuleEngine';

const prisma = new PrismaClient();

async function ultimateRestore() {
    console.log('--- Ultimate Fact Restoration ---');

    const branches = await prisma.branch.findMany({ where: { type: { not: 'REGIONAL OFFICE' } } });
    const bMap = Object.fromEntries(branches.map(b => [b.id, b]));

    const date17 = new Date('2026-03-17T00:00:00.000Z');
    let fixCount17 = 0;

    // --- FIX 1: Multiply ALL 17.03.2026 native Crores uploads by 100 because MISIngestionService incorrectly divided them ---
    const facts17 = await prisma.fact.findMany({
        where: { date: date17, unitId: { in: branches.map(b => b.id) } }
    });
    for (const f of facts17) {
        if (f.metric === 'CD_Ratio' || f.metric === 'CASA%') continue; // ratios weren't divided, they were recalculated correctly but from divided bases, so they didn't shrink by 100
        await prisma.fact.update({ where: { id: f.id }, data: { value: Number(f.value) * 100 } });
        fixCount17++;
    }
    console.log(`Restored ${fixCount17} facts for 17.03.2026 back up by 100x because they were uploaded in Crores but ingested with /100.`);

    // --- FIX 2: Find all dates before 17.03.2026 where a branch's large parameters were smashed by normalize_to_crores.js ---
    // Specifically, any parameter on 16.03 that is now exactly ~100x smaller than 17.03 (after fixing 17.03!).
    const factsHistorical = await prisma.fact.findMany({
        where: { date: { lt: date17 }, unitId: { in: branches.map(b => b.id) } }
    });

    let fixCountHist = 0;

    for (const hist of factsHistorical) {
        if (hist.metric === 'CD_Ratio' || hist.metric === 'CASA%') continue;
        
        // Find corresponding 17.03 fact to compare against
        const f17 = facts17.find(f => f.metric === hist.metric && f.unitId === hist.unitId);
        if (!f17) continue;

        const val17Proper = Number(f17.value) * 100; // what it is NOW after Fix 1
        const histVal = Number(hist.value);

        // If the historical value is ~100x smaller than the proper 17.03 value...
        if (histVal > 0 && histVal < val17Proper * 0.05) {
            const restoredVal = histVal * 100;
            // Validate if restoring putting it in the ballpark of the correct 17.03 value
            if (restoredVal > val17Proper * 0.5 && restoredVal < val17Proper * 1.5) {
                await prisma.fact.update({ where: { id: hist.id }, data: { value: restoredVal } });
                fixCountHist++;
            }
        }
    }
    console.log(`Restored ${fixCountHist} historical facts that were divided by normalize_to_crores.js.`);

    console.log('Rebuilding Panels and Evaluating Rules for ALL recent snapshots...');
    
    const snapshotsToFix = await prisma.misSnapshot.findMany({
        where: { businessDate: { gte: new Date('2026-02-28T00:00:00.000Z') }, unitId: { in: branches.map(b => b.id) } },
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

ultimateRestore().catch(console.error).finally(() => prisma.$disconnect());
