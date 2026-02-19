import {
    startOfMonth,
    endOfMonth,
    startOfQuarter,
    endOfQuarter,
    eachDayOfInterval,
    isSunday,
    isSaturday,
    format,
} from 'date-fns';
import type { Holiday } from '../types/calendar';

export const isWorkingDay = (date: Date, holidays: Holiday[]): boolean => {
    // Sundays are never working days
    if (isSunday(date)) return false;

    // Check custom holiday list
    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => h.date === dateStr);

    if (holiday) {
        if (holiday.type === 'WORKING_DAY') return true;
        if (holiday.type === 'HALF_DAY') return true; // Counts as 0.5 in weight, but is a working day
        return false;
    }

    // Default Saturday logic: 2nd and 4th off
    if (isSaturday(date)) {
        const dayOfMonth = date.getDate();
        const isSecondSaturday = dayOfMonth >= 8 && dayOfMonth <= 14;
        const isFourthSaturday = dayOfMonth >= 22 && dayOfMonth <= 28;
        return !(isSecondSaturday || isFourthSaturday);
    }

    return true;
};

export const getWorkingDayWeight = (date: Date, holidays: Holiday[]): number => {
    if (isSunday(date)) return 0;

    const dateStr = format(date, 'yyyy-MM-dd');
    const holiday = holidays.find(h => h.date === dateStr);

    if (holiday) {
        if (holiday.type === 'WORKING_DAY') return 1;
        if (holiday.type === 'HALF_DAY') return 0.5;
        return 0;
    }

    if (isSaturday(date)) {
        const dayOfMonth = date.getDate();
        const isSecondSaturday = dayOfMonth >= 8 && dayOfMonth <= 14;
        const isFourthSaturday = dayOfMonth >= 22 && dayOfMonth <= 28;
        return (isSecondSaturday || isFourthSaturday) ? 0 : 1;
    }

    return 1;
};

export const countWorkingDaysInInterval = (start: Date, end: Date, holidays: Holiday[]): number => {
    const days = eachDayOfInterval({ start, end });
    return days.reduce((acc, day) => acc + getWorkingDayWeight(day, holidays), 0);
};

export const getFinancialYearRange = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    // FY in India starts April 1
    const startYear = month < 3 ? year - 1 : year;
    return {
        start: new Date(startYear, 3, 1),
        end: new Date(startYear + 1, 2, 31)
    };
};

export const getCalendarStats = (currentDate: Date, holidays: Holiday[]) => {
    const fy = getFinancialYearRange(currentDate);
    const qStart = startOfQuarter(currentDate);
    const mStart = startOfMonth(currentDate);

    return {
        fy: {
            elapsed: countWorkingDaysInInterval(fy.start, currentDate, holidays),
            total: countWorkingDaysInInterval(fy.start, fy.end, holidays)
        },
        quarter: {
            elapsed: countWorkingDaysInInterval(qStart, currentDate, holidays),
            total: countWorkingDaysInInterval(qStart, endOfQuarter(currentDate), holidays)
        },
        month: {
            elapsed: countWorkingDaysInInterval(mStart, currentDate, holidays),
            total: countWorkingDaysInInterval(mStart, endOfMonth(currentDate), holidays)
        }
    };
};
