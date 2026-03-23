import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function cleanup() {
    console.log('--- Cleaning up Existing Budgets ---');

    const branches = await prisma.branch.findMany({
        where: {
            NOT: {
                OR: [
                    { type: { in: ['RO', 'LPC', 'REGIONAL OFFICE'] } },
                    { code: '3933' }
                ]
            }
        },
        select: { code: true }
    });

    const branchCodes = branches.map(b => b.code);
    console.log(`Found ${branchCodes.length} branches for budget cleanup.`);

    // Threshold: 150 (if targetValue > 150, it is definitely in Lakhs and needs to be Crore-normalized)
    const threshold = 150;

    const budgetsToUpdate = await prisma.budgetMaster.findMany({
        where: {
            solId: { in: branchCodes },
            isActive: true,
            targetValue: { gt: threshold }
        }
    });

    console.log(`Found ${budgetsToUpdate.length} budget records to normalize.`);

    for (const b of budgetsToUpdate) {
        // Use direct update to avoid Decimal precision issues in batch if possible, or just updateMany
        await prisma.budgetMaster.update({
            where: { id: b.id },
            data: { targetValue: Number(b.targetValue) / 100 }
        });
    }

    console.log('Cleanup complete.');
    await prisma.$disconnect();
}

cleanup().catch(console.error);
