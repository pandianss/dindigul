import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import prisma from '../lib/prisma';
import { getRegionalOfficeData } from './pdfService';
import { generateReference } from './referenceService';
import { BusinessSnapshotService } from './BusinessSnapshotService';
import { toUTCDate } from '../utils/businessUtils';

type LetterKind = 'APPRECIATION' | 'EXPLANATION';
type PerformanceBucketCode =
    | 'DEPOSITS'
    | 'CORE_RETAIL'
    | 'CORE_SME'
    | 'CORE_AGRI'
    | 'NPA_MANAGEMENT'
    | 'ACCOUNT_OPENING'
    | 'CASH';

type PerformanceStat = {
    parameter: string;
    displayName: string;
    latest: number;
    budget: number;
    march31st: number;
    latestDate: Date;
    march31stDate: Date;
    gap: number;
    unit: string;
    isInverted: boolean;
    achievement: number;
    branchCode: string;
    branchName: string;
    branchType: string;
    headDesignation: string;
    headDept: string;
    exceptions: Array<{
        ruleId: string;
        parameter: string;
        severity: string;
        message: string;
    }>;
};

type BucketContext = {
    branchCode: string;
    branchName: string;
    branchType: string;
    headDesignation: string;
    headDept: string;
    headGender?: string;
};

type BucketRecord = {
    bucketCode: PerformanceBucketCode;
    bucketLabel: string;
    context: BucketContext;
    stats: PerformanceStat[];
};

type AccountOpeningRow = {
    branchId: string;
    branchCode: string;
    branchName: string;
    branchType: string;
    headDesignation: string;
    headDept: string;
    sbQualified: number;
    sbTotal: number;
    cdQualified: number;
    cdTotal: number;
    benchmarkSbQualified: number;
    benchmarkSbTotal: number;
    benchmarkCdQualified: number;
    benchmarkCdTotal: number;
};

type PerformanceBucket = {
    code: PerformanceBucketCode;
    label: string;
    metricAliases: string[];
};

const PERFORMANCE_BUCKETS: PerformanceBucket[] = [
    {
        code: 'DEPOSITS',
        label: 'Deposits',
        metricAliases: ['SB_DEPOSITS', 'CD_DEPOSITS', 'TD_DEPOSITS', 'RET_TD', 'RTD', 'CASA', 'TOTAL_DEPOSITS', 'BULK_DEP', 'SB', 'CD', 'TD']
    },
    {
        code: 'CORE_RETAIL',
        label: 'Core Retail',
        metricAliases: ['CORE_RETAIL', 'HL', 'PL', 'EL', 'VL', 'MORT', 'LIQ', 'OTH_RET']
    },
    {
        code: 'CORE_SME',
        label: 'Core SME',
        metricAliases: ['MSME', 'MUDRA']
    },
    {
        code: 'CORE_AGRI',
        label: 'Core Agri',
        metricAliases: ['Core_Agri', 'Agri_JL', 'KCC', 'SHG', 'Gov', 'OthSch', 'CORE_AGRI', 'GOV', 'OTHSCH']
    },
    {
        code: 'NPA_MANAGEMENT',
        label: 'NPA Management',
        metricAliases: ['NPA', 'GROSS_NPA', 'SMA', 'OVERDUE', 'RECOVERY', 'REC_Q1', 'REC_Q2', 'REC_Q3', 'REC_Q4']
    },
    {
        code: 'ACCOUNT_OPENING',
        label: 'Account Opening',
        metricAliases: []
    },
    {
        code: 'CASH',
        label: 'Cash Management',
        metricAliases: ['CASH_TOTAL', 'CASH_CRL', 'CASH_EXCESS', 'CASH_BNA', 'CRL', 'BNACASH', 'CASH_HOLDING']
    }
];

async function loadCriteria() {
    const rows = await prisma.systemConfig.findMany({ where: { group: 'LETTER_CRITERIA' } });
    const get = (key: string) => rows.find((r) => r.key === key)?.value ?? '';

    return {
        enabledParamCodes: get('LETTER_ENABLED_PARAMS').split(',').map((s) => s.trim()).filter(Boolean),
        allSnapshotParams: get('LETTER_ENABLED_PARAMS').trim() === '*' || get('LETTER_ENABLED_PARAMS').trim() === '',
        appreciationThreshold: parseFloat(get('LETTER_APPRECIATION_THRESHOLD') || '100'),
        explanationThreshold: parseFloat(get('LETTER_EXPLANATION_THRESHOLD') || '80'),
        opRiskFromExceptions: get('LETTER_OPRISK_FROM_EXCEPTIONS') === 'true',
        opRiskSeverities: get('LETTER_OPRISK_SEVERITIES').split(',').map((s) => s.trim()).filter(Boolean),
    };
}

export async function getCurrentOrgMeta() {
    return await getRegionalOfficeData();
}

function achievementPct(actual: number, budget: number, invert: boolean): number {
    if (budget === 0) return actual === 0 ? 100 : (invert ? 0 : 200);
    if (invert) return actual === 0 ? 200 : (budget / actual) * 100;
    return (actual / budget) * 100;
}

function normalizeMetricName(value: string) {
    return (value || '').trim().toUpperCase().replace(/[%\s-]+/g, '_');
}

function getBucketByMetric(metricName: string) {
    const normalized = normalizeMetricName(metricName);
    return PERFORMANCE_BUCKETS.find((bucket) =>
        bucket.metricAliases.some((alias) => normalizeMetricName(alias) === normalized)
    );
}

function prettifyParameterName(param: string): string {
    const normalized = normalizeMetricName(param);
    const labels: Record<string, string> = {
        SB_DEPOSITS: 'Savings Bank',
        CD_DEPOSITS: 'Current Deposits',
        TD_DEPOSITS: 'Term Deposits',
        TOTAL_ADVANCES: 'Total Advances',
        ADV: 'Total Advances',
        SB: 'Savings Bank',
        CD: 'Current Deposits',
        TD: 'Term Deposits',
        RET_TD: 'Retail Term Deposits',
        RTD: 'Retail Term Deposits',
        CASA: 'CASA',
        BULK_DEP: 'Bulk Deposits',
        CORE_RETAIL: 'Core Retail',
        CORE_RET: 'Core Retail',
        HL: 'Housing Loans',
        PL: 'Personal Loans',
        PERSONALLOAN: 'Personal Loans',
        EL: 'Education Loans',
        VL: 'Vehicle Loans',
        MORT: 'Mortgage Loans',
        LIQ: 'Liquid Loans',
        OTH_RET: 'Other Retail',
        OTHRET: 'Other Retail',
        MSME: 'Core MSME',
        MUDRA: 'Mudra',
        CORE_AGRI: 'Core Agri',
        AGRI_JL: 'Agri Jewel Loans',
        GOLD: 'Gold Loan',
        CASH_TOTAL: 'Total Cash on Hand',
        CASH_CRL: 'Cash Retention Limit (CRL)',
        CASH_EXCESS: 'Excess Cash Position',
        CASH_BNA: 'BNA Cash Holding',
        CASH_ATM: 'ATM Cash Balance',
        CASH_BC: 'BC Cash Balance',
        TOTALCASH: 'Total Cash on Hand',
        BNACASH: 'BNA Cash Holding',
        KCC: 'KCC',
        SHG: 'SHG',
        GOV: 'Government Sponsored Advances',
        GOVT_SPON: 'Government Sponsored Advances',
        OTHSCH: 'Other Agriculture Schemes',
        OTH_SCHEMATIC: 'Other Agriculture Schemes',
        NPA: 'Gross NPA',
        GROSS_NPA: 'Gross NPA',
        SMA: 'SMA',
        OVERDUE: 'Overdues',
        RECOVERY: 'Recovery',
        QUALIFIED_SB_OPENINGS: 'Qualified SB Openings',
        TOTAL_SB_OPENINGS: 'Total SB Openings',
        QUALIFIED_CD_OPENINGS: 'Qualified CD Openings',
        TOTAL_CD_OPENINGS: 'Total CD Openings'
    };

    return labels[normalized] || param.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatParameterList(params: string[]): string {
    const labels = Array.from(new Set(params.map(prettifyParameterName))).filter(Boolean);
    if (labels.length === 0) return 'key business parameters';
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function toTitleCase(value: string) {
    return (value || '')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function normalizeMovementKey(value: string) {
    // Preserve % to avoid collision between amount and ratio (e.g. CASA vs CASA%)
    return (value || '').toUpperCase().replace(/[\s_]/g, '');
}

function inferMetricUnit(metricName: string, isRegional: boolean = false) {
    const normalized = (metricName || '').toUpperCase().replace(/[\s_]/g, '');
    if (normalized.includes('PCT') || normalized.includes('RATIO')) return '%';
    if (normalized.includes('OPENINGS')) return 'Accounts';
    
    // PER USER DIRECTIVE: Regional Office (3933) is Cr, all others are Lakhs for all parameters.
    return isRegional ? 'Cr' : 'Lakhs';
}

function buildMetricHighlights(items: PerformanceStat[]): string {
    const standout = items
        .slice()
        .sort((a, b) => Math.abs(Number(b.gap || 0)) - Math.abs(Number(a.gap || 0)))
        .slice(0, 2)
        .map((item) => {
            const gap = Math.abs(Number(item.gap || 0)).toLocaleString('en-IN', {
                minimumFractionDigits: item.unit === 'Accounts' ? 0 : 2,
                maximumFractionDigits: item.unit === 'Accounts' ? 0 : 2
            });
            const valueLabel = item.unit === 'Accounts' ? `${gap} ${item.unit}` : `Rs. ${gap} ${item.unit}`;
            return `${item.displayName} (variance of ${valueLabel})`;
        });

    if (standout.length === 0) return '';
    if (standout.length === 1) return standout[0];
    return `${standout[0]} and ${standout[1]}`;
}

function buildAppreciationContent(
    branchName: string,
    headDesignation: string,
    bucketLabel: string,
    params: string[],
    period: string,
    highlights: PerformanceStat[] = [],
    salutation: string = 'Dear Sir/Madam,'
): string {
    const paramList = formatParameterList(params);
    const summary = buildMetricHighlights(highlights);

    return `${salutation}

The performance of ${branchName} Branch under ${bucketLabel} for the review period ${period} has been examined, and we are pleased to place on record our appreciation for the results delivered under your leadership as ${headDesignation}.

Your branch has registered commendable performance across ${paramList}${summary ? `, with particularly notable contribution in ${summary}` : ''}. The comparative position against the benchmark and the financial year opening baseline is furnished below for ready reference.

[PERFORMANCE_TABLE]

The above outcome reflects focused monitoring, timely follow-up, and committed effort by the branch team. Please convey our appreciation to all officials and staff who contributed to this performance.

You are requested to sustain the same momentum in the coming review periods and continue to consolidate the gains already achieved.

With Compliments,`;
}

function buildExplanationContent(
    branchName: string,
    headDesignation: string,
    bucketLabel: string,
    params: string[],
    period: string,
    concerns: PerformanceStat[] = [],
    salutation: string = 'Dear Sir/Madam,'
): string {
    const paramList = formatParameterList(params);
    const summary = buildMetricHighlights(concerns);

    return `${salutation}

The performance of ${branchName} Branch under ${bucketLabel} for the review period ${period} has been reviewed, and it is observed that the branch is lagging behind the expected benchmark in ${paramList}${summary ? `, with visible pressure in ${summary}` : ''}.

The comparative position of actuals, benchmark, and financial year opening levels is reproduced below for immediate analysis and corrective action.

[PERFORMANCE_TABLE]

The present level of achievement is not commensurate with the potential of the branch and calls for close managerial attention. As ${headDesignation}, you are requested to examine the reasons for the shortfall parameter-wise and identify business sourcing gaps, recovery constraints, monitoring lapses, and remedial measures required.

You may submit a concise and time-bound action plan to our office within 7 working days, indicating branch-level responsibility, review milestones, and the likely timeline for closing the gaps.

This matter may be accorded top priority and monitored personally until measurable improvement becomes visible in the subsequent review cycle.

With Compliments,`;
}

function buildOpRiskContent(branchName: string, designation: string, period: string, count: number, movements: any[], salutation: string = 'Dear Sir/Madam,') {
    let content = `${salutation}\n\n`;
    content += `Based on our daily operational risk monitoring for the period ended ${period}, we have identified ${count} significant exceptions for your branch requiring immediate attention and mitigation.\n\n`;

    // Cash Summary Text Generation (Hardened)
    const movementsLower = movements.map(m => ({ ...m, k: (m.metricKey || '').toLowerCase().replace(/_/g, '') }));
    const cashTotal = movementsLower.find(m => m.k === 'totalcash' || m.k === 'cashpossession');
    const cashCRL = movementsLower.find(m => m.k === 'crl' || m.k === 'cashlimit');
    const cashHand = movementsLower.find(m => m.k === 'cashhand' || m.k === 'cashonhand');
    const cashATM = movementsLower.find(m => m.k === 'atmcash');
    const cashBC = movementsLower.find(m => m.k === 'bccash');
    const cashBNA = movementsLower.find(m => m.k === 'bnacash');
    
    const fmt = (n: number) => (Number(n) * 100).toFixed(2);

    if (cashTotal || cashCRL || cashATM || cashBC || cashBNA) {
        const excessAmt = (Number(cashTotal?.latestValue || 0) - Number(cashCRL?.latestValue || 0));
        const excessStatus = excessAmt >= 0 ? 'Excess' : 'Shortfall';

        content += `<p style="margin-bottom: 4px; font-weight: 700; color: #21357f;">The current cash management position of the branch is summarized below:</p>
<table style="width: 100%; border-collapse: collapse; font-size: 13.5px; line-height: 1.3; margin-bottom: 15px;">
    <tr style="background: #f1f5f9; font-weight: 700; color: #1e293b;">
        <th style="border: 1px solid #cbd5e1; padding: 6px 12px; text-align: left;">CASH MANAGEMENT SUMMARY</th>
        <th style="border: 1px solid #cbd5e1; padding: 6px 12px; text-align: right;">POSSESSION (₹ L)</th>
    </tr>
    <tr>
        <td style="border: 1px solid #cbd5e1; padding: 4px 12px; font-weight: 600;">Authorized Cash Retention Limit (CRL)</td>
        <td style="border: 1px solid #cbd5e1; padding: 4px 12px; text-align: right; font-weight: 700;">${fmt(cashCRL?.latestValue || 0)}</td>
    </tr>
    <tr style="background: #f8fafc;">
        <td style="border: 1px solid #cbd5e1; padding: 4px 12px; font-weight: 700;">TOTAL CASH POSSESSION (A+B+C+D)</td>
        <td style="border: 1px solid #cbd5e1; padding: 4px 12px; text-align: right; font-weight: 800;">${fmt(cashTotal?.latestValue || 0)}</td>
    </tr>
    <tr>
        <td style="border: 1px solid #cbd5e1; padding: 2px 12px 2px 30px; color: #475569;">(A) Cash on Hand (Branch)</td>
        <td style="border: 1px solid #cbd5e1; padding: 2px 12px; text-align: right; color: #475569;">${fmt(cashHand?.latestValue || 0)}</td>
    </tr>
    <tr>
        <td style="border: 1px solid #cbd5e1; padding: 2px 12px 2px 30px; color: #475569;">(B) ATM Cash</td>
        <td style="border: 1px solid #cbd5e1; padding: 2px 12px; text-align: right; color: #475569;">${fmt(cashATM?.latestValue || 0)}</td>
    </tr>
    <tr>
        <td style="border: 1px solid #cbd5e1; padding: 2px 12px 2px 30px; color: #475569;">(C) Cash with BC</td>
        <td style="border: 1px solid #cbd5e1; padding: 2px 12px; text-align: right; color: #475569;">${fmt(cashBC?.latestValue || 0)}</td>
    </tr>
    <tr>
        <td style="border: 1px solid #cbd5e1; padding: 2px 12px 2px 30px; color: #475569;">(D) BNA Cash</td>
        <td style="border: 1px solid #cbd5e1; padding: 2px 12px; text-align: right; color: #475569;">${fmt(cashBNA?.latestValue || 0)}</td>
    </tr>
    <tr style="background: ${excessAmt > 0.01 ? '#fff1f2' : '#f0fdf4'};">
        <td style="border: 1px solid #cbd5e1; padding: 6px 12px; font-weight: 700; color: ${excessAmt > 0.01 ? '#9f1239' : '#166534'};">
            ${excessStatus.toUpperCase()} OVER AUTHORIZED CRL
        </td>
        <td style="border: 1px solid #cbd5e1; padding: 6px 12px; text-align: right; font-weight: 800; color: ${excessAmt > 0.01 ? '#9f1239' : '#166534'};">
            ${fmt(Math.abs(excessAmt))}
        </td>
    </tr>
</table>
Effective monitoring of cash holdings within authorized limits across all points (Branch/ATM/BC) is crucial for both security and optimal liquidity management.\n\n`;
    }

    content += `In addition, a review of the recent business movement of the branch indicates the following trend position which should be monitored to ensure consistency and stability in business growth:\n\n[MOVEMENT_TABLE]\n\n`;
    content += `The above exceptions require immediate verification at the branch level. You are advised to review the root cause of each observation, complete the necessary control rectification, and strengthen branch-level monitoring so that recurrence is avoided.\n\n`;
    content += `As Branch Head, you may ensure that the observations are diarised, tracked to closure, and discussed with the concerned officials. This communication is issued for your information and corrective action.\n\nWith Compliments,`;
    
    return content;
}



function extractBucketCodeFromOrgMeta(orgMeta: unknown): string | undefined {
    if (!orgMeta || typeof orgMeta !== 'object' || Array.isArray(orgMeta)) return undefined;
    const raw = (orgMeta as Record<string, unknown>).performanceCategoryCode;
    return typeof raw === 'string' ? raw : undefined;
}

function sentKey(branchId: string, bucketCode: string, type: LetterKind) {
    return `${branchId}::${bucketCode}::${type}`;
}

function createPerformanceStat(
    metricName: string,
    actual: number,
    benchmark: number,
    baseline: number,
    latestDate: Date,
    baselineDate: Date,
    context: BucketContext,
    isRegional: boolean,
    exceptions: PerformanceStat['exceptions'] = []
): PerformanceStat {
    const isInverted = ['NPA', 'SMA', 'OVERDUE'].some((k) => normalizeMetricName(metricName).includes(k));
    const unit = inferMetricUnit(metricName, isRegional);
    const isCurrency = unit === 'Cr' || unit === 'Lakhs';
    
    // Standard Scaling: 
    // Per user, branch data is already in Lakhs (Scale 1).
    // However, if we detect data that was ingested in Crores (like 15.01 for Total Business),
    // we must normalize it to Lakhs (Scale 100) to keep the report consistent.
    const needsScaling = !isRegional && isCurrency && Math.abs(actual) < 25 && Math.abs(benchmark) < 25;
    const scale = needsScaling ? 100 : 1;

    return {
        parameter: metricName,
        displayName: prettifyParameterName(metricName),
        latest: actual * scale,
        budget: benchmark * scale,
        march31st: baseline * scale,
        latestDate,
        march31stDate: baselineDate,
        gap: (actual - benchmark) * scale,
        unit: unit,
        isInverted,
        achievement: achievementPct(actual, benchmark, isInverted),
        branchCode: context.branchCode,
        branchName: context.branchName,
        branchType: context.branchType,
        headDesignation: context.headDesignation,
        headDept: context.headDept,
        exceptions
    };
}

async function getDailyMovement(branchId: string, referenceDate: Date) {
    const params = [
        { code: 'SB_DEPOSITS', mis: ['SB', 'SB_DEPOSITS'], name: 'SB', shortName: 'SB', thresholdPct: 10, category: 'KBP' },
        { code: 'CD_DEPOSITS', mis: ['CD', 'CD_DEPOSITS'], name: 'CD', shortName: 'CD', thresholdPct: 20, category: 'KBP' },
        { code: 'CASA', mis: ['CASA'], name: 'CASA (SB+CD)', shortName: 'CASA', thresholdPct: 10, category: 'KBP' },
        { code: 'RET_TD', mis: ['RET_TD', 'RTDS', 'RTD', 'Ret_TD', 'Retail TD'], name: 'Retail TD', shortName: 'RetTD', thresholdPct: 10, category: 'KBP' },
        { code: 'BULK_DEPOSIT', mis: ['BULK_DEP', 'BULK_DEPOSITS', 'Bulk Deposits'], name: 'Bulk Deposits', shortName: 'BulkDep', thresholdPct: 15, category: 'KBP' },
        { code: 'TD_DEPOSITS', mis: ['TD', 'TD_DEPOSITS', 'Term Deposits'], name: 'TD', shortName: 'TD', thresholdPct: 10, category: 'KBP' },
        { code: 'TOTAL_DEPOSITS', mis: ['Total Dep', 'DEPOSIT_TOTAL', 'TOTAL_DEPOSITS', 'Deposits'], name: 'Total Dep (CASA + TD)', shortName: 'TotDep', thresholdPct: 5, category: 'KBP' },
        { code: 'ADV', mis: ['ADV', 'TOTAL_ADVANCES', 'Adv', 'ADVANCES', 'Advance', 'Total Adv'], name: 'ADV', shortName: 'Adv', thresholdPct: 5, category: 'KBP' },
        { code: 'BUSINESS_TOTAL', mis: ['Bus', 'BUSINESS_TOTAL', 'TOTAL_BUSINESS', 'Business'], name: 'Business (Tot Dep + Adv)', shortName: 'Business', thresholdPct: 5, category: 'KBP' },
        { code: 'BRANCH_PL', mis: ['BRANCH_PL', 'PROFIT', 'Profit', 'NET_PROFIT', 'PL'], name: 'Operating Profit (Loss)', shortName: 'Profit', thresholdPct: 10, category: 'PROFITABILITY' },
        { code: 'CORE_RETAIL', mis: ['Core Ret', 'CORE_RETAIL', 'RETAIL'], name: 'Retail', shortName: 'Retail', thresholdPct: 5, category: 'CORE' },
        { code: 'MSME', mis: ['MSME', 'CORE_MSME'], name: 'MSME', shortName: 'MSME', thresholdPct: 5, category: 'CORE' },
        { code: 'CORE_AGRI', mis: ['Core Agri', 'CORE_AGRI', 'AGRI'], name: 'Agri', shortName: 'Agri', thresholdPct: 5, category: 'CORE' },
        { code: 'GOLD', mis: ['Gold', 'GOLD', 'Gold Adv'], name: 'Gold', shortName: 'Gold', thresholdPct: 5, category: 'CORE' },
        { code: 'CASH_HAND', mis: ['CASH_HAND', 'Cash on Hand', 'CASHONHAND', 'CASHONH'], name: 'Cash on Hand', shortName: 'CashHand', thresholdPct: 10, category: 'CASH' },
        { code: 'CASH_TOTAL', mis: ['CASH_TOTAL', 'Cash_Total', 'Total Cash', 'CASH', 'Cash Possession', 'Cash Balance', 'Total_Cash'], name: 'Cash Possession (Total)', shortName: 'TotalCash', thresholdPct: 20, category: 'CASH' },
        { code: 'CASH_CRL', mis: ['CASH_CRL', 'Cash_CRL', 'CRL', 'Retention Limit', 'Retention', 'Cash Required Level', 'AuthCash'], name: 'Authorized CRL', shortName: 'CRL', thresholdPct: 10, category: 'CASH' },
        { code: 'CASH_ATM', mis: ['CASH_ATM', 'ATM Cash', 'ATM_CASH', 'ATMCASH'], name: 'ATM Cash', shortName: 'ATMCash', thresholdPct: 10, category: 'CASH' },
        { code: 'CASH_BC', mis: ['CASH_BC', 'Cash with BC', 'BC Cash', 'BCCASH'], name: 'Cash with BC', shortName: 'BCCash', thresholdPct: 10, category: 'CASH' },
        { code: 'CASH_BNA', mis: ['CASH_BNA', 'BNA Cash', 'BNA_CASH', 'BNACASH'], name: 'BNA Cash', shortName: 'BNACash', thresholdPct: 10, category: 'CASH' },
        { code: 'CASH_EXCESS', mis: ['CASH_EXCESS', 'Cash_Excess', 'Excess', 'Excess Cash', 'EXCESS'], name: 'Excess / (Shortfall)', shortName: 'ExcessCash', thresholdPct: 20, category: 'CASH' },
        { code: 'GROSS_NPA', mis: ['GROSS_NPA', 'NPA', 'Npa', 'Gross NPA', 'GNPA'], name: 'NPA', shortName: 'NPA', thresholdPct: 5, category: 'ASSET_QUALITY' },
        { code: 'CD_RATIO', mis: ['CD_RATIO', 'CD_Ratio', 'CD Ratio'], name: 'CD Ratio', shortName: 'CDRatio', thresholdPct: 1, category: 'DEPOSITS' }
    ];

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) return { movements: [], compareDates: { latest: referenceDate, yesterday: referenceDate } };
    
    const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(branch.type?.toUpperCase() || '') || branch.code === '3933';

    // 1. DYNAMIC DATE DETECTION: Use the latest date that actually has MIS data.
    const requestedUTC = toUTCDate(referenceDate);
    const latestFacts = await prisma.fact.findMany({
        where: { unitId: branchId, date: { lte: requestedUTC } },
        distinct: ['date'],
        orderBy: { date: 'desc' },
        take: 1,
        select: { date: true }
    });
    const latestSnapshots = await (prisma as any).misSnapshot.findMany({
        where: { unitId: branchId, businessDate: { lte: requestedUTC } },
        orderBy: { businessDate: 'desc' },
        take: 5,
        include: { panelData: true }
    });
    const latestPanelSnapshot = latestSnapshots.find((snapshot: any) =>
        (snapshot.panelData || []).some((panel: any) =>
            Number(panel.val_current || 0) !== 0 ||
            Number(panel.val_y_eod || 0) !== 0 ||
            Number(panel.growth_day || 0) !== 0
        )
    );
    const latestDateCandidates = [
        latestFacts[0]?.date,
        latestPanelSnapshot?.businessDate
    ].filter(Boolean).map((date: Date) => toUTCDate(date));
    const refUTC = latestDateCandidates.length > 0
        ? latestDateCandidates.sort((a: Date, b: Date) => b.getTime() - a.getTime())[0]
        : requestedUTC;

    const availableDates = await prisma.fact.findMany({
        where: { unitId: branchId, date: { lt: refUTC } },
        distinct: ['date'],
        orderBy: { date: 'desc' },
        take: 1
    });

    const yesterdayDate = availableDates[0]?.date || new Date(refUTC.getTime() - 86400000);
    const yestUTC = toUTCDate(yesterdayDate);

    // 2. Fetch Panel Data (Primary Source)
    const startOfRef = new Date(refUTC);
    const endOfRef = new Date(refUTC); endOfRef.setHours(23, 59, 59, 999);
    
    const panelMetrics = await (prisma as any).misInformationPanel.findMany({
        where: {
            snapshot: { 
                unitId: branchId, 
                businessDate: { gte: startOfRef, lte: endOfRef } 
            }
        }
    });
    const panelMap = new Map();
    for (const p of panelMetrics) {
        panelMap.set(normalizeMovementKey(p.parameter), p);
    }

    // 3. Fetch Raw Facts for Fallback/Comparison (Normalized Dates)
    const factMetrics = await prisma.fact.findMany({
        where: { 
            unitId: branchId, 
            date: { in: [refUTC, yestUTC] } 
        }
    });

    const getFact = (metric: string, date: Date) => {
        const dStr = date.toISOString().split('T')[0];
        const metricKey = normalizeMovementKey(metric);
        return factMetrics.find(f => 
            normalizeMovementKey(f.metric) === metricKey && 
            f.date.toISOString().split('T')[0] === dStr
        );
    };

    const movements = [];

    // Base components for math sync
    const getPanelVal = (codes: string[], field: 'val_current' | 'val_y_eod') => {
        const panelScale = isRegional ? 1 : 0.01;
        for (const c of codes) {
            const panel = panelMap.get(normalizeMovementKey(c));
            if (panel) return Number(panel[field] || 0) * panelScale;
        }
        return 0;
    };

    const getVal = (codes: string[], date: Date) => {
        for (const c of codes) {
            const f = getFact(c, date);
            if (f) return Number(f.value);
        }
        if (date.toISOString().split('T')[0] === refUTC.toISOString().split('T')[0]) {
            return getPanelVal(codes, 'val_current');
        }
        if (date.toISOString().split('T')[0] === yestUTC.toISOString().split('T')[0]) {
            return getPanelVal(codes, 'val_y_eod');
        }
        return 0;
    };

    const lSB = getVal(['SB', 'SB_DEPOSITS'], refUTC);
    const lCD = getVal(['CD', 'CD_DEPOSITS'], refUTC);
    const lTD = getVal(['TD', 'TD_DEPOSITS'], refUTC);
    const lAdv = getVal(['ADV', 'TOTAL_ADVANCES', 'ADVANCES', 'Adv', 'Total Adv'], refUTC);
    const lAgri = getVal(['CORE_AGRI'], refUTC) + getVal(['AGRI_JL'], refUTC);
    const lGold = getVal(['GOLD', 'Ret-Gold', 'Gold', 'Adv-Gold'], refUTC);
    const lCRL = getVal(['CASH_CRL', 'CRL'], refUTC);
    const lHand = getVal(['CASH_HAND'], refUTC);
    const lATM = getVal(['CASH_ATM'], refUTC);
    const lBC = getVal(['CASH_BC'], refUTC);
    const lBNA = getVal(['CASH_BNA'], refUTC);

    const ySB = getVal(['SB', 'SB_DEPOSITS'], yestUTC);
    const yCD = getVal(['CD', 'CD_DEPOSITS'], yestUTC);
    const yTD = getVal(['TD', 'TD_DEPOSITS'], yestUTC);
    const yAdv = getVal(['ADV', 'TOTAL_ADVANCES', 'ADVANCES', 'Adv', 'Total Adv'], yestUTC);
    const yAgri = getVal(['CORE_AGRI'], yestUTC) + getVal(['AGRI_JL'], yestUTC);
    const yGold = getVal(['GOLD', 'Ret-Gold', 'Gold', 'Adv-Gold'], yestUTC);

    for (const p of params) {
        let latest = 0, previous = 0, movement = 0, pct = 0;
        let dataFound = false;

        // Try Panel Data first
        const searchTags = [...(Array.isArray(p.mis) ? p.mis : [p.mis]), p.code, p.shortName];
        for (const tag of searchTags) {
            const key = normalizeMovementKey(tag);
            if (panelMap.has(key)) {
                const mis = panelMap.get(key);
                const panelScale = isRegional ? 1 : 0.01;
                latest = parseFloat(mis.val_current || '0') * panelScale;
                movement = parseFloat(mis.growth_day || '0') * panelScale;
                previous = latest - movement;
                dataFound = true;
                break;
            }
        }

        // MATH SYNC OVERRIDE for consistency.
        const hasLatestComponents = (lSB + lCD + lTD + lAdv) !== 0;
        const hasPreviousComponents = (ySB + yCD + yTD + yAdv) !== 0;

        if (p.code === 'CASA' && (lSB + lCD !== 0 || ySB + yCD !== 0)) {
            const currentCASA = lSB + lCD;
            const prevCASA = ySB + yCD;
            // Only override if the panel data looks like a ratio or is missing
            if (!dataFound || latest < 100) { 
                latest = currentCASA;
                previous = prevCASA;
                movement = latest - previous;
                dataFound = true;
            }
        } else if (p.code === 'TOTAL_DEPOSITS' && (lSB + lCD + lTD !== 0 || ySB + yCD + yTD !== 0)) {
            latest = lSB + lCD + lTD;
            previous = ySB + yCD + yTD;
            movement = latest - previous;
            dataFound = true;
        } else if (p.code === 'BUSINESS_TOTAL' && (hasLatestComponents || hasPreviousComponents)) {
            latest = (lSB + lCD + lTD) + lAdv;
            previous = (ySB + yCD + yTD) + yAdv;
            movement = latest - previous;
            dataFound = true;
        } else if (p.code === 'CORE_AGRI' && (lAgri !== 0 || yAgri !== 0)) {
            latest = lAgri;
            previous = yAgri;
            movement = latest - previous;
            dataFound = true;
        } else if (p.code === 'GOLD' && (lGold !== 0 || yGold !== 0)) {
            latest = lGold;
            previous = yGold;
            movement = latest - previous;
            dataFound = true;
        } else if (p.code === 'ADV' && (lAdv !== 0 || yAdv !== 0)) {
            latest = lAdv;
            previous = yAdv;
            movement = latest - previous;
            dataFound = true;
        } else if (p.code === 'RET_TD') {
            const currentRetTD = getVal(['RET_TD', 'Ret_TD', 'RET_TD'], refUTC);
            const prevRetTD = getVal(['RET_TD', 'Ret_TD', 'RET_TD'], yestUTC);
            if (currentRetTD !== 0 || prevRetTD !== 0) {
                latest = currentRetTD;
                previous = prevRetTD;
                movement = latest - previous;
                dataFound = true;
            }
        } else if (p.code === 'CD_RATIO' && hasLatestComponents) {
                const lDep = lSB + lCD + lTD;
                const yDep = ySB + yCD + yTD;
                latest = lDep > 0 ? (lAdv / lDep) * 100 : 0;
                previous = yDep > 0 ? (yAdv / yDep) * 100 : latest;
                movement = latest - previous;
                dataFound = true;
            } else if (p.category === 'CASH') {
                const totalPossession = lHand + lATM + lBC + lBNA;
                if (p.code === 'CASH_TOTAL' && (totalPossession !== 0 || lCRL !== 0)) { latest = totalPossession; previous = 0; }
                else if (p.code === 'CASH_CRL' && lCRL !== 0) { latest = lCRL; previous = 0; }
                else if (p.code === 'CASH_EXCESS' && (totalPossession !== 0 || lCRL !== 0)) { latest = totalPossession - lCRL; previous = 0; }
                else {
                    latest = getVal(Array.isArray(p.mis) ? p.mis : [p.mis], refUTC);
                    previous = 0;
                }
                movement = latest - previous;
                dataFound = latest !== 0 || previous !== 0;
            }

        if (!dataFound) {
            // Raw Fact Fallback
            const aliases = [...(Array.isArray(p.mis) ? p.mis : [p.mis]), p.code];
            const fRef = aliases.map(alias => getFact(alias, refUTC)).find(Boolean);
            if (fRef) {
                const panelScale = isRegional ? 1 : 0.01;
                latest = Number(fRef.value) * panelScale;
                const fPrev = aliases.map(alias => getFact(alias, yestUTC)).find(Boolean);
                previous = fPrev ? Number(fPrev.value) * panelScale : latest;
                movement = latest - previous;
                dataFound = true;
            }
        }

        if (dataFound) {
            pct = previous !== 0 ? (movement / previous) * 100 : 0;
            movements.push({
                metricKey: p.shortName,
                parameter: p.name,
                previousValue: previous,
                latestValue: latest,
                movement,
                pct,
                thresholdPct: p.thresholdPct,
                breached: p.category === 'CASH' 
                    ? (p.code === 'CASH_EXCESS' ? latest > 0.01 : false)
                    : (p.code === 'CD_RATIO' ? latest > 75 : (Math.abs(pct) > p.thresholdPct || (p.code === 'BRANCH_PL' && latest < 0))),
                category: p.category
            });
        }
    }

    return {
        movements,
        compareDates: {
            latest: refUTC,
            yesterday: yestUTC
        }
    };
}

async function buildPerformanceBucketsForDate(period: string, businessDate: Date) {
    void period;
    const rawAliases = PERFORMANCE_BUCKETS.flatMap((bucket) => bucket.metricAliases).filter(Boolean);
    const categoryAliases = Array.from(
        new Set([...rawAliases, ...rawAliases.map((a) => a.toUpperCase()), ...rawAliases.map((a) => a.toLowerCase())])
    );

    const panels = await (prisma as any).misInformationPanel.findMany({
        where: {
            parameter: { in: categoryAliases },
            snapshot: {
                businessDate,
                status: { in: ['FINAL', 'PROVISIONAL'] },
                branch: { type: { not: 'REGIONAL OFFICE' } }
            }
        },
        include: {
            snapshot: {
                include: {
                    exceptions: true,
                    branch: {
                        include: {
                            headUser: { include: { designation: true, department: true } }
                        }
                    }
                }
            }
        }
    });

    const bucketMap = new Map<string, BucketRecord>();
    const fyStartDate = new Date(businessDate.getMonth() < 3 ? businessDate.getFullYear() - 1 : businessDate.getFullYear(), 2, 31);

    for (const panel of panels) {
        const bucket = getBucketByMetric(panel.parameter);
        if (!bucket) continue;

        const branch = panel.snapshot.branch;
        const context: BucketContext = {
            branchCode: branch?.code || panel.snapshot.unitId,
            branchName: toTitleCase(branch?.nameEn || 'Branch'),
            branchType: branch?.type || '',
            headDesignation: toTitleCase(branch?.headUser?.designation?.nameEn || 'Branch Head'),
            headDept: branch?.headUser?.department?.nameEn || 'PLNG',
            headGender: branch?.headUser?.gender
        };

        const stat = createPerformanceStat(
            panel.parameter,
            Number(panel.val_current || 0),
            Number(panel.budget_month || 0),
            Number(panel.val_fy_start || 0),
            panel.snapshot.businessDate,
            fyStartDate,
            context,
            ['RO', 'LPC', 'REGIONAL OFFICE'].includes(branch?.type?.toUpperCase() || ''),
            (panel.snapshot.exceptions || [])
                .filter((e: any) => !(e.ruleId === 'RULE-LIQ-01' || (e.ruleId === 'RULE-OP-RISK' && ['CASA%', 'CD_Ratio'].includes(e.parameter))))
                .map((e: any) => ({
                    ruleId: e.ruleId,
                    parameter: e.parameter,
                    severity: e.severity,
                    message: e.message
                }))
        );

        const key = `${panel.snapshot.unitId}::${bucket.code}`;
        const existing = bucketMap.get(key);
        if (existing) {
            existing.stats.push(stat);
        } else {
            bucketMap.set(key, {
                bucketCode: bucket.code,
                bucketLabel: bucket.label,
                context,
                stats: [stat]
            });
        }
    }

    for (const record of bucketMap.values()) {
        if (record.bucketCode === 'CORE_AGRI') {
            const agriAliases = ['Gov', 'OthSch', 'Agri_JL', 'KCC', 'SHG', 'Core_Agri'];
            const missingAliases = agriAliases.filter(
                (alias) => !record.stats.some((s) => normalizeMetricName(s.parameter) === normalizeMetricName(alias))
            );

            if (missingAliases.length > 0) {
                const snapshot = await prisma.misSnapshot.findFirst({
                    where: { businessDate, unitId: record.stats[0]?.branchCode || record.context.branchCode },
                    select: { id: true }
                });

                if (snapshot) {
                    for (const alias of missingAliases) {
                        const fact = await prisma.fact.findFirst({
                            where: {
                                metric: { equals: alias, mode: 'insensitive' },
                                date: businessDate,
                                unitId: record.stats[0]?.branchCode || record.context.branchCode
                            }
                        });

                        if (fact && Number(fact.value) !== 0) {
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const periodKey = `${months[businessDate.getUTCMonth()]}-${businessDate.getUTCFullYear().toString().slice(-2)}`;

                            const budget = await prisma.budgetMaster.findFirst({
                                where: {
                                    solId: record.context.branchCode,
                                    parameterName: { equals: alias, mode: 'insensitive' },
                                    periodKey: periodKey,
                                    isActive: true
                                }
                            });

                            const baseline = await prisma.fact.findFirst({
                                where: {
                                    metric: { equals: alias, mode: 'insensitive' },
                                    date: fyStartDate,
                                    unitId: record.stats[0]?.branchCode || record.context.branchCode
                                }
                            });

                            record.stats.push(
                                createPerformanceStat(
                                    alias,
                                    Number(fact.value),
                                    Number(budget?.targetValue || 0),
                                    Number(baseline?.value || 0),
                                    businessDate,
                                    fyStartDate,
                                    record.context,
                                    ['RO', 'LPC', 'REGIONAL OFFICE'].includes(record.context.branchType?.toUpperCase() || '')
                                )
                            );
                        }
                    }
                }
            }
        }
    }

    for (const accountBucket of await buildAccountOpeningBuckets(businessDate)) {
        const branch = await prisma.branch.findUnique({
            where: { code: accountBucket.context.branchCode },
            select: { id: true }
        });
        if (!branch?.id) continue;
        bucketMap.set(`${branch.id}::${accountBucket.bucketCode}`, accountBucket);
    }

    return Array.from(bucketMap.values()).filter((record) => record.stats.length > 0);
}
 
async function buildAccountOpeningBuckets(businessDate: Date): Promise<BucketRecord[]> {
    const monthStart = startOfMonth(businessDate);
    const lastMonthDate = subMonths(businessDate, 1);
    const lastMonthStart = startOfMonth(lastMonthDate);
    const lastMonthEnd = endOfMonth(lastMonthDate);

    const getFactAggs = async (dateRange: any, metrics: string[]) => {
        return prisma.fact.groupBy({
            by: ['unitId', 'metric'],
            where: { date: dateRange, metric: { in: metrics } },
            _sum: { value: true }
        });
    };
 
    const sbMetrics = ['PLAN_SB_OPEN', 'PLAN_SB_QUAL'];
    const cdMetrics = ['PLAN_CD_OPEN', 'PLAN_CD_QUAL'];
 
    const [currentSb, previousSb, currentCd, previousCd, currentWorkingDays, previousWorkingDays, branches] = await Promise.all([
        getFactAggs({ gte: monthStart, lte: businessDate }, sbMetrics),
        getFactAggs({ gte: lastMonthStart, lte: lastMonthEnd }, sbMetrics),
        getFactAggs({ gte: monthStart, lte: businessDate }, cdMetrics),
        getFactAggs({ gte: lastMonthStart, lte: lastMonthEnd }, cdMetrics),
        prisma.calendarMaster.count({
            where: { calDate: { gte: monthStart, lte: businessDate }, isWorkingDay: true }
        }),
        prisma.calendarMaster.count({
            where: { calDate: { gte: lastMonthStart, lte: lastMonthEnd }, isWorkingDay: true }
        }),
        prisma.branch.findMany({
            where: { type: { not: 'REGIONAL OFFICE' } },
            include: { headUser: { include: { designation: true, department: true } } }
        })
    ]);
 
    const buildMap = (data: any[], type: 'SB' | 'CD') => {
        const map = new Map<string, any>();
        data.forEach(f => {
            if (!map.has(f.unitId)) map.set(f.unitId, { _sum: { netOpened: 0, qualified: 0 } });
            const entry = map.get(f.unitId);
            if (f.metric.includes('_OPEN')) entry._sum.netOpened += Number(f._sum.value || 0);
            if (f.metric.includes('_QUAL')) entry._sum.qualified += Number(f._sum.value || 0);
        });
        return map;
    };
 
    const currentSbMap = buildMap(currentSb, 'SB');
    const previousSbMap = buildMap(previousSb, 'SB');
    const currentCdMap = buildMap(currentCd, 'CD');
    const previousCdMap = buildMap(previousCd, 'CD');
    const progressFactor = previousWorkingDays > 0 ? currentWorkingDays / previousWorkingDays : 1;
 
    const results: BucketRecord[] = [];
    for (const branch of branches) {
        const row: AccountOpeningRow = {
            branchId: branch.id,
            branchCode: branch.code,
            branchName: toTitleCase(branch.nameEn),
            branchType: branch.type,
            headDesignation: toTitleCase(branch.headUser?.designation?.nameEn || 'Branch Head'),
            headDept: branch.headUser?.department?.nameEn || 'PLNG',
            sbQualified: Number(currentSbMap.get(branch.id)?._sum.qualified || 0),
            sbTotal: Number(currentSbMap.get(branch.id)?._sum.netOpened || 0),
            cdQualified: Number(currentCdMap.get(branch.id)?._sum.qualified || 0),
            cdTotal: Number(currentCdMap.get(branch.id)?._sum.netOpened || 0),
            benchmarkSbQualified: Number(previousSbMap.get(branch.id)?._sum.qualified || 0) * progressFactor,
            benchmarkSbTotal: Number(previousSbMap.get(branch.id)?._sum.netOpened || 0) * progressFactor,
            benchmarkCdQualified: Number(previousCdMap.get(branch.id)?._sum.qualified || 0) * progressFactor,
            benchmarkCdTotal: Number(previousCdMap.get(branch.id)?._sum.netOpened || 0) * progressFactor
        };

        if (
            row.sbQualified === 0 &&
            row.sbTotal === 0 &&
            row.cdQualified === 0 &&
            row.cdTotal === 0 &&
            row.benchmarkSbQualified === 0 &&
            row.benchmarkSbTotal === 0 &&
            row.benchmarkCdQualified === 0 &&
            row.benchmarkCdTotal === 0
        ) {
            continue;
        }

        const context: BucketContext = {
            branchCode: row.branchCode,
            branchName: row.branchName,
            branchType: row.branchType,
            headDesignation: row.headDesignation,
            headDept: row.headDept,
            headGender: branch.headUser?.gender
        };

        const stats = [
            createPerformanceStat('QUALIFIED_SB_OPENINGS', row.sbQualified, row.benchmarkSbQualified, row.benchmarkSbQualified, businessDate, lastMonthEnd, context, false),
            createPerformanceStat('TOTAL_SB_OPENINGS', row.sbTotal, row.benchmarkSbTotal, row.benchmarkSbTotal, businessDate, lastMonthEnd, context, false),
            createPerformanceStat('QUALIFIED_CD_OPENINGS', row.cdQualified, row.benchmarkCdQualified, row.benchmarkCdQualified, businessDate, lastMonthEnd, context, false),
            createPerformanceStat('TOTAL_CD_OPENINGS', row.cdTotal, row.benchmarkCdTotal, row.benchmarkCdTotal, businessDate, lastMonthEnd, context, false)
        ].filter((stat) => stat.latest > 0 || stat.budget > 0);

        if (stats.length === 0) continue;

        results.push({
            bucketCode: 'ACCOUNT_OPENING',
            bucketLabel: 'Account Opening',
            context,
            stats
        });
    }

    return results;
}

export interface GenerationResult {
    created: number;
    skipped: number;
    details: { branch: string; param: string; type: string; reason: string }[];
}

export async function generateLettersForPeriod(
    period: string,
    options: { date?: string; type?: 'PERFORMANCE' | 'OP_RISK' | 'ALL'; signatoryId?: string } = {}
): Promise<GenerationResult> {
    const { date, type = 'ALL', signatoryId } = options;
    const criteria = await loadCriteria();
    const orgMeta = await getCurrentOrgMeta();
    const result: GenerationResult = { created: 0, skipped: 0, details: [] };

    let resolvedSignatory = null;
    if (signatoryId) {
        resolvedSignatory = await prisma.user.findUnique({
            where: { id: signatoryId },
            include: { designation: true }
        });
    }

    if (!resolvedSignatory && (type === 'OP_RISK' || type === 'ALL')) {
        resolvedSignatory = await prisma.user.findFirst({
            where: { fullNameEn: { contains: 'Annamalai', mode: 'insensitive' } },
            include: { designation: true }
        });
    }

    const signatoryMeta = resolvedSignatory ? {
        signatoryName: resolvedSignatory.fullNameEn,
        signatoryNameHi: resolvedSignatory.fullNameHi || undefined,
        signatoryNameTa: resolvedSignatory.fullNameTa || undefined,
        signingAuthEn: resolvedSignatory.designationEn || (resolvedSignatory as any).designation?.nameEn || 'Regional Manager',
        signingAuthHi: resolvedSignatory.designationHi || (resolvedSignatory as any).designation?.nameHi || undefined,
        signingAuthTa: resolvedSignatory.designationTa || (resolvedSignatory as any).designation?.nameTa || undefined,
    } : {};

    const [y, m, d] = date?.split('-').map(Number) || [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
    const businessDateGlobal = new Date(Date.UTC(y, m - 1, d));

    if (type === 'ALL' || type === 'PERFORMANCE') {
        const businessDate = businessDateGlobal;

        await (prisma as any).letter.deleteMany({
            where: { type: { in: ['APPRECIATION', 'EXPLANATION'] }, status: 'DRAFT', period }
        });

        const existingSent = await (prisma as any).letter.findMany({
            where: { period, status: 'SENT', type: { in: ['APPRECIATION', 'EXPLANATION'] } },
            select: { branchId: true, type: true, orgMeta: true }
        });

        const sentMap = new Set<string>();
        existingSent.forEach((letter: any) => {
            const bucketCode = extractBucketCodeFromOrgMeta(letter.orgMeta) || 'LEGACY';
            sentMap.add(sentKey(letter.branchId, bucketCode, letter.type));
        });

        const bucketRecords = await buildPerformanceBucketsForDate(period, businessDate);

        for (const record of bucketRecords) {
            const branch = await prisma.branch.findUnique({ where: { code: record.context.branchCode }, select: { id: true } });
            if (!branch?.id) {
                result.details.push({
                    branch: record.context.branchCode,
                    param: record.bucketLabel,
                    type: 'PERFORMANCE',
                    reason: 'Branch lookup failed'
                });
                result.skipped++;
                continue;
            }

            const failingStats = record.stats.filter((stat) => stat.achievement < criteria.explanationThreshold);
            const meetingStats = record.stats.filter((stat) => stat.achievement >= criteria.appreciationThreshold);

            let letterKind: LetterKind | null = null;
            let letterStats: PerformanceStat[] = [];

            if (failingStats.length > 0) {
                letterKind = 'EXPLANATION';
                letterStats = failingStats;
            } else if (meetingStats.length > 0) {
                letterKind = 'APPRECIATION';
                letterStats = meetingStats;
            }

            if (!letterKind || letterStats.length === 0) continue;
            if (sentMap.has(sentKey(branch.id, record.bucketCode, letterKind))) {
                result.details.push({
                    branch: record.context.branchCode,
                    param: record.bucketLabel,
                    type: letterKind,
                    reason: 'Sent letter already exists for this period and category'
                });
                result.skipped++;
                continue;
            }

            const salutation = getSalutation({ gender: record.context.headGender });

            try {
                await (prisma as any).letter.create({
                    data: {
                        type: letterKind,
                        titleEn: `${record.bucketLabel} PERFORMANCE ${letterKind === 'APPRECIATION' ? 'APPRECIATION LETTER' : 'EXPLANATION LETTER'} - ${period}`,
                        contentEn: (letterKind === 'APPRECIATION' ? buildAppreciationContent : buildExplanationContent)(
                            record.context.branchName,
                            record.context.headDesignation,
                            record.bucketLabel,
                            letterStats.map((stat) => stat.displayName),
                            period,
                            letterStats,
                            salutation
                        ),
                        branchId: branch.id,
                        period,
                        status: 'DRAFT',
                        salutation,
                        referenceNo: await generateReference('PERFORMANCE_LETTER', record.context.headDept || 'PLNG', businessDate),
                        orgMeta: {
                            ...orgMeta,
                            ...signatoryMeta,
                            businessDate: format(businessDate, 'yyyy-MM-dd'),
                            letterDate: format(businessDate, 'dd.MM.yyyy'),
                            performanceCategoryCode: record.bucketCode,
                            performanceCategoryLabel: record.bucketLabel,
                            performanceDataList: record.stats,
                            exceptions: letterStats.flatMap((stat) => stat.exceptions)
                        }
                    }
                });
                result.created++;
            } catch (err: any) {
                console.error(`Failed to create ${letterKind} letter for branch ${record.context.branchCode} / ${record.bucketCode}:`, err);
                result.details.push({
                    branch: record.context.branchCode,
                    param: record.bucketLabel,
                    type: letterKind,
                    reason: `Creation failed: ${err.message}`
                });
                result.skipped++;
            }
        }
    }

    if ((type === 'ALL' || type === 'OP_RISK') && criteria.opRiskFromExceptions) {
        const businessDate = businessDateGlobal;
        const displayPeriod = date ? `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${String(y)}` : period;

        // --- NEW: Account Opening Analytics for OpRisk ---
        const monthStart = startOfMonth(businessDate);
        const lastMonthStart = startOfMonth(subMonths(businessDate, 1));
        const lastMonthEnd = endOfMonth(subMonths(businessDate, 1));

        const sbMetrics = ['PLAN_SB_OPEN', 'PLAN_SB_QUAL'];
        const cdMetrics = ['PLAN_CD_OPEN', 'PLAN_CD_QUAL'];

        const [currSbAccs, prevSbAccs, currCdAccs, prevCdAccs, currWorkingDays, prevWorkingDays] = await Promise.all([
            prisma.fact.groupBy({ by: ['unitId', 'metric'], where: { date: { gte: monthStart, lte: businessDate }, metric: { in: sbMetrics } }, _sum: { value: true } }),
            prisma.fact.groupBy({ by: ['unitId', 'metric'], where: { date: { gte: lastMonthStart, lte: lastMonthEnd }, metric: { in: sbMetrics } }, _sum: { value: true } }),
            prisma.fact.groupBy({ by: ['unitId', 'metric'], where: { date: { gte: monthStart, lte: businessDate }, metric: { in: cdMetrics } }, _sum: { value: true } }),
            prisma.fact.groupBy({ by: ['unitId', 'metric'], where: { date: { gte: lastMonthStart, lte: lastMonthEnd }, metric: { in: cdMetrics } }, _sum: { value: true } }),
            prisma.calendarMaster.count({ where: { calDate: { gte: monthStart, lte: businessDate }, isWorkingDay: true } }),
            prisma.calendarMaster.count({ where: { calDate: { gte: lastMonthStart, lte: lastMonthEnd }, isWorkingDay: true } })
        ]);

        const progressFactor = prevWorkingDays > 0 ? currWorkingDays / prevWorkingDays : 1;
        const buildAccMap = (data: any[]) => {
            const map = new Map<string, any>();
            data.forEach(f => {
                if (!map.has(f.unitId)) map.set(f.unitId, { total: 0, qualified: 0 });
                const entry = map.get(f.unitId);
                if (f.metric.includes('_OPEN')) entry.total += Number(f._sum.value || 0);
                if (f.metric.includes('_QUAL')) entry.qualified += Number(f._sum.value || 0);
            });
            return map;
        };

        const currSbMap = buildAccMap(currSbAccs);
        const prevSbMap = buildAccMap(prevSbAccs);
        const currCdMap = buildAccMap(currCdAccs);
        const prevCdMap = buildAccMap(prevCdAccs);
        // --- END: Account Opening Analytics ---

        await (prisma as any).letter.deleteMany({ where: { type: 'OP_RISK', status: 'DRAFT' } });

        const existingSentOpRisk = await (prisma as any).letter.findMany({
            where: { type: 'OP_RISK', status: 'SENT', period: displayPeriod },
            select: { branchId: true }
        });
        const sentOpRiskBranches = new Set(existingSentOpRisk.map((l: any) => l.branchId));

        const latestSnapshots = await (prisma as any).misSnapshot.findMany({
            where: {
                businessDate: { lte: businessDate },
                branch: { type: { not: 'REGIONAL OFFICE' } }
            },
            distinct: ['unitId'],
            orderBy: { businessDate: 'desc' },
            select: { unitId: true, businessDate: true }
        });

        const branchDateMap = new Map<string, Date>(
            latestSnapshots.map((s: any) => [s.unitId, s.businessDate])
        );

        const criticalExceptions = await prisma.misException.findMany({
            where: {
                severity: { in: criteria.opRiskSeverities.length > 0 ? criteria.opRiskSeverities : ['CRITICAL', 'HIGH'] },
                status: 'OPEN',
                branch: { type: { not: 'REGIONAL OFFICE' } }
            },
            include: { branch: { include: { headUser: { include: { designation: true, department: true } } } } }
        });

        const byBranch = new Map<string, { branch: any, exceptions: any[] }>();
        criticalExceptions.forEach((ex) => {
            // Only include exceptions from the latest identified business date for THIS specific branch
            const targetDate = branchDateMap.get(ex.unitId);
            if (targetDate && ex.businessDate.getTime() === targetDate.getTime()) {
                const entry = byBranch.get(ex.unitId) || { branch: ex.branch, exceptions: [] };
                entry.exceptions.push(ex);
                byBranch.set(ex.unitId, entry);
            }
        });

        // Ensure branches with available trend data are still processed
        for (const [unitId, latestDate] of branchDateMap.entries()) {
            if (!byBranch.has(unitId as string)) {
                // Fetch the branch details if not already in byBranch
                const b = await prisma.branch.findUnique({
                    where: { id: unitId as string },
                    include: { headUser: { include: { designation: true, department: true } } }
                });
                if (b) byBranch.set(unitId as string, { branch: b, exceptions: [] });
            }
        }

        for (const [unitId, entry] of byBranch) {
            try {
                const { branch, exceptions } = entry;
                const headDesignation = toTitleCase(branch.headUser?.designation?.nameEn || 'Branch Head');

                // UNIFIED FILTER: We keep RULE-OP-RISK, RULE-DAILY-DECLINE, RULE-RISK-01, RULE-LIQ-01, and RULE-CASH-01
                const filteredExceptions = exceptions.filter((e: any) => true);

                const salutation = getSalutation(branch.headUser);

                // DEDUPLICATE by parameter+ruleId+message to ensure count is 1:1 with table rows
                const seen = new Set();
                const uniqueExceptions = filteredExceptions.filter(e => {
                    if (e.dummy) return false;
                    const key = `${e.ruleId}-${e.parameter}-${e.message}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });

                if (sentOpRiskBranches.has(unitId)) {
                    result.details.push({
                        branch: branch.code,
                        param: 'OP_RISK',
                        type: 'OP_RISK',
                        reason: 'Sent letter already exists for this date'
                    });
                    result.skipped++;
                    continue;
                }

                // DELETE EXISTING DRAFT TO ALLOW RE-GENERATION
                await (prisma as any).letter.deleteMany({
                    where: {
                        branchId: unitId,
                        period: displayPeriod,
                        type: 'OP_RISK',
                        status: 'DRAFT'
                    }
                });

                const { movements, compareDates } = await getDailyMovement(unitId, businessDate);
                const snapshot = await BusinessSnapshotService.getSnapshot(branch.code, format(businessDate, 'yyyy-MM-dd'));
                const exceptionsByParameter = new Map<string, any>();
                for (const e of uniqueExceptions.filter(e => !e.dummy)) {
                    const key = normalizeMovementKey(e.parameter || 'N/A');
                    const existing = exceptionsByParameter.get(key);
                    if (existing) {
                        existing.ruleId = Array.from(new Set(`${existing.ruleId}, ${e.ruleId}`.split(',').map((part) => part.trim()).filter(Boolean))).join(', ');
                        existing.message = `${existing.message}<br/>${e.message}`;
                    } else {
                        exceptionsByParameter.set(key, {
                            ruleId: e.ruleId,
                            parameter: e.parameter,
                            message: e.message
                        });
                    }
                }
                const listedExceptions = Array.from(exceptionsByParameter.values());
                const finalCount = movements.filter(m => m.breached).length;

                if (finalCount === 0 && movements.length === 0) continue; // Skip if absolutely no data and no exceptions

                await (prisma as any).letter.create({
                    data: {
                        type: 'OP_RISK',
                        titleEn: `Operational Risk Advisory - ${displayPeriod}`,
                        contentEn: buildOpRiskContent(
                            toTitleCase(branch.nameEn),
                            headDesignation,
                            displayPeriod,
                            finalCount,
                            movements,
                            salutation
                        ),
                        branchId: unitId,
                        period: displayPeriod,
                        status: 'DRAFT',
                        salutation,
                        referenceNo: await generateReference('OP_RISK', branch.headUser?.department?.nameEn || 'PLNG', businessDate),
                        orgMeta: {
                            ...orgMeta,
                            ...signatoryMeta,
                            businessDate: format(businessDate, 'yyyy-MM-dd'),
                            compareDates,
                            letterDate: format(businessDate, 'dd.MM.yyyy'),
                            reportingPeriod: displayPeriod,
                            hideApprovedStatus: true,
                            exceptions: listedExceptions,
                            dailyMovement: movements,
                            cashData: snapshot?.cashData?.length ? snapshot.cashData : deriveCashData(movements),
                            // Injected Account Opening Analytics
                            accountAnalytics: {
                                sb: {
                                    actual: currSbMap.get(unitId)?.qualified || 0,
                                    benchmark: Math.round((prevSbMap.get(unitId)?.qualified || 0) * progressFactor),
                                    total: currSbMap.get(unitId)?.total || 0
                                },
                                cd: {
                                    actual: currCdMap.get(unitId)?.qualified || 0,
                                    benchmark: Math.round((prevCdMap.get(unitId)?.qualified || 0) * progressFactor),
                                    total: currCdMap.get(unitId)?.total || 0
                                }
                            }
                        }
                    }
                });
                result.created++;
            } catch (err: any) {
                console.error(`Failed to generate OP_RISK letter for unit ${unitId}:`, err);
                result.details.push({
                    branch: unitId,
                    param: 'OP_RISK',
                    type: 'OP_RISK',
                    reason: `Failed: ${err.message}`
                });
                result.skipped++;
            }
        }
    }

    return result;
}

function getSalutation(user: any) {
    if (!user) return 'Dear Sir/Madam,';
    if (user.gender === 'F' || user.gender === 'Female') return 'Dear Madam,';
    if (user.gender === 'M' || user.gender === 'Male') return 'Dear Sir,';
    return 'Dear Sir/Madam,';
}

function deriveCashData(movements: any[]) {
    const movementsLower = movements.map(m => ({ ...m, k: (m.metricKey || '').toLowerCase().replace(/_/g, '') }));
    
    const cashCRL = movementsLower.find(m => m.k === 'crl' || m.k === 'cashlimit');
    const cashHand = movementsLower.find(m => m.k === 'cashhand' || m.k === 'cashonhand');
    const cashATM = movementsLower.find(m => m.k === 'atmcash');
    const cashBC = movementsLower.find(m => m.k === 'bccash');
    const cashBNA = movementsLower.find(m => m.k === 'bnacash');
    
    // Total is sum of others as per user instruction: AE = AA + AB + AC + AD
    const totalVal = (Number(cashHand?.latestValue || 0) + Number(cashATM?.latestValue || 0) + Number(cashBC?.latestValue || 0) + Number(cashBNA?.latestValue || 0));
    const crlVal = Number(cashCRL?.latestValue || 0);
    const excessVal = totalVal - crlVal;

    const result = [];
    
    // 1. Authorized CRL (Threshold)
    if (cashCRL) {
        result.push({ 
            parameter: 'CASH_CRL', 
            val_current: crlVal, 
            budget_month: crlVal, 
            metadata: { displayName: 'Authorized CRL (Limit)' } 
        });
    }

    // 2. Cash on Hand (AA)
    if (cashHand) {
        result.push({ 
            parameter: 'CASH_HAND', 
            val_current: cashHand.latestValue, 
            budget_month: 0, 
            metadata: { displayName: 'Cash on Hand (Branch)' } 
        });
    }

    // 3. Total Possession (AE)
    result.push({ 
        parameter: 'CASH_TOTAL', 
        val_current: totalVal, 
        budget_month: crlVal, 
        metadata: { displayName: 'Total Cash Possession' } 
    });

    // 4. Excess (AG)
    result.push({ 
        parameter: 'CASH_EXCESS', 
        val_current: excessVal, 
        budget_month: 0, 
        metadata: { displayName: 'Excess / (Shortfall) over CRL' } 
    });

    if (cashATM) result.push({ parameter: 'CASH_ATM', val_current: cashATM.latestValue, budget_month: 0, metadata: { displayName: 'ATM Cash' } });
    if (cashBC) result.push({ parameter: 'CASH_BC', val_current: cashBC.latestValue, budget_month: 0, metadata: { displayName: 'Cash with BC' } });
    if (cashBNA) result.push({ parameter: 'CASH_BNA', val_current: cashBNA.latestValue, budget_month: 0, metadata: { displayName: 'BNA Cash' } });
    
    return result;
}
