import prisma from './server/src/lib/prisma';

async function main() {
    const params = await prisma.misParameterRegistry.findMany({
        where: { isEnabled: true },
        orderBy: { orderIndex: 'asc' }
    });
    console.log(JSON.stringify(params, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
