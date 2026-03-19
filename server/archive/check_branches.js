const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBranches() {
    const branches = await prisma.branch.findMany({
        where: { OR: [{ type: 'REGIONAL OFFICE' }, { code: '3933' }] }
    });
    console.table(branches.map(b => ({ code: b.code, name: b.nameEn, type: b.type, id: b.id })));
}

checkBranches().catch(console.error).finally(() => prisma.$disconnect());
