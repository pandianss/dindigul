const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const ps = await prisma.parameter.findMany();
        console.log(JSON.stringify(ps.map(p => ({code: p.code, name: p.nameEn})), null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
