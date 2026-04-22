const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAchievements() {
    try {
        const achievements = [
            {
                titleEn: 'Top Performing Region - Q3',
                contentEn: 'Dindigul Region has been awarded the Top Performing Region for Q3 2024 for outstanding growth in RTD.',
                category: 'ACHIEVEMENT',
                priority: 'HIGH',
                isPinned: true,
                requiresAck: false,
            },
            {
                titleEn: 'New Branch Opening: Oddanchatram',
                contentEn: 'We are proud to announce the opening of our 71st branch in Oddanchatram, expanding our reach to serve more customers.',
                category: 'ACHIEVEMENT',
                priority: 'NORMAL',
                isPinned: false,
                requiresAck: false,
            },
            {
                titleEn: 'Excellence in Customer Service Award',
                contentEn: 'Three of our branches have received the National Excellence in Customer Service award this year.',
                category: 'ACHIEVEMENT',
                priority: 'NORMAL',
                isPinned: true,
                requiresAck: false,
            }
        ];

        for (const achievement of achievements) {
            await prisma.notice.create({ data: achievement });
        }

        console.log('Achievement notices seeded successfully.');
    } catch (error) {
        console.error('Error seeding achievements:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedAchievements();
