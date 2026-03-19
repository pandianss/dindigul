import { generateLettersForPeriod } from './src/services/letterCriteriaService';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testGen() {
    console.log("Generating Op Risk letters...");
    const res = await generateLettersForPeriod('17.03.2026', { date: '2026-03-17', type: 'OP_RISK' });
    console.log("Finished generating:", res);
    
    const letters = await prisma.letter.findMany({
        where: { type: 'OP_RISK' },
        orderBy: { createdAt: 'desc' },
        take: 1
    });

    if (letters.length > 0) {
        const l = letters[0];
        console.log("Branch:", l.branchId);
        
        const orgMeta = l.orgMeta as any;
        console.log("Movements:");
        console.table(orgMeta.dailyMovement);
    }
}
testGen().catch(console.error).finally(() => prisma.$disconnect());
