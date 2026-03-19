import { PrismaClient } from '@prisma/client';
import { BusinessSnapshotService } from '../services/BusinessSnapshotService';

const prisma = new PrismaClient();

async function main() {
    const targetDate = '2026-03-09';
    console.log(`Regenerating snapshots for ${targetDate}...`);
    try {
        const result = await BusinessSnapshotService.generateFromStaging(targetDate);
        console.log('Success:', result);
    } catch(err) {
        console.error('Error:', err);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
