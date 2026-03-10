import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const dateStr = '2026-03-09';
    const [y, m, d] = dateStr.split('-').map(Number);
    const businessDate = new Date(Date.UTC(y, m - 1, d));

    console.log(`Checking database for Date: ${businessDate.toISOString()}`);

    const snapshots = await prisma.misSnapshot.findMany({
        where: { businessDate },
        select: { id: true, unitId: true }
    });
    console.log(`MIS Snapshots: ${snapshots.length}`);

    if (snapshots.length > 0) {
        const snapshotIds = snapshots.map(s => s.id);
        const panelCount = await prisma.misInformationPanel.count({
            where: { snapshotId: { in: snapshotIds } }
        });
        console.log(`Total Panel Data Records: ${panelCount}`);

        const firstSnap = snapshots[0];
        const firstSnapPanel = await prisma.misInformationPanel.count({
            where: { snapshotId: firstSnap.id }
        });
        console.log(`Panel Data for Snapshot ${firstSnap.id}: ${firstSnapPanel}`);
    }

    const facts = await prisma.fact.count({
        where: { date: businessDate }
    });
    console.log(`Facts: ${facts}`);

    const importLogs = await prisma.misImportLog.findMany({
        where: {
            uniqueDates: {
                has: dateStr
            }
        }
    });
    console.log(`Import Logs matching date: ${importLogs.length}`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
