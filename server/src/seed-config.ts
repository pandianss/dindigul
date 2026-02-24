const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding system configuration...');

    await prisma.systemConfig.upsert({
        where: { key: 'MIN_OPENING_BALANCE' },
        update: {},
        create: {
            key: 'MIN_OPENING_BALANCE',
            value: '500', // Default value
            dataType: 'NUMBER',
            group: 'PLANNING'
        }
    });

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
