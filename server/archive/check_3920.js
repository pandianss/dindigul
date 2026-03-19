const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check3920() {
    const branch = await prisma.branch.findUnique({ where: { code: '3920' } });
    if (!branch) {
        console.log("Branch 3920 not found");
        return;
    }
    console.log(`Branch: ${branch.nameEn}`);

    const facts = await prisma.fact.findMany({
        where: { unitId: branch.id, metric: { in: ['CD', 'TD', 'Ret_TD', 'CD_Ratio'] } },
        orderBy: { date: 'desc' },
        take: 20
    });

    console.table(facts.map(f => ({
        date: f.date.toISOString().split('T')[0],
        metric: f.metric,
        value: f.value.toString()
    })));

    const panels = await prisma.misInformationPanel.findMany({
        where: { 
            snapshot: { unitId: branch.id },
            parameter: { in: ['CD', 'TD', 'Ret_TD', 'CD_Ratio'] }
        },
        include: { snapshot: true },
        orderBy: { snapshot: { businessDate: 'desc' } },
        take: 20
    });

    console.log("Panels:");
    console.table(panels.map(p => ({
        date: p.snapshot.businessDate.toISOString().split('T')[0],
        param: p.parameter,
        current: p.val_current?.toString(),
        prevDay: p.val_y_eod?.toString(),
        growthDay: p.growth_day?.toString()
    })));
}

check3920().catch(console.error).finally(() => prisma.$disconnect());
