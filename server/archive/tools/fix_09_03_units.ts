import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const targetDateStr = '2026-03-09';
    const [y, m, d] = targetDateStr.split('-').map(Number);
    const targetDate = new Date(Date.UTC(y, m - 1, d));

    console.log(`--- Fixing Units for ${targetDateStr} ---`);

    // 1. Multiply Facts by 100 for all branches EXCEPT 3933 (RO)
    // Actually, RO (3933) for 09.03.26 was likely kept as is (Crores) 
    // but the new logic says RO should be multiplied by 100.
    // Let's check what happened in the previous ingestion:
    // "SOL 3933 (Regional Office) is already in Crores -> Keep as is"
    // So for 09.03.26, RO is in Crores, it needs to be Lakhs (x100).
    // Branches were divided by 100, they need to be Lakhs (x100).
    // CONCLUSION: ALL metrics for 09.03.26 need to be multiplied by 100.
    // (Except CASA% and CD_Ratio which are percentages)

    const facts = await prisma.fact.findMany({
        where: { 
            date: targetDate,
            NOT: {
                metric: { in: ['CASA%', 'CD_Ratio'] }
            }
        }
    });

    console.log(`Found ${facts.length} facts to fix.`);

    let count = 0;
    for (const fact of facts) {
        await prisma.fact.update({
            where: { id: fact.id },
            data: { value: Number(fact.value) * 100 }
        });
        count++;
        if (count % 100 === 0) console.log(`Updated ${count} facts...`);
    }

    console.log(`Successfully updated ${count} facts.`);

    // 2. Clear panels so they get repopulated with correct values next time they are accessed or regenerated
    // Actually, snapshots for 09.03.26 should be deleted or panels cleared.
    // BusinessSnapshotService.populatePanelInternal reads from Fact.
    // If we delete the Panel Data, and the user visits the page, it might not auto-regenerate 
    // unless we trigger it. Better to just delete the snapshots for 09.03.26 
    // and let the user click "Generate New".
    
    // Alternatively, let's just delete the panel data for that date.
    const snapshots = await prisma.misSnapshot.findMany({
        where: { businessDate: targetDate }
    });
    
    for (const snap of snapshots) {
        await prisma.misInformationPanel.deleteMany({
            where: { snapshotId: snap.id }
        });
        console.log(`Cleared panel data for snapshot ${snap.id} (Unit ${snap.unitId})`);
    }
    
    console.log('Done. Users should click "Generate New" for 09.03.26 to see updated data in Lakhs.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
