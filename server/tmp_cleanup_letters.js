const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicates() {
    console.log('--- Cleaning up Duplicate Letters ---');
    try {
        const letters = await prisma.letter.findMany({
            orderBy: { createdAt: 'asc' }
        });

        const seenMap = new Map();
        const duplicateIds = [];

        for (const letter of letters) {
            const key = `${letter.branchId}-${letter.period}-${letter.type}`;
            if (seenMap.has(key)) {
                duplicateIds.push(letter.id);
            } else {
                seenMap.set(key, true);
            }
        }

        console.log(`Found ${duplicateIds.length} duplicate letters targeting the same branch, period, and type.`);

        if (duplicateIds.length > 0) {
            const result = await prisma.letter.deleteMany({
                where: { id: { in: duplicateIds } }
            });
            console.log(`SUCCESS: Deleted ${result.count} duplicate letters.`);
        } else {
            console.log('No duplicates found. Database is already clean.');
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupDuplicates();
