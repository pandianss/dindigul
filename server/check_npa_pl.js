const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkIssues() {
    const branchId = '62594348-3833-411b-8fed-81b2245d29c2';
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    console.log("Branch:", branch.nameEn, branch.code);

    const facts = await prisma.fact.findMany({
        where: { 
            unitId: branchId,
            metric: { in: ['NPA', 'Branch_PL'] },
            date: { gte: new Date('2026-03-15T00:00:00Z') }
        },
        orderBy: { date: 'desc' }
    });

    console.table(facts.map(f => ({
        date: f.date.toISOString().split('T')[0],
        metric: f.metric,
        value: f.value
    })));
}
checkIssues().catch(console.error).finally(() => prisma.$disconnect());
