import prisma from '../lib/prisma';

async function main() {
    console.log('Seeding new MIS parameters...');

    const newMisParams = [
        // Renamed
        { parameterName: 'PersonalLoan', displayName: 'PL', category: 'Core Retail', orderIndex: 35, isEnabled: true },

        // Disabled
        { parameterName: 'Tot_Retail', displayName: 'Total Retail Advances', category: 'Retail Advances', orderIndex: 36, isEnabled: false },
        { parameterName: 'Bulk_Dep', displayName: 'Bulk Deposits', category: 'Deposits', orderIndex: 37, isEnabled: true },
        { parameterName: 'Branch_PL', displayName: 'Branch P&L', category: 'Profitability', orderIndex: 38, isEnabled: true },

        // New — cash management (enable only if cash dashboard panel is built)
        { parameterName: 'Cash_Hand', displayName: 'Cash on Hand', category: 'Cash Management', orderIndex: 50, isEnabled: false },
        { parameterName: 'Cash_ATM', displayName: 'ATM Cash', category: 'Cash Management', orderIndex: 51, isEnabled: false },
        { parameterName: 'Cash_BC', displayName: 'BC Cash', category: 'Cash Management', orderIndex: 52, isEnabled: false },
        { parameterName: 'Cash_BNA', displayName: 'BNA Cash', category: 'Cash Management', orderIndex: 53, isEnabled: false },
        { parameterName: 'Cash_Total', displayName: 'Total Cash', category: 'Cash Management', orderIndex: 54, isEnabled: false },
        { parameterName: 'Cash_CRL', displayName: 'Cash Required Level', category: 'Cash Management', orderIndex: 55, isEnabled: false },
        { parameterName: 'Cash_Excess', displayName: 'Cash Excess / Deficit', category: 'Cash Management', orderIndex: 56, isEnabled: false },
    ];

    for (const p of newMisParams) {
        await prisma.misParameterRegistry.upsert({
            where: { parameterName: p.parameterName },
            update: {
                displayName: p.displayName,
                category: p.category,
                orderIndex: p.orderIndex
            },
            create: {
                ...p,
                createdFromBudgetFlag: false,
                description: ''
            }
        });
    }

    console.log('MIS parameters seeded successfully.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
