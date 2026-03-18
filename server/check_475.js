const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEx() {
    const exs = await prisma.misException.findMany({
        where: { businessDate: new Date('2026-03-17T00:00:00.000Z') },
        include: { branch: true }
    });
    
    const byType = exs.reduce((acc, e) => {
        const key = `${e.type}_${e.severity}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    
    console.log("Exception Breakdown:");
    console.table(byType);

    const risks = exs.filter(e => e.type === 'RISK' && e.severity === 'CRITICAL');
    console.log(`\nFound ${risks.length} CRITICAL RISK (+/- 10% daily swing) exceptions.`);
    
    if (risks.length > 0) {
        console.table(risks.slice(0, 10).map(e => ({
            branch: e.branch.nameEn,
            param: e.parameter,
            msg: e.message
        })));
    }
}

checkEx().catch(console.error).finally(() => prisma.$disconnect());
