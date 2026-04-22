const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const code = '3933'; // Regional Office or specific branch? Let's check all metrics for a few branches.
    const date = new Date('2026-04-15T00:00:00.000Z');
    
    console.log('Checking all facts for date:', date.toISOString());
    
    const facts = await prisma.fact.findMany({
        where: {
            date: {
                gte: new Date('2026-04-14T00:00:00Z'),
                lte: new Date('2026-04-16T00:00:00Z')
            }
        },
        include: { branch: { select: { code: true } } },
        orderBy: { date: 'asc' }
    });

    console.log('Total facts in range:', facts.length);
    
    const branchFacts = {};
    facts.forEach(f => {
        if (!branchFacts[f.branch.code]) branchFacts[f.branch.code] = [];
        branchFacts[f.branch.code].push({ metric: f.metric, value: f.value, date: f.date.toISOString() });
    });

    for (const bCode of Object.keys(branchFacts)) {
        console.log(`\nBranch: ${bCode}`);
        const advLike = branchFacts[bCode].filter(f => /ADV|ADVANCE/i.test(f.metric));
        const goldLike = branchFacts[bCode].filter(f => /GOLD/i.test(f.metric));
        console.log('  Adv metrics:', advLike);
        console.log('  Gold metrics:', goldLike);
    }
}

check().catch(console.error).finally(() => prisma.$disconnect());
