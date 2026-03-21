import prisma from '../../src/lib/prisma';

async function main() {
    const params = await prisma.misParameterRegistry.findMany({
        orderBy: { orderIndex: 'asc' }
    });
    console.log('--- Enabled Parameters ---');
    params.forEach((p: any) => {
        console.log(`${p.parameterName} | ${p.displayName} | parent=${p.parentParameterName} | cat=${p.category}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
