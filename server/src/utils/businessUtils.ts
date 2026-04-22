import { parse as parseDate, startOfDay, subMonths, endOfMonth, isBefore, setMonth, setDate, getYear, getMonth } from 'date-fns';

/**
 * Normalizes an amount string by removing commas and trimming.
 */
export function cleanAmount(val: string | number | undefined): number {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    return parseFloat(val.toString().replace(/,/g, '').trim()) || 0;
}

/**
 * Standardizes date parsing for CBS exports.
 * Supports MM/DD/YYYY and MM-DD-YYYY formats.
 */
export function parseCBSDate(dateStr: string, fallbackDate: Date = new Date()): Date {
    const trimmed = (dateStr || '').trim();
    if (!trimmed) return startOfDay(fallbackDate);

    let d: Date;
    if (trimmed.includes('/')) {
        // MM/DD/YYYY
        d = parseDate(trimmed, 'MM/dd/yyyy', new Date());
    } else if (trimmed.includes('-')) {
        // MM-DD-YYYY
        d = parseDate(trimmed, 'MM-dd-yyyy', new Date());
    } else {
        d = new Date(trimmed);
    }

    return isNaN(d.getTime()) ? startOfDay(fallbackDate) : startOfDay(d);
}

/**
 * Maps common business scheme types to standard account classes.
 */
export function mapAccountClass(schmType: string): 'SB' | 'CD' | 'OTHER' {
    const type = (schmType || '').toUpperCase();
    if (type === 'SBA' || type.includes('SB')) return 'SB';
    if (type === 'CAA' || type.includes('CD') || type.includes('CA')) return 'CD';
    return 'OTHER';
}

/**
 * Standardizes SOL ID to 4-digit string.
 */
export function formatSolId(sol: string | number | undefined): string {
    if (sol === undefined || sol === null) return '0000';
    return sol.toString().trim().padStart(4, '0');
}

/**
 * Normalizes an amount to a consistent unit (Paise/Rupees).
 * Used at the Ingestion Layer to ensure Single Source of Truth units.
 */
export function normalizeAmount(amount: number, forceNormalize: boolean = false): number {
    // If amount is extremely large (e.g., > 10^7), it's likely paise
    // If forceNormalize is true, always divide by 100
    if (forceNormalize) return amount / 100;
    
    // Auto-detection heuristic for CBS exports that often provide paise
    // This is a safety measure for the Ingestion layer.
    if (Math.abs(amount) > 100000000) return amount / 100; 
    
    return amount;
}

/**
 * Ensures a date is consistently treated as UTC to prevent timezone drift.
 */
export function toUTCDate(date: Date | string | number): Date {
    if (typeof date === 'string' && date.includes('-') && date.length === 10) {
        // Handle YYYY-MM-DD string directly to avoid timezone interpretation
        const [y, m, d] = date.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d));
    }
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date();
    
    // For Date objects, use UTC components to create a clean UTC midnight date
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Returns the start of the financial year (April 1st) for a given date.
 * In India, FY runs from April 1 to March 31.
 */
export function getFinancialYearStart(date: Date): Date {
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth(); // 0-indexed, April is 3
    
    // If month is Jan(0), Feb(1), or Mar(2), FY started in previous year
    const fyStartYear = month < 3 ? year - 1 : year;
    return new Date(Date.UTC(fyStartYear, 3, 1)); // April 1st UTC
}

/**
 * Returns the end of the previous month for a given date.
 */
export function getPreviousMonthEnd(date: Date): Date {
    const d = new Date(date);
    // Move to first of current month, then subtract one day
    const firstOfCurrent = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    return new Date(firstOfCurrent.getTime() - 86400000); // Subtract one day (24h in ms)
}

/**
 * Returns the previous business day (simplified as yesterday).
 */
export function getYesterday(date: Date): Date {
    const d = new Date(date);
    return new Date(d.getTime() - 86400000);
}
