const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { BusinessSnapshotService } = require('./src/services/BusinessSnapshotService');

async function fixPL() {
    console.log('Fixing ProfitLoss fact metrics...');
    const result = await prisma.fact.updateMany({
        where: { metric: 'ProfitLoss' },
        data: { metric: 'Branch_PL' }
    });
    console.log(`Updated ${result.count} facts.`);

    console.log('Rebuilding PL panels...');
    // Find unique snapshots
    const snapshotsToFix = await prisma.misSnapshot.findMany({
        where: { businessDate: { gte: new Date('2026-03-01T00:00:00.000Z') } },
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
    console.log('Restored P&L data for all panels.');
}

fixPL().catch(console.error).finally(() => prisma.$disconnect());
