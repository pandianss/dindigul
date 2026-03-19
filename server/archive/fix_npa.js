const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BusinessSnapshotService } = require('./src/services/BusinessSnapshotService');

async function fixNPA() {
    console.log('--- Universally Fixing NPA to exact Crores ---');
    const branches = await prisma.branch.findMany({ where: { type: 'Branch' } });
    const branchIds = branches.map(b => b.id);

    // 1. Divide NPA Facts by 100
    const facts = await prisma.fact.findMany({
        where: { metric: 'NPA', unitId: { in: branchIds } }
    });
    
    let updatedFacts = 0;
    for (const f of facts) {
        // Since all NPA values for branches right now are basically in Lakhs (either manually blown up or originally uncoverted)
        // We know for a fact that normal branch NPA shouldn't be > 10 Crores (averages 0.1 to 2 Crores).
        if (Number(f.value) > 10) {
            await prisma.fact.update({ where: { id: f.id }, data: { value: Number(f.value) / 100 } });
            updatedFacts++;
        }
    }
    console.log(`Divided ${updatedFacts} NPA facts by 100.`);

    // 2. Divide NPA Snapshots by 100
    const param = await prisma.parameter.findUnique({ where: { code: 'GROSS_NPA' } });
    if (param) {
        const snaps = await prisma.snapshot.findMany({
            where: { parameterId: param.id, branchId: { in: branchIds } }
        });
        
        let updatedSnaps = 0;
        for (const s of snaps) {
            if (Number(s.value) > 10) {
                let updateData = { value: Number(s.value) / 100 };
                if (s.budget && Number(s.budget) > 10) updateData.budget = Number(s.budget) / 100;
                await prisma.snapshot.update({ where: { id: s.id }, data: updateData });
                updatedSnaps++;
            }
        }
        console.log(`Divided ${updatedSnaps} NPA snapshots by 100.`);
    }

    // 3. Rebuild MisInformationPanels for recent dates
    console.log('Rebuilding MisInformation Panels...');
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
    
    console.log('Done.');
}
fixNPA().catch(console.error).finally(() => prisma.$disconnect());
