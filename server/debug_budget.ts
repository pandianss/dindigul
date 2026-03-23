import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debugBudget() {
    const utcDate = new Date();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const getPeriodKey = (d: Date) => `${months[d.getUTCMonth()]}-${d.getUTCFullYear().toString().slice(-2)}`;
    const currMonthKey = getPeriodKey(utcDate);
    
    console.log('Current UTC Date:', utcDate.toISOString());
    console.log('Current Month Key:', currMonthKey);

    const sampleBudgets = await prisma.budgetMaster.findMany({
        take: 10,
        where: { isActive: true }
    });
    console.log('Sample Budgets in DB:', JSON.stringify(sampleBudgets, null, 2));

    const distinctKeys = await prisma.budgetMaster.findMany({
        select: { periodKey: true },
        distinct: ['periodKey']
    });
    console.log('Distinct Period Keys in DB:', JSON.stringify(distinctKeys, null, 2));

    await prisma.$disconnect();
}
debugBudget();
