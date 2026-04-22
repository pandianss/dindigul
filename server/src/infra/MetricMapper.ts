import { logger } from '../utils/logger';

/**
 * MetricMapper: Centralized mapping between external Excel headers and internal Registry Codes.
 * This is the SINGLE SOURCE OF TRUTH for data field translations.
 */
export class MetricMapper {
    private static readonly SKIP_PATTERNS = [
        /^s\s*no\.?$/i,
        /^sol$/i,
        /^date$/i,
        /^branch$/i,
        /^total$/i,
        /^remark.*$/i
    ];

    private static readonly mapping: Record<string, string> = {
        // Advance Products
        'agri jl': 'Agri_JL',
        'retail jl': 'RETAIL_JL',
        'gold': 'Gold',
        'housing': 'HL',
        'vehicle': 'VL',
        'personal': 'PersonalLoan',
        'mortgage': 'Mort',
        'education': 'EL',
        'liquirent': 'Liq',
        'other retail': 'OthRet',
        'total retail': 'Core Ret',
        'core retail': 'Core Ret',
        'retail total': 'Core Ret',
        'msme': 'MSME',
        'shg': 'SHG',
        'kcc': 'KCC',
        'govt spon': 'Gov',
        'oth schematic': 'OthSch',
        'core agri': 'Core_Agri',
        'adv': 'Adv',
        'advances': 'Adv',
        'total advances': 'Adv',
        'npa': 'NPA',
        'mudra': 'Mudra',

        // Deposits
        'sb': 'SB',
        'savings': 'SB',
        'sb deposits': 'SB',
        'cd': 'CD',
        'current': 'CD',
        'cd deposits': 'CD',
        'td': 'TD',
        'term': 'TD',
        'td deposits': 'TD',
        'total dep': 'Total Dep',
        'total deposits': 'Total Dep',
        'bulk dep': 'Bulk_Dep',

        // Cash Holdings
        'cash on hand': 'CASH_HAND',
        'atm cash': 'CASH_ATM',
        'bc cash': 'CASH_BC',
        'bna cash': 'CASH_BNA',
        'total cash': 'CASH_TOTAL',
        'crl': 'CASH_CRL',
        'excess': 'CASH_EXCESS',

        // Profitability & Recovery
        'pl': 'Branch_PL',
        'profit': 'Branch_PL',
        'loss': 'Branch_PL',
        'rec q1': 'REC_Q1',
        'rec q2': 'REC_Q2',
        'rec q3': 'REC_Q3',
        'rec q4': 'REC_Q4',

        // Business
        'bus': 'Bus',
        'business': 'Bus',
        'total business': 'Bus'
    };

    /**
     * Normalizes an Excel header to a Registry Code.
     * Returns null for skip columns.
     */
    static map(header: string): string | null {
        // Aggressive normalization: remove all non-alphanumeric/space characters and trim all whitespace
        const normalized = (header || '').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
        
        if (this.SKIP_PATTERNS.some(p => p.test(normalized))) {
            return null;
        }

        const code = this.mapping[normalized];
        if (code) return code;

        // Fallback for unmapped columns (log and return trimmed uppercase)
        logger.warn('METRIC_MAPPER_UNMAPPED', { header, normalized });
        return normalized.toUpperCase().replace(/\s+/g, '_');
    }

    /**
     * Identifies special metrics that need post-ingestion calculation.
     */
    static getCalculatedMetrics(factMap: Record<string, number>): Record<string, number> {
        const calculated: Record<string, number> = {};

        // Helper to get value or 0
        const getVal = (m: string) => factMap[m] || 0;

        const sb = getVal('SB');
        const cd = getVal('CD');
        const td = getVal('TD');
        const adv = getVal('Adv');
        const bulk = getVal('Bulk_Dep');

        // 1. CASA = SB + CD
        const casa = sb + cd;
        calculated['CASA'] = casa;

        // 2. Total Dep = SB + CD + TD
        const totalDep = sb + cd + td;
        calculated['Total Dep'] = totalDep;

        // 3. Ret_TD = TD - Bulk (floor at 0)
        calculated['Ret_TD'] = Math.max(0, td - bulk);

        // 4. Bus = Total Dep + Adv
        calculated['Bus'] = totalDep + adv;

        // 5. CD_Ratio = Adv / Total Dep * 100 (round 2dp)
        calculated['CD_Ratio'] = totalDep === 0 ? 0 : Number((adv / totalDep * 100).toFixed(2));

        // 6. CASA_PCT = CASA / Total Dep * 100 (round 2dp)
        calculated['CASA_PCT'] = totalDep === 0 ? 0 : Number((casa / totalDep * 100).toFixed(2));

        // 7. Recovery = REC_Q1 + REC_Q2 + REC_Q3 + REC_Q4
        calculated['Recovery'] = getVal('REC_Q1') + getVal('REC_Q2') + getVal('REC_Q3') + getVal('REC_Q4');

        // 8. Core Adv = Mudra + Core_Agri + Core Ret + MSME + SHG + KCC
        calculated['Core Adv'] = getVal('Mudra') + getVal('Core_Agri') + getVal('Core Ret') + 
                                 getVal('MSME') + getVal('SHG') + getVal('KCC');

        return calculated;
    }

    /**
     * Returns all unique metric codes (direct + calculated).
     */
    static getAllMetricCodes(): string[] {
        const direct = Object.values(this.mapping);
        const calculated = [
            'CASA', 'Total Dep', 'Ret_TD', 'Bus', 
            'CD_Ratio', 'CASA_PCT', 'Recovery', 'Core Adv'
        ];
        return Array.from(new Set([...direct, ...calculated]));
    }
}

