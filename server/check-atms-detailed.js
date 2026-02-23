const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const atms = await prisma.atm.findMany({ select: { atmId: true, branchId: true } });
    console.table(atms.slice(0, 10));
}

check().catch(console.error).finally(() => prisma.$disconnect());
