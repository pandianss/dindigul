import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function run() {
    const rows = await p.branch.findMany({
        where: { OR: [{ nameEn: { contains: 'Regional' } }, { type: 'RO' }] },
        select: { id: true, code: true, nameEn: true, type: true }
    });
    console.log(JSON.stringify(rows, null, 2));
    await p.$disconnect();
}
run();
