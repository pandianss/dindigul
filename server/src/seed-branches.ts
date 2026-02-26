import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const missingSols = [
    '1', '174', '175',
    '176', '230', '232',
    '237', '243', '332',
    '376', '883', '910',
    '911', '924'
];

async function seed() {
    console.log('--- Seeding Missing Branches ---');
    for (const sol of missingSols) {
        try {
            await prisma.branch.upsert({
                where: { code: sol },
                update: {},
                create: {
                    code: sol,
                    nameEn: `Branch ${sol}`,
                    type: 'BRANCH'
                }
            });
            console.log(`Ensured branch: ${sol}`);
        } catch (err) {
            console.error(`Failed to seed branch ${sol}:`, err);
        }
    }
    console.log('Seeding complete.');
    await prisma.$disconnect();
    process.exit(0);
}

seed();
