const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedNotices() {
    try {
        const notices = [
            {
                titleEn: 'Regional Performance Update',
                contentEn: 'Our region has achieved 105% of the target for CASA this month. Congratulations to all teams!',
                category: 'Performance',
                priority: 'NORMAL',
                isPinned: true,
                requiresAck: false,
            },
            {
                titleEn: 'New Operational Guidelines',
                contentEn: 'Please find the updated guidelines for account opening procedures in the documents section.',
                category: 'Policy',
                priority: 'HIGH',
                isPinned: false,
                requiresAck: true,
            },
            {
                titleEn: 'Monthly Staff Meeting',
                contentEn: 'The monthly staff meeting is scheduled for next Friday at 4:00 PM in the conference hall.',
                category: 'Event',
                priority: 'NORMAL',
                isPinned: false,
                requiresAck: false,
            }
        ];

        for (const notice of notices) {
            await prisma.notice.create({ data: notice });
        }

        console.log('Sample notices seeded successfully.');
    } catch (error) {
        console.error('Error seeding notices:', error);
    } finally {
        await prisma.$disconnect();
    }
}

seedNotices();
