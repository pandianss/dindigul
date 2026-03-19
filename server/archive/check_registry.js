const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRegistry() {
    const params = await prisma.misParameterRegistry.findMany();
    console.table(params.map(p => ({
        parameterName: p.parameterName,
        category: p.category
    })));
}

checkRegistry().catch(console.error).finally(() => prisma.$disconnect());
