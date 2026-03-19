import prisma from '../lib/prisma';

async function main() {
    console.log('Migrating metric name PL → PersonalLoan...');

    // 1. mis_facts table
    const factsResult = await prisma.$executeRaw`
        UPDATE mis_facts SET metric = 'PersonalLoan' WHERE metric = 'PL'
    `;
    console.log(`  mis_facts updated: ${factsResult} rows`);

    // 2. mis_information_panels table
    const panelsResult = await prisma.$executeRaw`
        UPDATE mis_information_panels SET parameter = 'PersonalLoan' WHERE parameter = 'PL'
    `;
    console.log(`  mis_information_panels updated: ${panelsResult} rows`);

    // 3. mis_parameter_registry table
    const regResult = await prisma.misParameterRegistry.updateMany({
        where: { parameterName: 'PL' },
        data: { parameterName: 'PersonalLoan' }
    });
    console.log(`  mis_parameter_registry updated: ${regResult.count} rows`);

    console.log('Migration complete.');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
