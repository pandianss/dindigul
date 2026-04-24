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
        'got spon': 'Gov',
        'oth schematic': 'OthSch',
        'core agri': 'Core_Agri',
        'adv': 'Adv',
        'advances': 'Adv',
        'total advances': 'Adv',
        'npa': 'NPA',
        'mudra': 'Mudra',
        'retail td': 'Ret_TD',

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

        // 1. Core Agri = SHG + KCC + Gov + OthSch
        const coreAgri = getVal('SHG') + getVal('KCC') + getVal('Gov') + getVal('OthSch');
        calculated['Core_Agri'] = coreAgri;

        // 2. MSME = Mudra
        const msme = getVal('Mudra');
        calculated['MSME'] = msme;

        // 3. Gold = Agri_JL + RETAIL_JL
        const gold = getVal('Agri_JL') + getVal('RETAIL_JL');
        calculated['Gold'] = gold;

        // 4. Core Ret = PersonalLoan + Mort + EL + Liq + OthRet + HL + VL
        const coreRet = getVal('PersonalLoan') + getVal('Mort') + getVal('EL') + 
                         getVal('Liq') + getVal('OthRet') + getVal('HL') + getVal('VL');
        calculated['Core Ret'] = coreRet;

        // 5. Adv = Core_Agri + Core Ret + MSME + Gold
        const adv = coreAgri + coreRet + msme + gold;
        calculated['Adv'] = adv;

        // 6. CASA = SB + CD
        const sb = getVal('SB');
        const cd = getVal('CD');
        const casa = sb + cd;
        calculated['CASA'] = casa;

        // 7. TD = Ret_TD + Bulk_Dep
        const td = getVal('Ret_TD') + getVal('Bulk_Dep');
        calculated['TD'] = td;

        // 8. Total Dep = SB + CD + TD
        const totalDep = sb + cd + td;
        calculated['Total Dep'] = totalDep;

        // 9. Business = Adv + SB + CD + TD
        calculated['Bus'] = adv + totalDep;

        // 10. CASH_TOTAL = CASH_HAND + CASH_ATM + CASH_BC + CASH_BNA
        calculated['CASH_TOTAL'] = getVal('CASH_HAND') + getVal('CASH_ATM') + getVal('CASH_BC') + getVal('CASH_BNA');

        // 11. Recovery = REC_Q1 + REC_Q2 + REC_Q3 + REC_Q4
        calculated['Recovery'] = getVal('REC_Q1') + getVal('REC_Q2') + getVal('REC_Q3') + getVal('REC_Q4');

        // 12. Ratios
        calculated['CD_Ratio'] = totalDep === 0 ? 0 : Number((adv / totalDep * 100).toFixed(2));
        calculated['CASA_PCT'] = totalDep === 0 ? 0 : Number((casa / totalDep * 100).toFixed(2));

        return calculated;
    }

    /**
     * Returns all unique metric codes (direct + calculated).
     */
    static getAllMetricCodes(): string[] {
        const direct = Object.values(this.mapping);
        const calculated = [
            'CASA', 'Total Dep', 'TD', 'Bus', 
            'CD_Ratio', 'CASA_PCT', 'Recovery', 
            'Core_Agri', 'MSME', 'Gold', 'Core Ret', 'Adv', 'CASH_TOTAL', 'Bus_Per_Employee'
        ];
        return Array.from(new Set([...direct, ...calculated]));
    }
}

