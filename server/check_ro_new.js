const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRO() {
    const panels = await prisma.misInformationPanel.findMany({
        where: { snapshot: { unitId: '809d4cbd-3932-475f-accb-873defa9bb19', businessDate: new Date('2026-03-17T00:00:00.000Z') } },
        take: 10
    });
    console.table(panels.map(p => ({
        param: p.parameter,
        curr: p.val_current,
        prev: p.val_y_eod,
        budget: p.budget_month
    })));
}

checkRO().catch(console.error).finally(() => prisma.$disconnect());
