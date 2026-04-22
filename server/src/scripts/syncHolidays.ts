import prisma from '../lib/prisma';
import { syncCalendarDay, getFYBoundaries } from '../utils/calendar';
import { eachDayOfInterval } from 'date-fns';

async function main() {
    console.log('--- Starting Calendar Synchronization ---');
    
    // Get FY boundaries for current date
    const { start, end, label } = getFYBoundaries(new Date());
    console.log(`Financial Year: ${label}`);
    console.log(`Range: ${start.toISOString()} to ${end.toISOString()}`);

    const days = eachDayOfInterval({ start, end });
    console.log(`Processing ${days.length} days...`);

    let count = 0;
    for (const day of days) {
        await syncCalendarDay(day);
        count++;
        if (count % 50 === 0) {
            console.log(`Processed ${count} days...`);
        }
    }

    console.log('--- Sync Completed Successfully ---');
}

main()
    .catch((e) => {
        console.error('Error during sync:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
