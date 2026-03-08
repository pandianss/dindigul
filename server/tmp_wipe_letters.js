const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wipeLetters() {
    console.log('--- Wiping All Letters ---');
    try {
        const result = await prisma.letter.deleteMany({});
        console.log(`SUCCESS: Deleted ${result.count} letters.`);
    } catch (error) {
        console.error('Wipe failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

wipeLetters();
