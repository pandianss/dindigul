import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const plCount = await p.fact.count({ where: { metric: 'PL' } });
    const personalLoanCount = await p.fact.count({ where: { metric: 'PersonalLoan' } });
    const registryEntry = await p.misParameterRegistry.findUnique({ where: { parameterName: 'PersonalLoan' } });
    const legacyEntry = await p.misParameterRegistry.findUnique({ where: { parameterName: 'PL' } });

    console.log('Migration Check Results:');
    console.log(`  facts with metric='PL':         ${plCount}`);
    console.log(`  facts with metric='PersonalLoan': ${personalLoanCount}`);
    console.log(`  registry has 'PersonalLoan':      ${!!registryEntry}`);
    console.log(`  registry has 'PL':                ${!!legacyEntry}`);

    // Check one sample branch (0174) for any recent date
    const sample = await p.fact.findFirst({
        where: { unitId: '0174', metric: 'PersonalLoan' },
        orderBy: { date: 'desc' }
    });
    if (sample) {
        console.log(`  Found sample for SOL 0174: metric=${sample.metric}, value=${sample.value}, date=${sample.date.toISOString()}`);
    } else {
        console.log('  No sample found for SOL 0174');
    }

    await p.$disconnect();
}

main();
