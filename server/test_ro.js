const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const branches = await prisma.branch.findMany({ where: { type: 'REGIONAL OFFICE' } });
    if (!branches.length) {
        console.log('No RO found');
        return;
    }
    const ro = branches[0];
    console.log(`Checking RO: ${ro.nameEn} (${ro.code})`);

    const latestSnap = await prisma.misSnapshot.findFirst({
        where: { unitId: ro.id },
        orderBy: { businessDate: 'desc' },
        include: {
            panelData: {
                where: { parameter: { in: ['Total Dep', 'Adv', 'Bus'] } }
            }
        }
    });

    if (latestSnap) {
        console.log(`Latest RO Snapshot Date: ${latestSnap.businessDate}`);
        console.log('Panel Data:');
        console.table(latestSnap.panelData.map(p => ({
            param: p.parameter,
            current: p.val_current.toString(),
            budget: p.budget_month.toString(),
            yesterday: p.val_y_eod.toString(),
            prevMonthEnd: p.val_prev_m_end.toString()
        })));
    } else {
        console.log('No snapshot found for RO.');
    }

    const latestFacts = await prisma.fact.findMany({
        where: { unitId: ro.id, metric: { in: ['Total Dep', 'Adv', 'Bus'] } },
        orderBy: { date: 'desc' },
        take: 10
    });
    
    console.log('\nRecent Facts:');
    console.table(latestFacts.map(f => ({
        metric: f.metric,
        value: f.value.toString(),
        date: f.date
    })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
