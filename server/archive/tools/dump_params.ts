import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const params = await prisma.misParameterRegistry.findMany({
        orderBy: { orderIndex: 'asc' }
    });
    console.log(JSON.stringify(params, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
