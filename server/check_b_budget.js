const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBranchBudget() {
    const bBudgets = await prisma.budgetMaster.findMany({
        where: { solId: { not: '3933' } },
        take: 10
    });
    console.table(bBudgets.map(b => ({
        sol: b.solId,
        param: b.parameterName,
        target: b.targetValue.toString(),
        period: b.periodKey
    })));
}

checkBranchBudget().catch(console.error).finally(() => prisma.$disconnect());
