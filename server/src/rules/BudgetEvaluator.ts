/**
 * Domain Service: Pure logic for budget normalization and period resolution.
 * No I/O or side effects.
 */
export class BudgetEvaluator {
    
    /**
     * Normalizes a currency string into a number.
     */
    static normalizeValue(val: string): number {
        if (!val) return 0;
        const clean = val.replace(/,/g, '').replace(/-/g, '0').trim();
        return parseFloat(clean) || 0;
    }

    /**
     * Resolves complex date formats (MMM-YY, DD/MM/YYYY) into native Dates.
     */
    static parsePeriod(period: string): Date {
        const p = period.trim().toUpperCase();
        
        // Match DD/MM/YYYY
        const dmyParts = p.split(/[\/\-]/);
        if (dmyParts.length === 3) {
            const [d, m, y] = dmyParts.map(part => parseInt(part));
            const fullYear = y < 100 ? 2000 + y : y;
            return new Date(fullYear, m - 1, d || 1);
        }

        // Match MMM-YY
        const months: Record<string, number> = {
            'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
            'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
        };
        const parts = p.split('-');
        if (parts.length === 2 && months[parts[0]] !== undefined) {
            return new Date(2000 + parseInt(parts[1]), months[parts[0]], 1);
        }

        return new Date(p);
    }
}
