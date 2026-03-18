const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkParam() {
    const params = await prisma.parameter.findMany();
    const p = params.filter(p => p.code.toLowerCase().includes('profit') || p.nameEn.toLowerCase().includes('profit'));
    console.table(p.map(x => ({ code: x.code, name: x.nameEn })));
}

checkParam().catch(console.error).finally(() => prisma.$disconnect());
