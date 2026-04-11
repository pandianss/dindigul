const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    await prisma.parameter.upsert({
        where: { code: 'TOTAL_BUSINESS' },
        update: {},
        create: { code: 'TOTAL_BUSINESS', nameEn: 'Total Business', category: 'BUSINESS', unit: 'Cr' }
    });
    console.log('Synchronized TOTAL_BUSINESS parameter');
}
main().catch(console.error).finally(() => prisma.$disconnect());
