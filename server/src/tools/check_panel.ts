import prisma from '../lib/prisma';

async function main() {
    const ps = await prisma.misInformationPanel.findMany({
        where: {
            snapshot: {
                unitId: 'd865afb7-ff85-4c9b-bfd7-9a32f4664e34', // Regional Office
                businessDate: new Date(Date.UTC(2026, 2, 9))
            },
            parameter: { in: ['TD', 'Ret_TD', 'Bulk_Dep'] }
        },
        orderBy: { parameter: 'asc' }
    });
    console.log('--- Panel Data for RO 2026-03-09 ---');
    ps.forEach(p => {
        console.log(`${p.parameter}: val_current=${p.val_current}, budget_month=${p.budget_month}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
