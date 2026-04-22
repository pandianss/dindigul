import {
    isSunday,
    isSaturday,
    format,
    eachDayOfInterval,
    startOfMonth,
    endOfMonth,
    startOfQuarter,
    endOfQuarter,
    startOfYear,
    endOfYear,
    isBefore
} from 'date-fns';
import prisma from '../lib/prisma';

export interface Holiday {
    date: Date | string;
    type: string;
}

/**
 * Determines if a given date is a working day based on bank rules and custom overrides.
 */
export const isWorkingDay = (date: Date, holidays: Holiday[]): boolean => {
    // Check custom holiday list first for overrides
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => {
        const hDate = typeof h.date === 'string' ? h.date : format(h.date, 'yyyy-MM-dd');
        return hDate === dateStr;
    });

    if (holiday) {
        if (holiday.type === 'WORKING_DAY') return true;
        if (holiday.type === 'HALF_DAY') return true; // Counts as working day
        return false;
    }

    // Default: Sundays are always non-working days
    if (isSunday(date)) return false;

    // Default Saturday logic: 2nd and 4th are holidays
    if (isSaturday(date)) {
        const dayOfMonth = date.getDate();
        const isSecondSaturday = dayOfMonth >= 8 && dayOfMonth <= 14;
        const isFourthSaturday = dayOfMonth >= 22 && dayOfMonth <= 28;
        return !(isSecondSaturday || isFourthSaturday);
    }

    return true;
};

/**
 * Calculates the weight of a working day (1 for full, 0.5 for half, 0 for holiday/weekend).
 */
export const getWorkingDayWeight = (date: Date, holidays: Holiday[]): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => {
        const hDate = typeof h.date === 'string' ? h.date : format(h.date, 'yyyy-MM-dd');
        return hDate === dateStr;
    });

    if (holiday) {
        if (holiday.type === 'WORKING_DAY') return 1;
        if (holiday.type === 'HALF_DAY') return 0.5;
        return 0;
    }

    if (isSunday(date)) return 0;

    if (isSaturday(date)) {
        const dayOfMonth = date.getDate();
        const isSecondSaturday = dayOfMonth >= 8 && dayOfMonth <= 14;
        const isFourthSaturday = dayOfMonth >= 22 && dayOfMonth <= 28;
        return (isSecondSaturday || isFourthSaturday) ? 0 : 1;
    }

    return 1;
};

/**
 * Counts the total working days in a given interval.
 */
export const countWorkingDaysInInterval = (start: Date, end: Date, holidays: Holiday[]): number => {
    const days = eachDayOfInterval({ start, end });
    return days.reduce((count, day) => count + getWorkingDayWeight(day, holidays), 0);
};

/**
 * Gets fiscal year boundaries (assuming April 1st to March 31st).
 */
export const getFYBoundaries = (date: Date = new Date()) => {
    const d = new Date(date);
    const year = d.getUTCMonth() < 3 ? d.getUTCFullYear() - 1 : d.getUTCFullYear();
    const start = new Date(Date.UTC(year, 3, 1)); // April 1st
    const end = new Date(Date.UTC(year + 1, 2, 31, 23, 59, 59)); // March 31st next year
    const label = `${year}-${(year + 1).toString().slice(-2)}`;
    return { start, end, label };
};

export const getFYRange = getFYBoundaries;

export interface FYMetrics {
    financialYear: string;
    fyWD: string;
    fyPct: number;
    qtr: string;
    qtrPct: number;
    month: string;
    monthPct: number;
    daysToFYEnd: number;
}

/**
 * Calculates high-fidelity financial year progress metrics.
 */
export function getFYMetrics(date: Date = new Date(), holidays: Holiday[] = []): FYMetrics {
    const { start, end, label } = getFYBoundaries(date);
    const d = new Date(date);

    const totalFYWD = countWorkingDaysInInterval(start, end, holidays) || 365;
    const elapsedFYWD = countWorkingDaysInInterval(start, d, holidays);
    const fyPct = Math.min(100, Math.max(0, Math.round((elapsedFYWD / totalFYWD) * 100)));

    // Quarter Progress
    const qtrStart = startOfQuarter(d);
    const qtrEnd = endOfQuarter(d);
    const totalQtrWD = countWorkingDaysInInterval(qtrStart, qtrEnd, holidays) || 90;
    const elapsedQtrWD = countWorkingDaysInInterval(qtrStart, d, holidays);
    
    // Month Progress
    const mStart = startOfMonth(d);
    const mEnd = endOfMonth(d);
    const totalMonthWD = countWorkingDaysInInterval(mStart, mEnd, holidays) || 25;
    const elapsedMonthWD = countWorkingDaysInInterval(mStart, d, holidays);

    return {
        financialYear: label,
        fyWD: `${elapsedFYWD}/${totalFYWD}`,
        fyPct,
        qtr: `Q${Math.floor(d.getUTCMonth() / 3) + 1}`,
        qtrPct: Math.round((elapsedQtrWD / totalQtrWD) * 100),
        month: format(d, 'MMMM'),
        monthPct: Math.round((elapsedMonthWD / totalMonthWD) * 100),
        daysToFYEnd: Math.max(0, Math.floor((end.getTime() - d.getTime()) / 86400000))
    };
}

/**
 * Synchronizes a single date's working status in CalendarMaster based on Holiday table and default rules.
 */
export async function syncCalendarDay(date: Date) {
    const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const endOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59));

    // 1. Get all holiday entries for this date
    const holidays = await prisma.holiday.findMany({
        where: {
            date: {
                gte: startOfDay,
                lte: endOfDay
            }
        }
    });

    // 2. Determine working status
    let working = true;
    let holidayFlag = false;

    if (holidays.length > 0) {
        holidayFlag = true;
        // Priority logic: If any entry says it's a working day, it is. Otherwise if any entry says non-working, it's a holiday.
        const hasWorkingOverride = holidays.some(h => h.type === 'WORKING_DAY' || h.type === 'HALF_DAY');
        if (hasWorkingOverride) {
            working = true;
        } else {
            working = false;
        }
    } else {
        // Use default rules
        working = isWorkingDay(date, []); // Passing empty array to use defaults (Sunday / Sat rules)
        holidayFlag = !working;
    }

    // 3. Update CalendarMaster
    const fy = getFYBoundaries(date);
    const monthKey = format(date, 'yyyy-MM');

    await prisma.calendarMaster.upsert({
        where: { calDate: startOfDay },
        update: {
            isWorkingDay: working,
            holidayFlag,
            monthKey,
            financialPeriod: fy.label
        },
        create: {
            calDate: startOfDay,
            isWorkingDay: working,
            holidayFlag,
            monthKey,
            financialPeriod: fy.label
        }
    });
}

/**
 * Synchronizes the entire financial year's calendar status.
 * Useful for bulk updates or ensuring data integrity.
 */
export async function syncFullCalendar() {
    const { start, end } = getFYBoundaries(new Date());
    const days = eachDayOfInterval({ start, end });
    
    for (const day of days) {
        await syncCalendarDay(day);
    }
}
