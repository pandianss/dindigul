const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRO() {
    const branch = await prisma.branch.findUnique({ where: { code: '3933' } });
    const facts = await prisma.fact.findMany({
        where: { unitId: branch.id, date: new Date('2026-03-17T00:00:00.000Z') }
    });
    console.table(facts.filter(f => ['Total Dep', 'Adv', 'Bus', 'NPA', 'Branch_PL', 'CASA', 'CD_Ratio'].includes(f.metric)).map(f => ({
        metric: f.metric,
        value: f.value
    })));
}

checkRO().catch(console.error).finally(() => prisma.$disconnect());
