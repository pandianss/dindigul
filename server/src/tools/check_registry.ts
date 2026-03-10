import prisma from '../lib/prisma';

async function main() {
    const params = await prisma.misParameterRegistry.findMany({
        orderBy: { orderIndex: 'asc' }
    });
    console.log('--- Enabled Parameters ---');
    params.forEach(p => {
        console.log(`${p.parameterName} | ${p.displayName} | parent=${p.parentParameterName} | cat=${p.category}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
