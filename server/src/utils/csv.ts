import { parse } from 'csv-parse/sync';

/**
 * Parses a CSV string into an array of objects.
 * Handles headers and trims whitespace.
 */
export function parseCSV<T>(csvContent: string): T[] {
    try {
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true // Handle Byte Order Mark if present
        });
        return records as T[];
    } catch (error) {
        console.error('CSV Parsing error:', error);
        throw new Error('Failed to parse CSV content');
    }
}
