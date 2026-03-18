import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
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
    } else {
        console.log("No op risk letters found.");
    }
}
check().catch(console.error).finally(() => prisma.$disconnect());
