import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Meeting creation...');
    try {
        const meeting = await prisma.meeting.create({
            data: {
                date: new Date(),
                venue: 'Test Venue',
                status: 'DRAFT',
                title: 'Test Meeting',
                attendees: [],
                signatories: [],
                minutesJson: JSON.stringify([])
            }
        });
        console.log('Success!', meeting);
    } catch (err) {
        console.error('Failed!', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
