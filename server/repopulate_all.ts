import { PrismaClient } from '@prisma/client';
import { BusinessSnapshotService } from './src/services/BusinessSnapshotService';

const prisma = new PrismaClient();

async function fullRepopulate() {
    console.log('--- Full Re-population of Snapshot Panels ---');
    
    // Find all unique snapshot dates and their associated snapshots
    const snapshots = await prisma.misSnapshot.findMany({
        include: { branch: true }
    });

    console.log(`Found ${snapshots.length} total snapshots in the system.`);

    const dateGroups: Record<string, { id: string, unitId: string }[]> = {};
    for (const s of snapshots) {
        const dk = s.businessDate.toISOString();
        if (!dateGroups[dk]) dateGroups[dk] = [];
        dateGroups[dk].push({ id: s.id, unitId: s.unitId });
    }

    // Process each date group
    for (const [dateStr, snaps] of Object.entries(dateGroups)) {
        const date = new Date(dateStr);
        console.log(`Processing date: ${dateStr} (${snaps.length} units)...`);
        
        // Process in smaller batches within the group if it's very large
        const batchSize = 50;
        for (let i = 0; i < snaps.length; i += batchSize) {
            const batch = snaps.slice(i, i + batchSize);
            await prisma.$transaction(async (tx) => {
                await BusinessSnapshotService.populatePanelsBatch(tx, batch, date);
            }, { timeout: 30000 });
        }
    }

    console.log('Global repopulation complete.');
    await prisma.$disconnect();
}

fullRepopulate().catch(console.error);
