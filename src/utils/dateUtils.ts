import { format } from 'date-fns';

/**
 * Formats a date as a local ISO string (yyyy-MM-dd) without timezone shifting.
 * This should be used instead of .toISOString().split('T')[0] for pickers.
 */
export const formatLocalISO = (date: Date | null | undefined): string => {
    if (!date || isNaN(date.getTime())) return '';
    return format(date, 'yyyy-MM-dd');
};

/**
 * Safely parses a date string to a Date object, or returns null.
 */
export const parseLocalISO = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    
    // Check if it's a yyyy-MM-dd string
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // 0-indexed
        const day = parseInt(match[3], 10);
        const d = new Date(year, month, day);
        return isNaN(d.getTime()) ? null : d;
    }

    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};
