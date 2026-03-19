const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const facts = await prisma.fact.findMany({
        where: { metric: 'Total Dep', unitId: '62594348-3833-411b-8fed-81b2245d29c2' }, // Ambilikai
        orderBy: { date: 'desc' },
        take: 5
    });
    console.table(facts.map(f => ({
        date: f.date.toISOString().split('T')[0],
        value: f.value
    })));
}
check().catch(console.error).finally(() => prisma.$disconnect());
