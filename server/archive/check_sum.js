const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSum() {
    const targetDate = new Date('2026-03-17T00:00:00Z');
    
    // Get RO branch
    const ro = await prisma.branch.findUnique({ where: { code: '3933' } });
    if (!ro) return;

    const roFacts = await prisma.fact.findMany({
        where: { unitId: ro.id, date: targetDate, metric: { in: ['Total Dep', 'Adv', 'Bus', 'NPA'] } }
    });

    const otherFacts = await prisma.fact.groupBy({
        by: ['metric'],
        where: {
            unitId: { not: ro.id },
            date: targetDate,
            metric: { in: ['Total Dep', 'Adv', 'Bus', 'NPA'] }
        },
        _sum: { value: true }
    });

    console.log('--- Comparison for 2026-03-17 ---');
    for (const rof of roFacts) {
        const sum = otherFacts.find(f => f.metric === rof.metric)?._sum?.value || 0;
        console.log(`Metric: ${rof.metric} | RO stored: ${rof.value} | Branches sum: ${sum}`);
    }
}

checkSum().catch(console.error).finally(() => prisma.$disconnect());
