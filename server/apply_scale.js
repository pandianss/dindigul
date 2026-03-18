const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BusinessSnapshotService } = require('./src/services/BusinessSnapshotService');

async function applyScale() {
    console.log('--- Universal Historical Data Scale Fix ---');
    const branches = await prisma.branch.findMany({ where: { type: 'Branch' } });
    const branchIds = branches.map(b => b.id);
    
    // --- 1. Facts ---
    const facts17 = await prisma.fact.findMany({
        where: { date: new Date('2026-03-17T00:00:00.000Z'), unitId: { in: branchIds } }
    });
    const benchmark = {};
    for (const f of facts17) {
        if (!benchmark[f.unitId]) benchmark[f.unitId] = {};
        benchmark[f.unitId][f.metric] = Number(f.value);
    }
    
    const factsPre17 = await prisma.fact.findMany({
        where: { date: { lt: new Date('2026-03-17T00:00:00.000Z') }, unitId: { in: branchIds } }
    });
    
    let factsUpdated = 0;
    const skips = ['Branch_PL', 'ProfitLoss', 'NPA', 'CD_Ratio', 'CASA%', 'YIELD_ADVANCES', 'COST_DEPOSITS'];

    for (const f of factsPre17) {
        if (skips.includes(f.metric)) continue;
        
        const val = Number(f.value);
        if (val === 0) continue;
        
        let trueScale = benchmark[f.unitId]?.[f.metric];
        if (!trueScale || trueScale === 0) continue;
        
        const ratio = val / trueScale;
        if (ratio > 10 && ratio < 1000) {
            await prisma.fact.update({ where: { id: f.id }, data: { value: val / 100 } });
            factsUpdated++;
        } else if (ratio < 0.1 && ratio > 0.001) {
            await prisma.fact.update({ where: { id: f.id }, data: { value: val * 100 } });
            factsUpdated++;
        }
    }
    console.log(`Universally fixed ${factsUpdated} Facts into Crores.`);

    // --- 2. Snapshots ---
    const snaps17 = await prisma.snapshot.findMany({
        where: { date: new Date('2026-03-17T00:00:00.000Z'), branchId: { in: branchIds } }
    });
    
    const snapBenchmark = {};
    for (const s of snaps17) {
        if (!snapBenchmark[s.branchId]) snapBenchmark[s.branchId] = {};
        snapBenchmark[s.branchId][s.parameterId] = Number(s.value);
    }
    
    const paramsOptions = await prisma.parameter.findMany();
    const npas = paramsOptions.find(p => p.code === 'GROSS_NPA')?.id;

    const snapsPre17 = await prisma.snapshot.findMany({
        where: { date: { lt: new Date('2026-03-17T00:00:00.000Z') }, branchId: { in: branchIds } }
    });

    let snapsUpdated = 0;
    for (const s of snapsPre17) {
        if (s.parameterId === npas) continue;
        
        const val = Number(s.value);
        if (val === 0) continue;
        
        let trueScale = snapBenchmark[s.branchId]?.[s.parameterId];
        if (!trueScale || trueScale === 0) continue;
        
        const ratio = val / trueScale;
        
        let updateData = {};
        if (ratio > 10 && ratio < 1000) {
            updateData.value = val / 100;
            // Also fix the snapshot budget, since normalize_to_crores touched it or didn't!
            if (s.budget) {
                const budRatio = Number(s.budget) / trueScale;
                if (budRatio > 10 && budRatio < 1000) updateData.budget = Number(s.budget) / 100;
            }
            await prisma.snapshot.update({ where: { id: s.id }, data: updateData });
            snapsUpdated++;
        } else if (ratio < 0.1 && ratio > 0.001) {
            updateData.value = val * 100;
            if (s.budget && Number(s.budget) < trueScale * 0.1) updateData.budget = Number(s.budget) * 100;
            await prisma.snapshot.update({ where: { id: s.id }, data: updateData });
            snapsUpdated++;
        }
    }
    console.log(`Universally fixed ${snapsUpdated} Snapshots into Crores.`);

    // --- 3. Rebuild MisInformationPanels for ALL history ---
    console.log('Rebuilding MisInformationPanels for all recent history...');
    const misSnaps = await prisma.misSnapshot.findMany({
        where: { businessDate: { gte: new Date('2026-02-28T00:00:00.000Z') }, unitId: { in: branchIds } },
        select: { id: true, unitId: true, businessDate: true }
    });

    const uniqueDates = [...new Set(misSnaps.map((s) => s.businessDate.toISOString()))];
    for (const d of uniqueDates) {
        const dsSnaps = misSnaps.filter((s) => s.businessDate.toISOString() === d).map(s => ({ id: s.id, unitId: s.unitId }));
        await prisma.$transaction(async (tx) => {
            await BusinessSnapshotService.populatePanelsBatch(tx, dsSnaps, new Date(d));
        }, { timeout: 120000 });
    }
    console.log('MisInformationPanels completely rebuilt across scale.');
    console.log('Done!');
}
applyScale().catch(console.error).finally(() => prisma.$disconnect());
