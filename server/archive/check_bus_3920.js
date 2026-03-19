const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBus3920() {
    const facts = await prisma.fact.findMany({
        where: { 
            branch: { code: '3920' },
            metric: { in: ['Bus', 'Total Dep', 'Adv', 'CD'] }
        },
        orderBy: { date: 'desc' },
        take: 20
    });

    console.table(facts.map(f => ({
        date: f.date.toISOString().split('T')[0],
        metric: f.metric,
        value: f.value.toString()
    })));
}

checkBus3920().catch(console.error).finally(() => prisma.$disconnect());
