import { logger } from '../utils/logger';

/**
 * MetricMapper: Centralized mapping between external Excel headers and internal Registry Codes.
 * This is the SINGLE SOURCE OF TRUTH for data field translations.
 */
export class MetricMapper {
    private static readonly mapping: Record<string, string> = {
        // Core Deposits
        ' SB ': 'SB',
        ' CD ': 'CD',
        ' TD ': 'TD',
        'Bulk Dep': 'Bulk_Dep',

        // Core Advances
        ' Mudra ': 'MUDRA',
        ' CORE AGRI ': 'CORE_AGRI',
        ' ADV ': 'ADV',
        ' TOTAL RETAIL ': 'RETAIL_TOTAL',

        // Cash & Liquidity
        'Total Cash': 'CASH_TOTAL',
        'Excess': 'CASH_EXCESS',
        'Cash on Hand': 'CASH_HAND',
        'ATM Cash': 'CASH_ATM',

        // Performance & Recovery
        'PL': 'Branch_PL',
        'Rec Q1': 'Rec_Q1',
        'Rec Q2': 'Rec_Q2',
        'Rec Q3': 'Rec_Q3',
        'Rec Q4': 'Rec_Q4',

        // Fallbacks/Others
        ' NPA ': 'NPA',
        ' SHG ': 'SHG',
        ' KCC ': 'KCC'
    };

    /**
     * Normalizes an Excel header to a Registry Code.
     */
    static map(header: string): string {
        const trimmed = header.trim();
        
        // Direct match with trimmed version
        if (this.mapping[header]) return this.mapping[header];
        if (this.mapping[trimmed]) return this.mapping[trimmed];

        // Case-insensitive lookup
        const entry = Object.entries(this.mapping).find(([k]) => 
            k.trim().toLowerCase() === trimmed.toLowerCase()
        );

        if (entry) return entry[1];

        // If no mapping exists, return the trimmed header as is
        return trimmed;
    }

    /**
     * Identifies special metrics that need post-ingestion calculation (e.g. Total Recovery).
     */
    static getCalculatedMetrics(factMap: Record<string, number>): Record<string, number> {
        const calculated: Record<string, number> = {};

        // 1. Total Recovery (Sum of Q1-Q4)
        const q1 = factMap['Rec_Q1'] || 0;
        const q2 = factMap['Rec_Q2'] || 0;
        const q3 = factMap['Rec_Q3'] || 0;
        const q4 = factMap['Rec_Q4'] || 0;
        calculated['Recovery'] = q1 + q2 + q3 + q4;

        // 2. Retail TD (TD - Bulk)
        const td = factMap['TD'] || 0;
        const bulk = factMap['Bulk_Dep'] || 0;
        calculated['Ret_TD'] = td - bulk;

        return calculated;
    }
}
