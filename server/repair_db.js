const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BusinessSnapshotService, MisParameter } = require('./src/services/BusinessSnapshotService');

async function repairDB() {
    console.log('--- Fixing P&L and NPA Discrepancies ---');
    
    const branches = await prisma.branch.findMany({ where: { type: 'Branch' } });
    const branchIds = branches.map(b => b.id);
    
    // 1. UNDO the ultimate_restore.ts for 17.03
    // We basically undo the *100 that we did for all metrics EXCEPT CD_Ratio and CASA%
    const facts17 = await prisma.fact.findMany({
        where: { date: new Date('2026-03-17T00:00:00.000Z'), unitId: { in: branchIds } }
    });
    
    let undoneCount = 0;
    for (const f of facts17) {
        if (f.metric === 'CD_Ratio' || f.metric === 'CASA%') continue;
        await prisma.fact.update({ where: { id: f.id }, data: { value: Number(f.value) / 100 } });
        undoneCount++;
    }
    console.log(`Undoing: Divided ${undoneCount} facts back down by 100 for 17.03.`);

    // 2. We ALSO need to divide Branch_PL by 100 for ALL DATES (because 165 was stored instead of 1.65)
    const plFacts = await prisma.fact.findMany({
        where: { metric: 'Branch_PL', unitId: { in: branchIds } }
    });
    
    let plCount = 0;
    for (const f of plFacts) {
        // Because 17.03 Branch_PL was just divided by 100 by Step 1 above, we must re-query or calculate properly.
        // Actually, if it was 165 on 17.03, ultimate restore made it 16500. Step 1 made it 165 again.
        // So ALL DATES are currently around `165` and need to be `1.65`
        const v = f.date.toISOString().startsWith('2026-03-17') ? (Number(f.value) / 100) : Number(f.value);
        if (v > 10) { // Safety check to only divide if it's bloated
            await prisma.fact.update({ where: { id: f.id }, data: { value: v / 100 } });
            plCount++;
        }
    }
    console.log(`Divided ${plCount} Branch_PL facts by 100 across all dates.`);

    // 3. Fix NPA on 17.03 - the user manually uploaded it in Crores so it was dividing into 0.28. It must be *100 to get back to 28.4
    // We need to fix Fact AND Snapshot
    const npa17 = await prisma.fact.findMany({
        where: { metric: 'NPA', date: new Date('2026-03-17T00:00:00.000Z'), unitId: { in: branchIds } }
    });
    let npaCount = 0;
    for (const f of npa17) {
        // Step 1 made it 0.2842 again. We multiply by 100 to make it 28.42
        const properNPA = Number(f.value) * 100;
        await prisma.fact.update({ where: { id: f.id }, data: { value: properNPA } });
        npaCount++;
    }
    
    const npaParam = await prisma.parameter.findUnique({ where: { code: 'GROSS_NPA' } });
    if (npaParam) {
        const snapNpa17 = await prisma.snapshot.findMany({
            where: { parameterId: npaParam.id, date: new Date('2026-03-17T00:00:00.000Z'), branchId: { in: branchIds } }
        });
        for (const s of snapNpa17) {
            await prisma.snapshot.update({ where: { id: s.id }, data: { value: Number(s.value) * 100 } });
        }
        console.log(`Multiplied ${snapNpa17.length} NPA Snapshot values by 100 for 17.03.`);
    }

    console.log('Rebuilding Panels for 17.03 and 16.03...');
    const snapshotsToFix = await prisma.misSnapshot.findMany({
        where: { businessDate: { gte: new Date('2026-03-16T00:00:00.000Z') }, unitId: { in: branchIds } },
        select: { id: true, unitId: true, businessDate: true }
    });

    const uniqueDates = [...new Set(snapshotsToFix.map((s) => s.businessDate.toISOString()))];
    for (const d of uniqueDates) {
        const snaps = snapshotsToFix.filter((s) => s.businessDate.toISOString() === d);
        const mappedSnaps = snaps.map((s) => ({ id: s.id, unitId: s.unitId }));
        
        await prisma.$transaction(async (tx) => {
            await BusinessSnapshotService.populatePanelsBatch(tx, mappedSnaps, new Date(d));
        }, { timeout: 120000 });
    }
    console.log('Restoration complete.');
}

repairDB().catch(console.error).finally(() => prisma.$disconnect());
