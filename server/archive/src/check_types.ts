import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const branches = await prisma.branch.findMany({
        select: { code: true, nameEn: true, type: true }
    });
    console.log(JSON.stringify(branches, null, 2));
    await prisma.$disconnect();
}
check();
