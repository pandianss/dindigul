import { BusinessSnapshotService } from '../services/BusinessSnapshotService';
import prisma from '../lib/prisma';

async function main() {
    const dateArg = process.argv[2];
    if (!dateArg) {
        console.error('Usage: npx ts-node fix_ratio_data.ts YYYY-MM-DD');
        process.exit(1);
    }

    const [y, m, d] = dateArg.split('-').map(Number);
    const businessDate = new Date(Date.UTC(y, m - 1, d));

    console.log(`Fixing snapshots for ${businessDate.toISOString().split('T')[0]}...`);

    const snapshots = await prisma.misSnapshot.findMany({
        where: { businessDate }
    });

    for (const snap of snapshots) {
        process.stdout.write(`Processing unit ${snap.unitId}... `);
        await prisma.$transaction(async (tx) => {
            await (BusinessSnapshotService as any).populatePanelInternal(tx, snap.id, snap.unitId, businessDate);
        });
        console.log('Done.');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
