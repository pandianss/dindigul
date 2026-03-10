import prisma from '../src/lib/prisma';

async function main() {
    console.log('Querying current Retail Advances...');

    const retailParams = await prisma.misParameterRegistry.findMany({
        where: { category: 'Retail Advances', isEnabled: true }
    });
    console.log('Current Retail Advances:', retailParams);

    console.log('Updating MIS parameters for Core Retail changes...');

    // 1. Update PersonalLoan to be under Core Retail with display name 'Personal Loan'
    await prisma.misParameterRegistry.upsert({
        where: { parameterName: 'PersonalLoan' },
        update: {
            category: 'Core Retail',
            displayName: 'Personal Loan'
        },
        create: {
            parameterName: 'PersonalLoan',
            category: 'Core Retail',
            displayName: 'Personal Loan',
            isEnabled: true,
            orderIndex: 20
        }
    });

    // 2. Add ProfitLoss parameter
    await prisma.misParameterRegistry.upsert({
        where: { parameterName: 'ProfitLoss' },
        update: {
            displayName: 'Profit and Loss',
            category: 'Other'
        },
        create: {
            parameterName: 'ProfitLoss',
            displayName: 'Profit and Loss',
            category: 'Other',
            isEnabled: true,
            orderIndex: 300
        }
    });

    // 3. Disable Tot_Retail
    await prisma.misParameterRegistry.updateMany({
        where: { parameterName: 'Tot_Retail' },
        data: {
            isEnabled: false
        }
    });

    const retailParamCounts = await prisma.misParameterRegistry.count({
        where: { category: 'Core Retail', isEnabled: true }
    });
    console.log(`Active Core Retail parameters: ${retailParamCounts}`);

    console.log('Updates complete.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
