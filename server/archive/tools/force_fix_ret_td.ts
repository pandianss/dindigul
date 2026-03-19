import prisma from '../lib/prisma';

async function main() {
    console.log('--- Force Fixing Ret TD (All Columns) ---');

    // Find latest snapshots
    const latestSnapshot = await prisma.misSnapshot.findFirst({
        orderBy: { businessDate: 'desc' }
    });

    if (!latestSnapshot) return;
    const date = latestSnapshot.businessDate;

    const snapshots = await prisma.misSnapshot.findMany({
        where: { businessDate: date }
    });

    const columns = [
        'val_current', 'val_y_eod', 'val_dby', 'val_prev_m_end',
        'val_fy_start', 'val_prev_fy_start', 'val_prev_fy_end'
    ];

    for (const snap of snapshots) {
        const retTdRow = await prisma.misInformationPanel.findFirst({
            where: { snapshotId: snap.id, parameter: 'Ret_TD' }
        });

        if (retTdRow) {
            const updateData: any = {};

            for (const col of columns) {
                const tdRow = await prisma.misInformationPanel.findFirst({
                    where: { snapshotId: snap.id, parameter: 'TD' }
                });
                const bulkRow = await prisma.misInformationPanel.findFirst({
                    where: { snapshotId: snap.id, parameter: 'Bulk_Dep' }
                });

                const tdVal = Number(tdRow?.[col as keyof typeof tdRow] || 0);
                const bulkVal = Number(bulkRow?.[col as keyof typeof bulkRow] || 0);
                updateData[col] = tdVal - bulkVal;
            }

            console.log(`Unit ${snap.unitId}: Updated Ret_TD columns`);

            await prisma.misInformationPanel.update({
                where: { id: retTdRow.id },
                data: updateData
            });
        }
    }
    console.log('Update finished.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
