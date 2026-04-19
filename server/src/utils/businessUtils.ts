import { parse as parseDate, startOfDay } from 'date-fns';

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
    const d = new Date(date);
    if (isNaN(d.getTime())) return new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
