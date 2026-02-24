import { PrismaClient } from '@prisma/client';
import { addDays, format, startOfYear, endOfYear, eachDayOfInterval, isWeekend } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Initializing Advanced Analytics ---');

    // 1. Seed System Configurations
    const configs = [
        { key: 'MIN_SB_BALANCE_THRESHOLD', value: '500', dataType: 'NUMBER', group: 'PLANNING' },
        { key: 'MIN_CD_BALANCE_THRESHOLD', value: '1000', dataType: 'NUMBER', group: 'PLANNING' },
        { key: 'PREMIUM_BALANCE_THRESHOLD', value: '1000000', dataType: 'NUMBER', group: 'PLANNING' },
        { key: 'OPTIONAL_REVERSAL_WINDOW_DAYS', value: '30', dataType: 'NUMBER', group: 'PLANNING' },
        { key: 'PRODUCT_ADOPTION_SCHEMES', value: JSON.stringify(['SBREG', 'SBNRE', 'CDGEN', 'CDCORP']), dataType: 'JSON', group: 'PLANNING' }
    ];

    for (const config of configs) {
        await prisma.systemConfig.upsert({
            where: { key: config.key },
            update: config,
            create: config
        });
    }
    console.log('✓ System configurations initialized.');

    // 2. Seed Product Adoption Schemes
    const schemes = [
        { code: 'SBREG', name: 'Savings Bank Regular', type: 'SB' },
        { code: 'SBNRE', name: 'SB NRE Account', type: 'SB' },
        { code: 'CDGEN', name: 'Current Deposit General', type: 'CD' },
        { code: 'CDCORP', name: 'Corporate Current Account', type: 'CD' }
    ];

    for (const scheme of schemes) {
        await prisma.productAdoptionScheme.upsert({
            where: { code: scheme.code },
            update: { name: scheme.name, type: scheme.type },
            create: scheme
        });
    }
    console.log('✓ Product adoption schemes initialized.');

    // 3. Seed Calendar Master (2025 and 2026)
    console.log('Populating Calendar Master...');
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2026-12-31');
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Fetch existing holidays
    const holidays = await prisma.holiday.findMany();
    const holidayDates = new Set(holidays.map(h => format(h.date, 'yyyy-MM-dd')));

    const calendarEntries = days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const isHoliday = holidayDates.has(dateStr);
        const isWE = isWeekend(date);

        // Financial Year Logic (India: April to March)
        let fyYear = date.getFullYear();
        if (date.getMonth() < 3) fyYear--;
        const financialPeriod = `FY ${fyYear}-${(fyYear + 1).toString().slice(-2)}`;

        return {
            calDate: date,
            isWorkingDay: !isHoliday && !isWE,
            holidayFlag: isHoliday,
            monthKey: format(date, 'yyyy-MM'),
            financialPeriod
        };
    });

    // Batch upsert to CalendarMaster
    // Using a loop because SQLite/Prisma might have limits on batch size or createMany for @id
    for (const entry of calendarEntries) {
        await prisma.calendarMaster.upsert({
            where: { calDate: entry.calDate },
            update: entry,
            create: entry
        });
    }
    console.log(`✓ Calendar Master populated with ${calendarEntries.length} entries.`);

    console.log('--- Initialization Complete ---');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
