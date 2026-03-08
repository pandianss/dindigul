const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNotices() {
    try {
        const count = await prisma.notice.count();
        console.log('Total notices:', count);

        if (count > 0) {
            const notices = await prisma.notice.findMany({
                take: 5,
                include: { photo: true }
            });
            console.log('Sample notices:', JSON.stringify(notices, null, 2));
        } else {
            console.log('No notices found in database.');
        }
    } catch (error) {
        console.error('Error checking notices:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkNotices();
