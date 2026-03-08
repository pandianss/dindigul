import { differenceInDays, startOfMonth, endOfMonth, differenceInBusinessDays } from 'date-fns';

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
 * Indian Financial Year starts April 1st and ends March 31st
 */
export const getFYRange = (date: Date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed

    let startYear = year;
    if (month < 3) { // Jan, Feb, Mar belong to previous year's FY
        startYear = year - 1;
    }

    const start = new Date(startYear, 3, 1); // April 1st
    const end = new Date(startYear + 1, 2, 31, 23, 59, 59); // March 31st
    return { start, end, label: `${startYear}-${(startYear + 1).toString().slice(-2)}` };
};

export const getFYMetrics = (date: Date = new Date()): FYMetrics => {
    const { start, end, label } = getFYRange(date);

    // 1. FY Working Days (Approximate)
    // In a real system, we'd count against a Holiday table.
    // For now, let's use business days as a proxy.
    const totalFYDays = differenceInDays(end, start) + 1;
    const elapsedFYDays = differenceInDays(date, start) + 1;
    const fyPct = Math.min(100, Math.max(0, Math.round((elapsedFYDays / totalFYDays) * 100)));

    // 2. Quarter Progress
    const month = date.getMonth();
    let qtrStartMonth = 3; // default Q1 (Apr-Jun)
    let qtrLabel = "Q1";
    if (month >= 6 && month <= 8) { qtrStartMonth = 6; qtrLabel = "Q2"; }
    else if (month >= 9 && month <= 11) { qtrStartMonth = 9; qtrLabel = "Q3"; }
    else if (month < 3) { qtrStartMonth = 0; qtrLabel = "Q4"; (date.getFullYear() - 1); } // 0=Jan

    const qtrStart = new Date(date.getFullYear(), qtrStartMonth, 1);
    const qtrEnd = new Date(qtrStart);
    qtrEnd.setMonth(qtrEnd.getMonth() + 3);
    qtrEnd.setDate(0); // Last day of qtr

    const totalQtrDays = differenceInDays(qtrEnd, qtrStart) + 1;
    const elapsedQtrDays = Math.max(0, differenceInDays(date, qtrStart) + 1);
    const qtrPct = Math.min(100, Math.max(0, Math.round((elapsedQtrDays / totalQtrDays) * 100)));

    // 3. Month Progress
    const mStart = startOfMonth(date);
    const mEnd = endOfMonth(date);
    const totalMonthDays = differenceInDays(mEnd, mStart) + 1;
    const elapsedMonthDays = differenceInDays(date, mStart) + 1;
    const monthPct = Math.min(100, Math.max(0, Math.round((elapsedMonthDays / totalMonthDays) * 100)));

    // 4. Days to FY End
    const daysToFYEnd = differenceInDays(end, date);

    return {
        financialYear: label,
        fyWD: `${elapsedFYDays}/${totalFYDays}`, // Placeholder for actual working days logic
        fyPct,
        qtr: `${elapsedQtrDays}/${totalQtrDays}`,
        qtrPct,
        month: `${elapsedMonthDays}/${totalMonthDays}`,
        monthPct,
        daysToFYEnd: Math.max(0, daysToFYEnd)
    };
};
