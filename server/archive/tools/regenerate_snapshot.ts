import { PrismaClient } from '@prisma/client';
import { BusinessSnapshotService } from '../../src/services/BusinessSnapshotService';

const prisma = new PrismaClient();

async function main() {
    const targetDates = ['2024-03-31', '2025-03-31', '2026-02-28', '2026-03-16', '2026-03-17', '2026-03-31'];
    for (const date of targetDates) {
        console.log(`Regenerating snapshots for ${date}...`);
        try {
            const result = await BusinessSnapshotService.generateFromStaging(date);
            console.log(`Success for ${date}:`, result);
        } catch(err) {
            console.error(`Error for ${date}:`, err);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
