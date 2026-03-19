const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBudget() {
    const roBudgets = await prisma.budgetMaster.findMany({
        where: { solId: '3933' },
        take: 10
    });
    console.table(roBudgets.map(b => ({
        param: b.parameterName,
        target: b.targetValue.toString(),
        period: b.periodKey
    })));
}

checkBudget().catch(console.error).finally(() => prisma.$disconnect());
