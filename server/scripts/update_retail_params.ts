import prisma from '../src/lib/prisma';

async function main() {
    console.log('Querying current Retail Advances...');

    const retailParams = await prisma.misParameterRegistry.findMany({
        where: { category: 'Retail Advances', isEnabled: true }
    });
    console.log('Current Retail Advances:', retailParams);

    console.log('Updating MIS parameters for Core Retail changes...');

    // 1. Update PersonalLoan to be under Core Retail with display name 'PL'
    await prisma.misParameterRegistry.updateMany({
        where: { parameterName: 'PersonalLoan' },
        data: {
            category: 'Core Retail',
            displayName: 'PL'
        }
    });

    // 2. Disable Tot_Retail
    await prisma.misParameterRegistry.updateMany({
        where: { parameterName: 'Tot_Retail' },
        data: {
            isEnabled: false
        }
    });

    const retailParamCounts = await prisma.misParameterRegistry.count({
        where: { category: 'Retail Advances', isEnabled: true }
    });
    console.log(`Remaining active Retail Advances parameters: ${retailParamCounts}`);

    console.log('Updates complete.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
