import prisma from '../lib/prisma';
import { syncFullCalendar } from '../utils/calendar';

async function main() {
    console.log('--- Starting Calendar Integrity Fix ---');

    // 1. Identify skewed records (Not normalized to UTC Midnight)
    const allRecords = await prisma.calendarMaster.findMany();
    const skewedRecords = allRecords.filter(r => !r.calDate.toISOString().endsWith('T00:00:00.000Z'));

    console.log(`Found ${allRecords.length} total records.`);
    console.log(`Found ${skewedRecords.length} skewed records to delete.`);

    if (skewedRecords.length > 0) {
        const skewedDates = skewedRecords.map(r => r.calDate);
        
        // Delete skewed records
        await prisma.calendarMaster.deleteMany({
            where: {
                calDate: {
                    in: skewedDates
                }
            }
        });
        console.log('Successfully deleted skewed records.');
    }

    // 2. Perform a full synchronization to ensure all dates are correctly represented
    console.log('Running full synchronization for current FY...');
    await syncFullCalendar();
    
    console.log('--- Calendar Integrity Fix Completed ---');
}

main()
    .catch((e) => {
        console.error('Error during integrity fix:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
