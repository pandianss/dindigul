import { PrismaClient } from '@prisma/client';
import { BusinessSnapshotService } from './src/services/BusinessSnapshotService';

const prisma = new PrismaClient();

async function repopulate() {
    console.log('--- Repopulating Panels for SOL 3933 ---');
    
    const branch = await prisma.branch.findUnique({ where: { code: '3933' } });
    if (!branch) {
        console.log('Branch 3933 not found');
        return;
    }

    // Find all snapshots for this unit
    const snapshots = await prisma.misSnapshot.findMany({
        where: { unitId: branch.id }
    });

    console.log(`Found ${snapshots.length} snapshots to re-populate.`);

    // Group snapshots by date to call populatePanelsBatch efficiently if needed, 
    // or just call it for each uniquely. 
    // Actually, populatePanelsBatch takes an array of snapshots for a single date.
    const dateGroups: Record<string, { id: string, unitId: string }[]> = {};
    for (const s of snapshots) {
        const dk = s.businessDate.toISOString();
        if (!dateGroups[dk]) dateGroups[dk] = [];
        dateGroups[dk].push({ id: s.id, unitId: s.unitId });
    }

    await prisma.$transaction(async (tx) => {
        for (const [dateStr, snaps] of Object.entries(dateGroups)) {
            const date = new Date(dateStr);
            console.log(`Repopulating date: ${dateStr}`);
            await BusinessSnapshotService.populatePanelsBatch(tx, snaps, date);
        }
    }, { timeout: 30000 });

    console.log('Repopulation complete.');
    await prisma.$disconnect();
}

repopulate().catch(console.error);
