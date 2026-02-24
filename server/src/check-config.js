const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const configs = await prisma.systemConfig.findMany({
        where: { group: 'PLANNING' }
    });
    console.log(JSON.stringify(configs, null, 2));
    await prisma.$disconnect();
}

main();
