const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const params = await prisma.parameter.findMany();
        console.log('--- Parameter Units ---');
        params.forEach(p => {
            console.log(`${p.code}: ${p.unit} (${p.nameEn})`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
