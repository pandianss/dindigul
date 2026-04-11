import prisma from '../lib/prisma';

async function main() {
    const pl = await prisma.misParameterRegistry.findUnique({
        where: { parameterName: 'PersonalLoan' }
    });
    const bpl = await prisma.misParameterRegistry.findUnique({
        where: { parameterName: 'Branch_PL' }
    });

    console.log('--- Verification Results ---');
    console.log('PersonalLoan:', pl ? `${pl.displayName} (Parent: ${pl.parentParameterName}, Category: ${pl.category})` : 'Missing');
    console.log('Branch_PL:', bpl ? `${bpl.displayName} (Parent: ${bpl.parentParameterName}, Category: ${bpl.category})` : 'Missing');
}

main().catch(console.error).finally(() => prisma.$disconnect());
