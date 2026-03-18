const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParam() {
    const params = await prisma.misParameterRegistry.findMany();
    const p = params.filter(p => p.parameterName.toLowerCase().includes('profit') || p.parameterName.toLowerCase().includes('pl') || p.parameterName === 'ProfitLoss');
    console.table(p.map(x => ({ code: x.parameterName, category: x.category })));
}

checkParam().catch(console.error).finally(() => prisma.$disconnect());
