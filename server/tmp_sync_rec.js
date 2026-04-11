const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    await prisma.parameter.upsert({
        where: { code: 'TOTAL_RECOVERY' },
        update: {},
        create: { code: 'TOTAL_RECOVERY', nameEn: 'Total Recovery', category: 'RECOVERY', unit: 'Cr' }
    });
    console.log('Synchronized TOTAL_RECOVERY parameter');
}
main().catch(console.error).finally(() => prisma.$disconnect());
