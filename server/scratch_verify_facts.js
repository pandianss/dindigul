const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const date = new Date('2026-04-15T00:00:00Z');
    console.log('Checking facts for date:', date.toISOString());
    
    const facts = await prisma.fact.findMany({
        where: {
            date: {
                gte: new Date('2026-04-15T00:00:00Z'),
                lt: new Date('2026-04-16T00:00:00Z')
            }
        },
        include: { branch: { select: { code: true, nameEn: true } } }
    });

    console.log('Total facts found:', facts.length);
    
    const metricsOfInterest = ['ADV', 'GOLD', 'RET_TD', 'TOTAL_ADVANCES'];
    const filtered = facts.filter(f => metricsOfInterest.includes(f.metric));
    
    console.log('Metrics of interest found:', filtered.length);
    filtered.forEach(f => {
        console.log(`[${f.branch.code}] ${f.metric}: ${f.value}`);
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
