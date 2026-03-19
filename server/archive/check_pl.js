const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPL() {
    const facts = await prisma.fact.findMany({
        where: { metric: { in: ['ProfitLoss', 'Branch_PL'] } },
        take: 5
    });
    console.table(facts.map(f => ({ date: f.date, metric: f.metric, value: f.value })));
    
    // Check panel
    const panels = await prisma.misInformationPanel.findMany({
        where: { parameter: { in: ['ProfitLoss', 'Branch_PL'] } },
        take: 5
    });
    console.table(panels.map(p => ({ parameter: p.parameter, current: p.val_current, prev: p.val_y_eod })));
}

checkPL().catch(console.error).finally(() => prisma.$disconnect());
