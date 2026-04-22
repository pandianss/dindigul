import { parseLocalISO } from '../../utils/dateUtils';
import { MisSnapshot } from './types';

export const formatValue = (val: number, isPercent: boolean = false) => {
    if (isPercent) {
        return `${Math.round(val)}%`;
    }
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
};

export const getStatusStyle = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
        case 'SURPASSED':
        case 'POSITIVE':
            return 'bg-bank-teal text-white';
        case 'ON-TRACK':
        case 'NEUTRAL':
        case 'LAGGING':
            return 'bg-blue-600 text-white';
        case 'BEHIND':
        case 'NEGATIVE':
            return 'bg-rose-500 text-white';
        default: return 'bg-slate-400 text-white';
    }
};

export const isRateMetric = (metric: string) => {
    const lower = metric.toLowerCase();
    return lower.includes('%') || lower.includes('ratio') || lower.includes('yield') || lower.includes('cost');
};

export const getHeaderDates = (snapshot: MisSnapshot | null) => {
    if (!snapshot?.businessDate) return null;
    const d = parseLocalISO(snapshot.businessDate) || new Date();
    const utcDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

    const yesterday = new Date(utcDate); yesterday.setUTCDate(utcDate.getUTCDate() - 1);
    const prevMonthEnd = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), 0));

    let fyYear = utcDate.getUTCMonth() < 3 ? utcDate.getUTCFullYear() - 1 : utcDate.getUTCFullYear();
    const fyStart = new Date(Date.UTC(fyYear, 2, 31));
    const prevFyStart = new Date(Date.UTC(fyYear - 1, 2, 31));
    const prevFyEnd = new Date(Date.UTC(fyYear, 2, 31));

    const fmt = (date: Date | string) => {
        const dt = typeof date === 'string' ? new Date(date) : date;
        const day = dt.getUTCDate().toString().padStart(2, '0');
        const month = (dt.getUTCMonth() + 1).toString().padStart(2, '0');
        const year = dt.getUTCFullYear().toString().slice(-2);
        return `${day}.${month}.${year}`;
    };

    return {
        yesterday: fmt(snapshot.compareDates?.yesterday || yesterday),
        monthEnd: fmt(prevMonthEnd),
        fyStart: fmt(fyStart),
        prevFyStart: fmt(prevFyStart),
        prevFyEnd: fmt(prevFyEnd),
        current: fmt(utcDate)
    };
};

export const calcPctVar = (growth: number, base: number) => {
    if (!base || base === 0) return 0;
    return (growth / Math.abs(base)) * 100;
};
