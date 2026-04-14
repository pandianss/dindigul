import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import prisma from '../lib/prisma';
import { getRegionalOfficeData } from './pdfService';
import { generateReference } from './referenceService';
import { BusinessSnapshotService } from './BusinessSnapshotService';

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

function inferMetricUnit(metricName: string) {
    const normalized = normalizeMetricName(metricName);
    if (normalized.includes('PCT') || normalized.includes('RATIO')) return '%';
    if (normalized.includes('OPENINGS')) return 'Accounts';
    return 'Cr';
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

The performance of ${branchName} Branch under ${bucketLabel} for the review period ${period} has been examined at the Regional Office, and we are pleased to place on record our appreciation for the results delivered under your leadership as ${headDesignation}.

Your branch has registered commendable performance across ${paramList}${summary ? `, with particularly notable contribution in ${summary}` : ''}. The comparative position against the benchmark and the financial year opening baseline is furnished below for ready reference.

[PERFORMANCE_TABLE]

The above outcome reflects focused monitoring, timely follow-up, and committed effort by the branch team. Please convey our appreciation to all officials and staff who contributed to this performance.

You are requested to sustain the same momentum in the coming review periods and continue to consolidate the gains already achieved.

With compliments,
Regional Office`;
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

You may submit a concise and time-bound action plan to the Regional Office within 7 working days, indicating branch-level responsibility, review milestones, and the likely timeline for closing the gaps.

This matter may be accorded top priority and monitored personally until measurable improvement becomes visible in the subsequent review cycle.`;
}

function buildOpRiskContent(branchName: string, designation: string, period: string, count: number, movements: any[], salutation: string = 'Dear Sir/Madam,') {
    let content = `To,\nThe Branch Manager / ${designation},\n${branchName}.\n\n`;
    content += `${salutation}\n\n`;
    content += `Sub: Operational Risk Advisory - ${period}\n\n`;
    content += `Based on our daily operational risk monitoring for the period ended ${period}, we have identified ${count} significant exceptions for your branch requiring immediate attention and mitigation.\n\n`;

    // Cash Summary Text Generation
    const cashTotal = movements.find(m => m.metricKey === 'TotalCash');
    const cashCRL = movements.find(m => m.metricKey === 'CRL');
    const cashATM = movements.find(m => m.metricKey === 'ATMCash');
    const cashBC = movements.find(m => m.metricKey === 'BCCash');
    const cashBNA = movements.find(m => m.metricKey === 'BNACash');
    
    const fmt = (n: number) => (Number(n) * 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (cashTotal || cashCRL || cashATM || cashBC || cashBNA) {
        content += `A review of your cash management position indicates `;
        
        const fragments = [];
        if (cashTotal) fragments.push(`Total Cash on Hand (Possession) of ₹ ${fmt(cashTotal.latestValue)} Lakhs`);
        if (cashCRL) fragments.push(`Cash Retention Limit (CRL) of ₹ ${fmt(cashCRL.latestValue)} Lakhs`);
        if (cashATM) fragments.push(`ATM Cash of ₹ ${fmt(cashATM.latestValue)} Lakhs`);
        if (cashBC) fragments.push(`Cash with BC of ₹ ${fmt(cashBC.latestValue)} Lakhs`);
        if (cashBNA) fragments.push(`BNA Cash of ₹ ${fmt(cashBNA.latestValue)} Lakhs`);

        content += fragments.join(', ') + '. ';

        if (cashTotal && cashCRL) {
            const excessVal = (Number(cashTotal.latestValue) - Number(cashCRL.latestValue)) * 100;
            content += `This results in an ${excessVal >= 0 ? 'excess' : 'shortfall'} of ₹ ${Math.abs(excessVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Lakhs against the authorized CRL. `;
        }

        content += `Effective monitoring of cash holdings within authorized limits across all points (Branch/ATM/BC) is crucial for both security and optimal liquidity management.\n\n`;
    }

    content += `In addition, a review of the recent business movement of the branch indicates the following trend position which should be monitored to ensure consistency and stability in business growth:\n\n[MOVEMENT_TABLE]\n\n`;
    content += `The above exceptions require immediate verification at the branch level. You are advised to review the root cause of each observation, complete the necessary control rectification, and strengthen branch-level monitoring so that recurrence is avoided.\n\n`;
    content += `As Branch Head, you may ensure that the observations are diarised, tracked to closure, and discussed with the concerned officials. This communication is issued for your information and corrective action.`;
    
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
    exceptions: PerformanceStat['exceptions'] = []
): PerformanceStat {
    const isInverted = ['NPA', 'SMA', 'OVERDUE'].some((k) => normalizeMetricName(metricName).includes(k));
    return {
        parameter: metricName,
        displayName: prettifyParameterName(metricName),
        latest: actual,
        budget: benchmark,
        march31st: baseline,
        latestDate,
        march31stDate: baselineDate,
        gap: actual - benchmark,
        unit: inferMetricUnit(metricName),
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
        { code: 'SB_DEPOSITS', mis: ['SB', 'SB_DEPOSITS'], name: 'SB', shortName: 'SB', thresholdPct: 10, category: 'DEPOSITS' },
        { code: 'BULK_DEPOSIT', mis: ['BULK_DEP', 'BULK_DEPOSITS'], name: 'Bulk Deposits', shortName: 'BulkDep', thresholdPct: 15, category: 'DEPOSITS' },
        { code: 'RET_TD', mis: ['RET_TD', 'RTDS', 'RTD'], name: 'Retail TD', shortName: 'RetTD', thresholdPct: 10, category: 'DEPOSITS' },
        { code: 'BRANCH_PL', mis: ['BRANCH_PL', 'PROFIT', 'Profit', 'NET_PROFIT', 'PL'], name: 'Operating Profit (Loss)', shortName: 'Profit', thresholdPct: 10, category: 'PROFITABILITY' },
        { code: 'CD_DEPOSITS', mis: ['CD', 'CD_DEPOSITS'], name: 'CD', shortName: 'CD', thresholdPct: 20, category: 'DEPOSITS' },
        { code: 'TD_DEPOSITS', mis: ['TD', 'TD_DEPOSITS'], name: 'TD', shortName: 'TD', thresholdPct: 10, category: 'DEPOSITS' },
        { code: 'TOTAL_ADVANCES', mis: ['Adv', 'TOTAL_ADVANCES', 'ADVANCES'], name: 'Adv', shortName: 'Adv', thresholdPct: 5, category: 'DEPOSITS' },
        { code: 'CORE_RETAIL', mis: ['Core Ret', 'CORE_RETAIL', 'RETAIL'], name: 'Retail', shortName: 'Retail', thresholdPct: 5, category: 'CORE' },
        { code: 'MSME', mis: ['MSME', 'CORE_MSME'], name: 'MSME', shortName: 'MSME', thresholdPct: 5, category: 'CORE' },
        { code: 'CORE_AGRI', mis: ['Core Agri', 'CORE_AGRI', 'AGRI'], name: 'Agri', shortName: 'Agri', thresholdPct: 5, category: 'CORE' },
        { code: 'GOLD', mis: ['Gold', 'GOLD', 'Gold Adv'], name: 'Gold', shortName: 'Gold', thresholdPct: 5, category: 'CORE' },
        { code: 'CASH_TOTAL', mis: ['CASH_TOTAL', 'Cash_Total', 'Total Cash', 'CASH', 'Cash Possession', 'Cash Balance', 'Total_Cash'], name: 'Cash Possession (Total)', shortName: 'TotalCash', thresholdPct: 20, category: 'CASH' },
        { code: 'CASH_CRL', mis: ['CASH_CRL', 'Cash_CRL', 'CRL', 'Retention Limit', 'Retention', 'Cash Required Level', 'AuthCash'], name: 'Authorized CRL', shortName: 'CRL', thresholdPct: 10, category: 'CASH' },
        { code: 'CASH_ATM', mis: ['CASH_ATM', 'ATM Cash', 'ATM_CASH', 'ATMCASH'], name: 'ATM Cash', shortName: 'ATMCash', thresholdPct: 10, category: 'CASH' },
        { code: 'CASH_BC', mis: ['CASH_BC', 'Cash with BC', 'BC Cash', 'BCCASH'], name: 'Cash with BC', shortName: 'BCCash', thresholdPct: 10, category: 'CASH' },
        { code: 'CASH_BNA', mis: ['CASH_BNA', 'BNA Cash', 'BNA_CASH', 'BNACASH'], name: 'BNA Cash', shortName: 'BNACash', thresholdPct: 10, category: 'CASH' },
        { code: 'CASH_EXCESS', mis: ['CASH_EXCESS', 'Cash_Excess', 'Excess', 'Excess Cash', 'EXCESS'], name: 'Excess / (Shortfall)', shortName: 'ExcessCash', thresholdPct: 20, category: 'CASH' },
        { code: 'GROSS_NPA', mis: ['GROSS_NPA', 'NPA', 'Npa', 'Gross NPA', 'GNPA'], name: 'NPA', shortName: 'NPA', thresholdPct: 5, category: 'DEPOSITS' },
        { code: 'CD_RATIO', mis: ['CD_RATIO', 'CD_Ratio', 'CD Ratio'], name: 'CD Ratio', shortName: 'CDRatio', thresholdPct: 1, category: 'DEPOSITS' }
    ];

    const movements = [];

    for (const p of params) {
        let snaps: any[] = [];
        const param = await (prisma as any).parameter.findUnique({ where: { code: p.code } });

        if (param) {
            snaps = await (prisma as any).snapshot.findMany({
                where: { branchId, parameterId: param.id, date: { lte: referenceDate } },
                orderBy: { date: 'desc' },
                take: 2
            });
            if (p.category === 'CASH' && snaps.length < 2) {
                console.log(`[CASH-TRACE] Branch: ${branchId} | Param: ${p.code} | Snapshots found: ${snaps.length}`);
            }
        } else if (p.category === 'CASH') {
             console.log(`[CASH-TRACE] WARNING: Parameter code ${p.code} not found in Parameter table.`);
        }

        if (snaps.length >= 2) {
            const latest = Number(snaps[0].value);
            const previous = Number(snaps[1].value);
            const diff = latest - previous;
            const pct = previous !== 0 ? (diff / previous) * 100 : 0;

            movements.push({
                metricKey: p.shortName,
                parameter: p.name,
                previousValue: previous,
                latestValue: latest,
                movement: diff,
                pct,
                thresholdPct: p.thresholdPct,
                breached: p.code === 'CD_RATIO' ? latest > 85 : Math.abs(pct) > p.thresholdPct,
                category: p.category
            });
        } else {
            const startOfDay = new Date(referenceDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(referenceDate);
            endOfDay.setHours(23, 59, 59, 999);

            const mis = await (prisma as any).misInformationPanel.findFirst({
                where: {
                    snapshot: { 
                        unitId: branchId, 
                        businessDate: { gte: startOfDay, lte: endOfDay } 
                    },
                    parameter: Array.isArray(p.mis) ? { in: p.mis } : p.mis
                }
            });

            if (mis) {
                const latest = parseFloat(mis.val_current || '0');
                const movement = parseFloat(mis.growth_day || '0');
                const previous = latest - movement;
                const pct = previous !== 0 ? (movement / previous) * 100 : 0;

                movements.push({
                    metricKey: p.shortName,
                    parameter: p.name,
                    previousValue: previous,
                    latestValue: latest,
                    movement,
                    pct,
                    thresholdPct: p.thresholdPct,
                    breached: p.code === 'CD_RATIO' ? latest > 85 : Math.abs(pct) > p.thresholdPct,
                    category: p.category
                });
            } else if (p.category === 'CASH') {
                console.log(`[CASH-TRACE] Branch: ${branchId} | No MIS Panel entry found for keys:`, p.mis);
                // LAST RESORT: Search directly in Facts if Panel data is missing for Cash
                const searchKeys = [...(Array.isArray(p.mis) ? p.mis : [p.mis]), p.code, p.shortName];
                const facts = await (prisma as any).fact.findMany({
                    where: {
                        unitId: branchId,
                        metric: { in: searchKeys },
                        date: { gte: startOfDay, lte: endOfDay }
                    },
                    orderBy: { date: 'desc' },
                    take: 1
                });

                if (facts.length > 0) {
                    const latest = Number(facts[0].value);
                    movements.push({
                        metricKey: p.shortName,
                        parameter: p.name,
                        previousValue: latest, // Partial data fallback: use latest as previous to show 0 movement
                        latestValue: latest,
                        movement: 0,
                        pct: 0,
                        thresholdPct: p.thresholdPct,
                        breached: false,
                        category: p.category
                    });
                }
            }
        }
    }

    // DIAGNOSTIC LOGGING: Verify Cash category population
    const cashCount = movements.filter(m => m.category === 'CASH').length;
    console.log(`[REPORT-TRACE] Unit: ${branchId} | Date: ${referenceDate.toISOString()}`);
    console.log(`[REPORT-TRACE] Total movements found: ${movements.length} | Cash movements: ${cashCount}`);
    if (cashCount === 0 && Array.isArray(params)) {
        console.log(`[REPORT-TRACE] WARNING: No Cash data found in Panel or Facts for criteria keys:`, 
            params.filter(p => (p as any).category === 'CASH').map(p => (p as any).code));
    }

    return movements;
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
                                    record.context
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
    const currentMonthKey = format(businessDate, 'yyyy-MM');
    const previousMonthKey = format(lastMonthDate, 'yyyy-MM');

    const [currentSb, previousSb, currentCd, previousCd, currentWorkingDays, previousWorkingDays, branches] = await Promise.all([
        prisma.factSbDailyBranch.groupBy({
            by: ['solId'],
            where: { openDay: { gte: monthStart, lte: businessDate } },
            _sum: { netSbOpened: true, qualifiedCount: true }
        }),
        prisma.factSbDailyBranch.groupBy({
            by: ['solId'],
            where: { openDay: { gte: lastMonthStart, lte: lastMonthEnd } },
            _sum: { netSbOpened: true, qualifiedCount: true }
        }),
        prisma.factCdMonthlyBranch.findMany({
            where: { monthKey: currentMonthKey },
            select: { solId: true, netCdOpened: true, qualifiedCount: true }
        }),
        prisma.factCdMonthlyBranch.findMany({
            where: { monthKey: previousMonthKey },
            select: { solId: true, netCdOpened: true, qualifiedCount: true }
        }),
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

    const currentSbMap = new Map(currentSb.map((row) => [row.solId, row]));
    const previousSbMap = new Map(previousSb.map((row) => [row.solId, row]));
    const currentCdMap = new Map(currentCd.map((row) => [row.solId, row]));
    const previousCdMap = new Map(previousCd.map((row) => [row.solId, row]));
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
            sbQualified: Number(currentSbMap.get(branch.code)?._sum.qualifiedCount || 0),
            sbTotal: Number(currentSbMap.get(branch.code)?._sum.netSbOpened || 0),
            cdQualified: Number(currentCdMap.get(branch.code)?.qualifiedCount || 0),
            cdTotal: Number(currentCdMap.get(branch.code)?.netCdOpened || 0),
            benchmarkSbQualified: Number(previousSbMap.get(branch.code)?._sum.qualifiedCount || 0) * progressFactor,
            benchmarkSbTotal: Number(previousSbMap.get(branch.code)?._sum.netSbOpened || 0) * progressFactor,
            benchmarkCdQualified: Number(previousCdMap.get(branch.code)?.qualifiedCount || 0) * progressFactor,
            benchmarkCdTotal: Number(previousCdMap.get(branch.code)?.netCdOpened || 0) * progressFactor
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
            createPerformanceStat('QUALIFIED_SB_OPENINGS', row.sbQualified, row.benchmarkSbQualified, row.benchmarkSbQualified, businessDate, lastMonthEnd, context),
            createPerformanceStat('TOTAL_SB_OPENINGS', row.sbTotal, row.benchmarkSbTotal, row.benchmarkSbTotal, businessDate, lastMonthEnd, context),
            createPerformanceStat('QUALIFIED_CD_OPENINGS', row.cdQualified, row.benchmarkCdQualified, row.benchmarkCdQualified, businessDate, lastMonthEnd, context),
            createPerformanceStat('TOTAL_CD_OPENINGS', row.cdTotal, row.benchmarkCdTotal, row.benchmarkCdTotal, businessDate, lastMonthEnd, context)
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

    if (type === 'ALL' || type === 'PERFORMANCE') {
        const [y, m, d] = date?.split('-').map(Number) || [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
        const businessDate = new Date(Date.UTC(y, m - 1, d));

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
                        titleEn: `${record.bucketLabel} ${letterKind === 'APPRECIATION' ? 'Performance Appreciation' : 'Performance Review'} - ${period}`,
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
        const [y, m, d] = date?.split('-').map(Number) || [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()];
        const businessDate = new Date(Date.UTC(y, m - 1, d));
        const displayPeriod = date ? `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}` : period;

        await (prisma as any).letter.deleteMany({ where: { type: 'OP_RISK', status: 'DRAFT' } });

        const existingSentOpRisk = await (prisma as any).letter.findMany({
            where: { type: 'OP_RISK', status: 'SENT', period: displayPeriod },
            select: { branchId: true }
        });
        const sentOpRiskBranches = new Set(existingSentOpRisk.map((l: any) => l.branchId));

        const criticalExceptions = await prisma.misException.findMany({
            where: {
                severity: { in: criteria.opRiskSeverities.length > 0 ? criteria.opRiskSeverities : ['CRITICAL', 'HIGH'] },
                status: 'OPEN',
                businessDate: {
                    gte: new Date(businessDate.setUTCHours(0, 0, 0, 0)),
                    lte: new Date(businessDate.setUTCHours(23, 59, 59, 999))
                },
                branch: { type: { not: 'REGIONAL OFFICE' } }
            },
            include: { branch: { include: { headUser: { include: { designation: true, department: true } } } } }
        });

        const byBranch = new Map<string, any[]>();
        criticalExceptions.forEach((ex) => {
            const arr = byBranch.get(ex.unitId) || [];
            arr.push(ex);
            byBranch.set(ex.unitId, arr);
        });

        for (const [unitId, exceptions] of byBranch) {
            try {
                const branch = exceptions[0].branch;
                const headDesignation = toTitleCase(branch.headUser?.designation?.nameEn || 'Branch Head');

                // UNIFIED FILTER: Exclude specialized boxes (Liquidity) to ensure count matches Exception Trace Table
                // We keep RULE-OP-RISK, RULE-DAILY-DECLINE, RULE-RISK-01, and RULE-CASH-01
                const filteredExceptions = exceptions.filter((e: any) => 
                    !(e.ruleId === 'RULE-LIQ-01' || (e.ruleId === 'RULE-OP-RISK' && ['CASA%', 'CD_Ratio', 'CD Ratio', 'CD_RATIO'].includes(e.parameter)))
                );

                const salutation = getSalutation(branch.headUser);

                // DEDUPLICATE by parameter+ruleId to ensure count is 1:1 with table rows
                const seen = new Set();
                const uniqueExceptions = filteredExceptions.filter(e => {
                    const key = `${e.ruleId}-${e.parameter}`;
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

                const dailyMovement = await getDailyMovement(unitId, businessDate);
                const snapshot = await BusinessSnapshotService.getSnapshot(branch.code, format(businessDate, 'yyyy-MM-dd'));

                await (prisma as any).letter.create({
                    data: {
                        type: 'OP_RISK',
                        titleEn: `Operational Risk Advisory - ${displayPeriod}`,
                        contentEn: buildOpRiskContent(
                            toTitleCase(branch.nameEn),
                            headDesignation,
                            displayPeriod,
                            uniqueExceptions.length,
                            dailyMovement,
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
                            letterDate: format(new Date(), 'dd.MM.yyyy'),
                            reportingPeriod: displayPeriod,
                            hideApprovedStatus: true,
                            exceptions: uniqueExceptions.map((e: any) => ({ 
                                ruleId: e.ruleId, 
                                parameter: e.parameter, 
                                message: e.message 
                            })),
                            dailyMovement,
                            cashData: snapshot?.cashData?.length ? snapshot.cashData : deriveCashData(dailyMovement)
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
    const cashTotal = movements.find(m => m.metricKey === 'TotalCash');
    const cashCRL = movements.find(m => m.metricKey === 'CRL');
    const cashATM = movements.find(m => m.metricKey === 'ATMCash');
    const cashBC = movements.find(m => m.metricKey === 'BCCash');
    
    const result = [];
    if (cashTotal) result.push({ parameter: 'CASH_TOTAL', val_current: cashTotal.latestValue, budget_month: cashCRL?.latestValue || 0, metadata: { displayName: 'Total Cash Possession' } });
    if (cashATM) result.push({ parameter: 'CASH_ATM', val_current: cashATM.latestValue, budget_month: 0, metadata: { displayName: 'ATM Cash' } });
    if (cashBC) result.push({ parameter: 'CASH_BC', val_current: cashBC.latestValue, budget_month: 0, metadata: { displayName: 'Cash with BC' } });
    
    return result;
}
