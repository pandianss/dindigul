import {
    startOfMonth,
    endOfMonth,
    subMonths,
    format,
    isAfter,
    startOfDay,
    differenceInMonths,
    startOfQuarter,
    endOfQuarter
} from 'date-fns';
import { renderTemplate, getBrowser, fontToBase64, imageToBase64 } from './pdfService';
import { 
    cleanAmount, 
    parseCBSDate, 
    mapAccountClass, 
    formatSolId, 
    normalizeAmount, 
    toUTCDate 
} from '../utils/businessUtils';
import prisma from '../lib/prisma';
import { parseCSV } from '../utils/csv';
import { getFYBoundaries, countWorkingDaysInInterval, isWorkingDay } from '../utils/calendar';


export interface AccountOpeningCSVRow {
    REGION_NAME?: string;
    SOL_ID: string;
    SOL_DESC?: string;
    CIF_ID: string;
    FORACID: string;
    ACCT_NAME: string;
    SCHM_TYPE: string;
    SCHM_CODE: string;
    ACCT_OPN_DATE: string;
    CLR_BAL_AMT: string;
    'AVERAGE BALANCE': string;
}

export interface AccountClosureCSVRow {
    SOL_ID: string;
    CIF_ID: string;
    FORACID: string;
    ACCT_NAME: string;
    ACCT_OPN_DATE: string;
    ACCT_CLS_DATE: string;
    SCHM_TYPE: string;
    SCHM_CODE: string;
    'Balance Prior to Closure': string;
}

export class AccountAnalyticsService {
    /**
     * Processes Account Opening CSV data with Qualification Engine.
     */
    static async processAccountOpenings(csvContent: string, businessDate: Date) {
        const records = parseCSV<AccountOpeningCSVRow>(csvContent);

        // Load configurations
        const configs = await prisma.systemConfig.findMany({
            where: { group: 'PLANNING' }
        });
        const getConf = (key: string) => configs.find((c: any) => c.key === key)?.value;

        const minSb = parseFloat(getConf('MIN_SB_BALANCE_THRESHOLD') || '500');
        const minCd = parseFloat(getConf('MIN_CD_BALANCE_THRESHOLD') || '1000');
        const premiumThreshold = parseFloat(getConf('PREMIUM_BALANCE_THRESHOLD') || '1000000');
        const adoptionSchemes: string[] = JSON.parse(getConf('PRODUCT_ADOPTION_SCHEMES') || '[]');

        const results = { total: records.length, processed: 0, skipped: 0, errors: 0, qualified: 0, totalBalance: 0 };
        const bDate = toUTCDate(businessDate);

        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            
            // Prefetch branch categories for the batch to avoid N+1 queries
            const solIdsInBatch = Array.from(new Set(batch.map((r: AccountOpeningCSVRow) => formatSolId(r.SOL_ID))));
            const branchInfo = await prisma.branch.findMany({
                where: { code: { in: solIdsInBatch } },
                select: { id: true, code: true, populationGroup: true, type: true }
            });
            const branchMap = new Map(branchInfo.map((b: any) => [b.code, b]));

            await Promise.all(batch.map(async (record: AccountOpeningCSVRow) => {
                try {
                    if (!record.FORACID || !record.SOL_ID) {
                        results.skipped++;
                        return;
                    }

                    // Standardize SOL ID to 4 digits
                    const solId = formatSolId(record.SOL_ID);
                    const branch = branchMap.get(solId);
                    const popGroup = ((branch?.populationGroup as string) || 'URBAN').toUpperCase();

                    // Apply dynamic threshold: Rural branches use 251, others use configured minSb
                    const activeMinSb = popGroup === 'RURAL' ? 251 : minSb;

                    // 1. Normalization Layer
                    const isPaise = false; // User confirmed all values in account opening are in units (Rupees)
                    const balance = normalizeAmount(cleanAmount(record.CLR_BAL_AMT), isPaise);
                    const avgBalance = normalizeAmount(cleanAmount(record['AVERAGE BALANCE']), isPaise);
                    const schmType = (record.SCHM_TYPE || '').toUpperCase();
                    const schmCode = (record.SCHM_CODE || '').toUpperCase();

                    // Derive Account Class - STRICT MAPPING
                    const accountClass = mapAccountClass(schmType);

                    // 2. Business Qualification Engine
                    const { isQualified, rejectionReason } = this.qualifyAccount(
                        accountClass,
                        balance,
                        schmCode,
                        activeMinSb,
                        minCd,
                        adoptionSchemes
                    );

                    if (isQualified) {
                        results.qualified++;
                        results.totalBalance += balance;
                    }

                    // 3. Customer Intelligence (Value Scoring)
                    let valueBucket = 'RETAIL';
                    if (balance >= premiumThreshold) valueBucket = 'PREMIUM';
                    else if (balance >= premiumThreshold / 10) valueBucket = 'HIGH_VALUE';

                    // Standardize Date
                    const opnDate = toUTCDate(parseCBSDate(record.ACCT_OPN_DATE, bDate));

                    await prisma.accountOpening.upsert({
                        where: { foracid: record.FORACID },
                        update: {
                            solId,
                            cifId: record.CIF_ID,
                            acctName: record.ACCT_NAME,
                            schmType,
                            schmCode,
                            accountClass,
                            acctOpnDate: opnDate,
                            clrBalAmt: balance,
                            averageBalance: avgBalance,
                            businessDate: bDate,
                            isQualified,
                            rejectionReason,
                            valueBucket,
                            customerValueScore: balance // Simple score for now
                        },
                        create: {
                            solId,
                            cifId: record.CIF_ID,
                            foracid: record.FORACID,
                            acctName: record.ACCT_NAME,
                            schmType,
                            schmCode,
                            accountClass,
                            acctOpnDate: opnDate,
                            clrBalAmt: balance,
                            averageBalance: avgBalance,
                            businessDate: bDate,
                            isQualified,
                            rejectionReason,
                            valueBucket,
                            customerValueScore: balance
                        }
                    });
                    results.processed++;
                } catch (err) {
                    console.error(`Error processing record ${record.FORACID}:`, err);
                    results.errors++;
                }
            }));
        }

        // Trigger Comprehensive Fact Table Refresh for all opening dates in DB
        const affectedDates = await prisma.accountOpening.groupBy({
            by: ['acctOpnDate'],
            where: { businessDate: bDate } // Only refresh dates present in this upload
        });

        console.log(`Synchronizing Fact Tables for ${affectedDates.length} unique opening dates...`);
        for (const d of affectedDates as any[]) {
            if (d.acctOpnDate) {
                await this.refreshFactTables(d.acctOpnDate);
            }
        }

        return { ...results, summary: { total: results.total, qualified: results.qualified, rejectionRate: results.total > 0 ? ((results.total - results.qualified) / results.total * 100).toFixed(1) + + '%' : '0%', capturedBalance: results.totalBalance, avgOpeningBalance: results.qualified > 0 ? results.totalBalance / results.qualified : 0 } };
    }

    /**
     * Processes Account Closure CSV data.
     */
    static async processAccountClosures(csvContent: string, businessDate: Date) {
        const records = parseCSV<AccountClosureCSVRow>(csvContent);
        const results = { total: records.length, processed: 0, skipped: 0, corrupted: 0, errors: 0 };
        const bDate = toUTCDate(businessDate);

        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            await Promise.all(batch.map(async (record: AccountClosureCSVRow) => {
                try {
                    if (!record.FORACID || !record.SOL_ID) {
                        results.skipped++;
                        return;
                    }

                    // Detect scientific notation in FORACID (data corruption)
                    if (record.FORACID.toString().includes('E+')) {
                        console.warn(`Corrupted account record detected (scientific notation): ${record.FORACID}`);
                        results.corrupted++;
                        return;
                    }

                    const balance = cleanAmount(record['Balance Prior to Closure']);
                    const schmType = (record.SCHM_TYPE || '').toUpperCase();
                    const schmCode = (record.SCHM_CODE || '').toUpperCase();

                    // Derive Account Class
                    const accountClass = mapAccountClass(schmType);

                    const opnDate = parseCBSDate(record.ACCT_OPN_DATE, bDate);
                    const clsDate = parseCBSDate(record.ACCT_CLS_DATE, bDate);
                    const finalClsDate = clsDate;

                    // Normalize SOL_ID to 4 digits
                    let solId = (record.SOL_ID || '').toString().trim();
                    if (solId.length > 0 && solId.length < 4) solId = solId.padStart(4, '0');

                    await prisma.accountClosure.upsert({
                        where: { foracid: record.FORACID },
                        update: {
                            solId,
                            cifId: record.CIF_ID,
                            acctName: record.ACCT_NAME,
                            schmType,
                            schmCode,
                            accountClass,
                            acctOpnDate: isNaN(opnDate.getTime()) ? bDate : opnDate,
                            acctClsDate: finalClsDate,
                            balanceAtCls: balance,
                            businessDate: bDate,
                            dataQualityFlag: 'VALID'
                        },
                        create: {
                            solId,
                            cifId: record.CIF_ID,
                            foracid: record.FORACID,
                            acctName: record.ACCT_NAME,
                            schmType,
                            schmCode,
                            accountClass,
                            acctOpnDate: isNaN(opnDate.getTime()) ? bDate : opnDate,
                            acctClsDate: finalClsDate,
                            balanceAtCls: balance,
                            businessDate: bDate,
                            dataQualityFlag: 'VALID'
                        }
                    });
                    results.processed++;
                } catch (err) {
                    console.error(`Error processing closure record ${record.FORACID}:`, err);
                    results.errors++;
                }
            }));
        }

        // Trigger Comprehensive Fact Table Refresh for all closure dates in DB
        const affectedDates = await prisma.accountClosure.groupBy({
            by: ['acctClsDate'],
            where: { businessDate: bDate } // Only refresh dates present in this upload
        });

        console.log(`Synchronizing Fact Tables for ${affectedDates.length} unique closure dates...`);
        for (const d of affectedDates as any[]) {
            if (d.acctClsDate) {
                await this.refreshFactTables(d.acctClsDate);
            }
        }

        return results;
    }

    /**
     * Refreshes Fact Tables using the Unified Fact Model.
     */
    private static async refreshFactTables(businessDate: Date) {
        const bDate = toUTCDate(businessDate);
        console.log(`Refreshing unified fact tables for ${format(bDate, 'yyyy-MM-dd')}...`);

        // 1. Get Calendar Info (with Auto-Initialization Fallback)
        let calendar = await prisma.calendarMaster.findUnique({
            where: { calDate: bDate }
        });

        if (!calendar) {
            console.log(`[FactRefresh] Missing calendar entry for ${format(bDate, 'yyyy-MM-dd')}. Auto-initializing...`);
            
            // Fetch holidays once to check working day status
            const holidays = await prisma.holiday.findMany();
            const isWork = isWorkingDay(bDate, holidays as any[]);
            const fy = getFYBoundaries(bDate);

            calendar = await prisma.calendarMaster.create({
                data: {
                    calDate: bDate,
                    isWorkingDay: isWork,
                    holidayFlag: !isWork,
                    monthKey: format(bDate, 'yyyy-MM'),
                    financialPeriod: fy.label
                }
            });
            console.log(`[FactRefresh] Calendar entry created for ${format(bDate, 'yyyy-MM-dd')}.`);
        }

        const monthStart = startOfMonth(bDate);
        const monthEnd = endOfMonth(bDate);

        // 2. Batch Aggregate counts for ALL branches at once
        const [sbOpenStats, sbClosedStats, sbQualStats, cdOpenStats, cdClosedStats, cdQualStats] = await Promise.all([
            // SB Daily
            prisma.accountOpening.groupBy({
                by: ['solId'],
                where: { acctOpnDate: bDate, accountClass: 'SB' },
                _count: { foracid: true }
            }),
            prisma.accountClosure.groupBy({
                by: ['solId'],
                where: { acctClsDate: bDate, accountClass: 'SB' },
                _count: { foracid: true }
            }),
            prisma.accountOpening.groupBy({
                by: ['solId'],
                where: { acctOpnDate: bDate, accountClass: 'SB', isQualified: true },
                _count: { foracid: true }
            }),
            // CD Daily (Aggregated for current date, though CD is often monthly)
            prisma.accountOpening.groupBy({
                by: ['solId'],
                where: { acctOpnDate: bDate, accountClass: 'CD' },
                _count: { foracid: true }
            }),
            prisma.accountClosure.groupBy({
                by: ['solId'],
                where: { acctClsDate: bDate, accountClass: 'CD' },
                _count: { foracid: true }
            }),
            prisma.accountOpening.groupBy({
                by: ['solId'],
                where: { acctOpnDate: bDate, accountClass: 'CD', isQualified: true },
                _count: { foracid: true }
            })
        ]);

        const getCount = (stats: any[], solId: string) => stats.find((s: any) => s.solId === solId)?._count.foracid || 0;

        const allSols = Array.from(new Set([
            ...sbOpenStats.map((s: any) => s.solId),
            ...sbClosedStats.map((s: any) => s.solId),
            ...cdOpenStats.map((s: any) => s.solId),
            ...cdClosedStats.map((s: any) => s.solId)
        ]));

        const branchInfo = await prisma.branch.findMany({
            where: { code: { in: allSols } },
            select: { id: true, code: true }
        });
        const branchMap = new Map(branchInfo.map((b: any) => [b.code, b.id]));

        console.log(`Updating unified facts for ${branchInfo.length} branches...`);

        // 3. RECONCILIATION CHECK (Planning vs MIS Staging)
        const stagingData = await prisma.stgUnitFinancialsDaily.findMany({
            where: { businessDate: bDate, unitCode: { in: allSols } }
        });
 
        if (stagingData.length > 0) {
            stagingData.forEach(stg => {
                const sol = stg.unitCode;
                const planningCount = getCount(sbOpenStats, sol);
                const stgBalance = Number(stg.sbBalance || 0);
                
                // Rule: If we have > 5 new accounts but 0 balance movement, flag as data delay
                if (planningCount > 5 && stgBalance === 0) {
                    console.warn(`[Reconciliation-Alert] SOL ${sol}: ${planningCount} accounts opened but 0 MIS balance. Potential sync delay.`);
                }
            });
        }

        // 4. Transactional Upsert into Unified Fact Table
        await prisma.$transaction(async (tx) => {
            for (const sol of allSols) {
                const unitId = branchMap.get(sol);
                if (!unitId) continue;

                const metrics = [
                    { key: 'PLAN_SB_OPEN', val: getCount(sbOpenStats, sol) },
                    { key: 'PLAN_SB_CLOSE', val: getCount(sbClosedStats, sol) },
                    { key: 'PLAN_SB_QUAL', val: getCount(sbQualStats, sol) },
                    { key: 'PLAN_CD_OPEN', val: getCount(cdOpenStats, sol) },
                    { key: 'PLAN_CD_CLOSE', val: getCount(cdClosedStats, sol) },
                    { key: 'PLAN_CD_QUAL', val: getCount(cdQualStats, sol) }
                ];

                for (const m of metrics) {
                    if (m.val === 0) continue; 
                    
                    // We use date+unitId+metric as the unique identifier for a fact
                    // Note: Depending on the schema, we might need to delete first or use upsert if available
                    // Schema shows index on [date, unitId, metric] but not necessarily a unique constraint.
                    // We'll delete and recreate to ensure freshness.
                    await tx.fact.deleteMany({
                        where: { unitId, date: bDate, metric: m.key }
                    });
                    await tx.fact.create({
                        data: { unitId, date: bDate, metric: m.key, value: m.val }
                    });
                }
            }
        });
    }

    /**
     * Specialized Intelligence Reports.
     */
    static async getIntelligenceReports(solId?: string) {
        const now = new Date();
        const bDate = toUTCDate(now);
        const cal = await prisma.calendarMaster.findUnique({ where: { calDate: bDate } });
        const monthKey = cal?.monthKey || format(bDate, 'yyyy-MM');

        // 1. Top Customers
        const topCustomers = await prisma.accountOpening.findMany({
            where: { 
                isQualified: true,
                ...(solId ? { solId } : {})
            },
            orderBy: { customerValueScore: 'desc' },
            take: 20,
            include: { branch: { select: { nameEn: true } } }
        });

        // 2. Campaign Adoption (Scheme leaderboard)
        // MONITORING: specific set of select schemes (from config)
        const configJson = await prisma.systemConfig.findUnique({
            where: { key: 'PRODUCT_ADOPTION_SCHEMES' }
        });
        const strategicSchemes: string[] = JSON.parse(configJson?.value || '[]');

        const schemeAdoption = await prisma.accountOpening.groupBy({
            by: ['schmCode', 'accountClass'],
            where: {
                isQualified: true,
                ...(strategicSchemes.length > 0 ? { schmCode: { in: strategicSchemes } } : {}),
                ...(solId ? { solId } : {})
            },
            _count: { foracid: true },
            _avg: { clrBalAmt: true },
            orderBy: { _count: { foracid: 'desc' } }
        });

        // 3. Branch Performance Leaderboard (using Fact tables)
        const branchLeaderboard = await prisma.fact.groupBy({
            by: ['unitId'],
            where: { 
                date: { gte: startOfMonth(bDate) },
                metric: 'PLAN_SB_OPEN',
                ...(solId ? { branch: { code: solId } } : {})
            },
            _sum: { value: true }
        });

        // Enrich with branch names in BULK to avoid N+1
        const unitIds = branchLeaderboard.map((item: any) => item.unitId);
        const branches = await prisma.branch.findMany({
            where: { id: { in: unitIds } },
            select: { id: true, code: true, nameEn: true }
        });
        const branchNameMap = new Map(branches.map((b: any) => [b.id, b.nameEn]));
        const branchCodeMap = new Map(branches.map((b: any) => [b.id, b.code]));

        const enrichedLeaderboard = branchLeaderboard.map((item: any) => ({
            ...item,
            solId: branchCodeMap.get(item.unitId) || item.unitId,
            branchName: branchNameMap.get(item.unitId) || item.unitId,
            _sum: { netSbOpened: Number(item._sum.value || 0) } // Map back for backward compatibility
        }));

        // 4. Rejection Summary
        const rejectionSummary = await prisma.accountOpening.groupBy({
            by: ['rejectionReason'],
            where: { 
                isQualified: false,
                ...(solId ? { solId } : {})
            },
            _count: { foracid: true }
        });

        // 5. Detailed Scheme Rejections
        const rejectedSchemes = await prisma.accountOpening.groupBy({
            by: ['schmCode'],
            where: { 
                rejectionReason: 'NON_ELIGIBLE_SCHEME',
                ...(solId ? { solId } : {})
            },
            _count: { foracid: true },
            orderBy: { _count: { foracid: 'desc' } },
            take: 10
        });

        return {
            monthKey,
            topCustomers,
            schemeAdoption,
            leaderboard: enrichedLeaderboard.sort((a: any, b: any) => (b._sum.netSbOpened || 0) - (a._sum.netSbOpened || 0)),
            rejectionSummary,
            rejectedSchemes
        };
    }

    /**
     * Generates Special Report: Top 10 / Bottom 10 Branch Rankings.
     * Metrics: Net Account Opening, Avg Balance, Net Rate for SB and CD.
     */
    static async getSpecialReport(period: 'month' | 'fy' = 'month') {
        const now = new Date();
        const bDate = toUTCDate(now);
        const cal = await prisma.calendarMaster.findUnique({ where: { calDate: bDate } });
        if (!cal) return { error: `Calendar not initialized for today (${bDate.toISOString()})` };

        const monthKey = cal.monthKey;
        const fyBoundaries = getFYBoundaries(bDate);

        const currentMonthDates = await prisma.calendarMaster.aggregate({
            where: { monthKey }, _min: { calDate: true }
        });
        const monthStart = currentMonthDates._min.calDate || startOfMonth(bDate);

        const wdThisMonth = await prisma.calendarMaster.count({
            where: { monthKey, isWorkingDay: true, calDate: { lte: bDate } }
        });
        const wdFY = await prisma.calendarMaster.count({
            where: { financialPeriod: cal.financialPeriod, isWorkingDay: true, calDate: { lte: bDate } }
        });
        const monthsElapsedFY = differenceInMonths(bDate, fyBoundaries.start) + 1;

        const sbRange = period === 'month'
            ? { gte: monthStart, lte: bDate }
            : { gte: fyBoundaries.start, lte: bDate };
        const cdMonthFilter: any = period === 'month'
            ? monthKey
            : { gte: format(fyBoundaries.start, 'yyyy-MM') };
        const sbDivisor = period === 'month' ? (wdThisMonth || 1) : (wdFY || 1);
        const cdDivisor = period === 'month' ? 1 : monthsElapsedFY;
        const avgBalStart = period === 'month' ? monthStart : fyBoundaries.start;

        const breakdown = await this.getBranchBreakdown(sbRange, cdMonthFilter, avgBalStart, sbDivisor, cdDivisor);

        const topN = 10;
        const sortAsc = (arr: any[], key: string) =>
            [...arr].sort((a: any, b: any) => a[key] - b[key]).slice(0, topN);
        const sortDesc = (arr: any[], key: string) =>
            [...arr].sort((a: any, b: any) => b[key] - a[key]).slice(0, topN);

        const enriched = breakdown.map((b: any) => ({
            ...b,
            sbNet: b.sbQualified - b.sbClosed,
            cdNet: b.cdQualified - b.cdClosed
        }));

        return {
            period,
            monthKey,
            startDate: period === 'month' ? monthStart : fyBoundaries.start,
            endDate: bDate,
            fyKey: cal.financialPeriod,
            generatedAt: new Date().toISOString(),
            totalBranches: breakdown.length,
            regionName: 'Dindigul Region',
            reportType: 'Performance Ranking Registry',
            sbNetOpening: { top: sortDesc(enriched, 'sbNet'), bottom: sortAsc(enriched, 'sbNet') },
            cdNetOpening: { top: sortDesc(enriched, 'cdNetOpening'), bottom: sortAsc(enriched, 'cdNetOpening') },
            avgBalance:   { top: sortDesc(enriched, 'avgBalance'), bottom: sortAsc(enriched, 'avgBalance') },
            cdAvgBalance: { top: sortDesc(enriched, 'cdAvgBalance'), bottom: sortAsc(enriched, 'cdAvgBalance') },
            sbNetRate:    { top: sortDesc(enriched, 'sbRate'), bottom: sortAsc(enriched, 'sbRate') },
            cdNetRate:    { top: sortDesc(enriched, 'cdRate'), bottom: sortAsc(enriched, 'cdRate') }
        };
    }

    /**
     * Calculates SB/CD analytics based on Fact tables and Calendar Master.
     */
    static async getAnalytics(solId?: string) {
        const now = new Date();
        const bDate = toUTCDate(now);
        const cal = await prisma.calendarMaster.findUnique({ where: { calDate: bDate } });

        if (!cal) {
            throw new Error(`Calendar master not initialized for today (${bDate.toISOString()}). Please initialize the calendar first.`);
        }

        const monthKey = cal.monthKey;
        const fy = cal.financialPeriod;

        // Robust Month Boundaries from CalendarMaster
        const lastMonthKey = format(subMonths(bDate, 1), 'yyyy-MM');
        const lmDates = await prisma.calendarMaster.aggregate({
            where: { monthKey: lastMonthKey },
            _min: { calDate: true },
            _max: { calDate: true }
        });
        const lastMonthStart = lmDates._min.calDate || startOfMonth(subMonths(bDate, 1));
        const lastMonthEnd = lmDates._max.calDate || endOfMonth(subMonths(bDate, 1));

        // 1. Fetch Thresholds
        const configs = await prisma.systemConfig.findMany({
            where: { group: 'PLANNING' }
        });
        const getConf = (key: string) => configs.find((c: any) => c.key === key)?.value;

        const sbThreshold = parseFloat(getConf('MIN_SB_BALANCE_THRESHOLD') || '500');
        const cdThreshold = parseFloat(getConf('MIN_CD_BALANCE_THRESHOLD') || '1000');

        // 2. Working Days context
        const wdThisMonth = await prisma.calendarMaster.count({
            where: { monthKey, isWorkingDay: true, calDate: { lte: bDate } }
        });
        const wdLastMonth = await prisma.calendarMaster.count({
            where: { calDate: { gte: lastMonthStart, lte: lastMonthEnd }, isWorkingDay: true }
        });
        const wdFY = await prisma.calendarMaster.count({
            where: { financialPeriod: fy, isWorkingDay: true, calDate: { lte: bDate } }
        });

        console.log(`[PlanningAnalytics] Context - Month: ${monthKey}, WD: ${wdThisMonth}, FY: ${fy}, WD: ${wdFY}`);

        // 3. SB Stats using Unified Fact table
        // Find date range for current monthKey to avoid timezone issues
        const currentMonthDates = await prisma.calendarMaster.aggregate({
            where: { monthKey },
            _min: { calDate: true }
        });
        const monthStart = currentMonthDates._min.calDate || startOfMonth(bDate);
 
        const getFactSum = async (startDate: Date, endDate: Date, metrics: string[]): Promise<any> => {
            const results = await prisma.fact.groupBy({
                by: ['metric'],
                where: {
                    date: { gte: startDate, lte: endDate },
                    metric: { in: metrics },
                    ...(solId ? { branch: { code: solId } } : {})
                },
                _sum: { value: true }
            });
            const map: any = {};
            metrics.forEach(m => map[m] = Number(results.find(r => r.metric === m)?._sum.value || 0));
            return map;
        };
 
        const sbMetrics = ['PLAN_SB_OPEN', 'PLAN_SB_CLOSE', 'PLAN_SB_QUAL'];
        const sbThisMonthFact = await getFactSum(monthStart, bDate, sbMetrics);
        const sbLastMonthFact = await getFactSum(lastMonthStart, lastMonthEnd, sbMetrics);
        
        const fyBoundaries = getFYBoundaries(bDate);
        const sbFYFact = await getFactSum(fyBoundaries.start, bDate, sbMetrics);
 
        // 4. CD Stats using Unified Fact table
        const cdMetrics = ['PLAN_CD_OPEN', 'PLAN_CD_CLOSE', 'PLAN_CD_QUAL'];
        const cdThisMonthFact = await getFactSum(monthStart, bDate, cdMetrics);
        const cdLastMonthFact = await getFactSum(lastMonthStart, lastMonthEnd, cdMetrics);
        const cdFYFact = await getFactSum(fyBoundaries.start, bDate, cdMetrics);
 
        // Map for backward compatibility with UI
        const sbThisMonth = { _sum: { netSbOpened: sbThisMonthFact.PLAN_SB_OPEN, sbClosed: sbThisMonthFact.PLAN_SB_CLOSE, qualifiedCount: sbThisMonthFact.PLAN_SB_QUAL } };
        const sbLastMonth = { _sum: { netSbOpened: sbLastMonthFact.PLAN_SB_OPEN, sbClosed: sbLastMonthFact.PLAN_SB_CLOSE, qualifiedCount: sbLastMonthFact.PLAN_SB_QUAL } };
        const sbFY = { _sum: { netSbOpened: sbFYFact.PLAN_SB_OPEN, sbClosed: sbFYFact.PLAN_SB_CLOSE, qualifiedCount: sbFYFact.PLAN_SB_QUAL } };
 
        const cdThisMonth = { _sum: { netCdOpened: cdThisMonthFact.PLAN_CD_OPEN, cdClosed: cdThisMonthFact.PLAN_CD_CLOSE, qualifiedCount: cdThisMonthFact.PLAN_CD_QUAL } };
        const cdLastMonth = { _sum: { netCdOpened: cdLastMonthFact.PLAN_CD_OPEN, cdClosed: cdLastMonthFact.PLAN_CD_CLOSE, qualifiedCount: cdLastMonthFact.PLAN_CD_QUAL } };
        const cdFY = { _sum: { netCdOpened: cdFYFact.PLAN_CD_OPEN, cdClosed: cdFYFact.PLAN_CD_CLOSE, qualifiedCount: cdFYFact.PLAN_CD_QUAL } };

        // Ensure values are numbers or 0
        const parseStat = (val: number | null | undefined) => val || 0;

        // 5. Balance Aggregations (direct from AccountOpening)
        const sbBalances = await prisma.accountOpening.aggregate({
            where: {
                accountClass: 'SB',
                acctOpnDate: { gte: monthStart, lte: bDate },
                ...(solId ? { solId } : {})
            },
            _sum: { clrBalAmt: true }
        });

        const sbBalancesFY = await prisma.accountOpening.aggregate({
            where: {
                accountClass: 'SB',
                acctOpnDate: { gte: fyBoundaries.start, lte: bDate },
                ...(solId ? { solId } : {})
            },
            _sum: { clrBalAmt: true }
        });

        const cdBalances = await prisma.accountOpening.aggregate({
            where: {
                accountClass: 'CD',
                acctOpnDate: { gte: monthStart, lte: bDate },
                ...(solId ? { solId } : {})
            },
            _sum: { clrBalAmt: true }
        });

        const cdBalancesFY = await prisma.accountOpening.aggregate({
            where: {
                accountClass: 'CD',
                acctOpnDate: { gte: fyBoundaries.start, lte: bDate },
                ...(solId ? { solId } : {})
            },
            _sum: { clrBalAmt: true }
        });

        const monthsElapsedFY = differenceInMonths(bDate, fyBoundaries.start) + 1;
        const branchBreakdown = await this.getBranchBreakdown(
            { gte: monthStart, lte: bDate },
            monthKey,
            monthStart,
            wdThisMonth || 1, // SB divisor: days in month
            1                  // CD divisor: 1 month
        );

        const branchBreakdownFY = await this.getBranchBreakdown(
            { gte: fyBoundaries.start, lte: bDate },
            { gte: fyBoundaries.start, lte: bDate },
            fyBoundaries.start,
            wdFY || 1,        // SB divisor: days in FY
            monthsElapsedFY   // CD divisor: months in FY
        );

        const activeBranchCount = branchBreakdown.length || 1;

        return {
            calendar: {
                fyKey: cal.financialPeriod,
                monthKey: cal.monthKey
            },
            sbThreshold,
            cdThreshold,
            eligibleSchemes: JSON.parse(getConf('PRODUCT_ADOPTION_SCHEMES') || '[]'),
            workingDays: {
                thisMonth: wdThisMonth,
                lastMonth: wdLastMonth,
                fy: wdFY
            },
            sb: {
                thisMonth: sbThisMonth._sum.qualifiedCount || 0,
                total: sbThisMonth._sum.netSbOpened || 0,
                closed: sbThisMonth._sum.sbClosed || 0,
                net: (sbThisMonth._sum.qualifiedCount || 0) - (sbThisMonth._sum.sbClosed || 0),
                qualified: sbThisMonth._sum.qualifiedCount || 0,
                thisMonthBalance: Number(sbBalances._sum.clrBalAmt || 0),
                lastMonth: sbLastMonth._sum.qualifiedCount || 0,
                lastMonthTotal: sbLastMonth._sum.netSbOpened || 0,
                lastMonthClosed: sbLastMonth._sum.sbClosed || 0,
                fy: sbFY._sum.qualifiedCount || 0,
                fyTotal: sbFY._sum.netSbOpened || 0,
                fyClosed: sbFY._sum.sbClosed || 0,
                fyNet: (sbFY._sum.qualifiedCount || 0) - (sbFY._sum.sbClosed || 0),
                fyBalance: Number(sbBalancesFY._sum.clrBalAmt || 0),
                pace: wdThisMonth > 0 ? ((sbThisMonth._sum.qualifiedCount || 0) / wdThisMonth).toFixed(2) : '0',
                dailyRunRate: (sbThisMonth._sum.netSbOpened || 0) / (wdThisMonth || 1),
                avgPerBranch: (sbThisMonth._sum.netSbOpened || 0) / activeBranchCount
            },
            cd: {
                thisMonth: cdThisMonth._sum.qualifiedCount || 0,
                total: cdThisMonth._sum.netCdOpened || 0,
                closed: cdThisMonth._sum.cdClosed || 0,
                net: (cdThisMonth._sum.qualifiedCount || 0) - (cdThisMonth._sum.cdClosed || 0),
                thisMonthBalance: Number(cdBalances._sum.clrBalAmt || 0),
                lastMonth: cdLastMonth._sum.qualifiedCount || 0,
                lastMonthTotal: cdLastMonth._sum.netCdOpened || 0,
                lastMonthClosed: cdLastMonth._sum.cdClosed || 0,
                fy: cdFY._sum.qualifiedCount || 0,
                fyTotal: cdFY._sum.netCdOpened || 0,
                fyClosed: cdFY._sum.cdClosed || 0,
                fyNet: (cdFY._sum.qualifiedCount || 0) - (cdFY._sum.cdClosed || 0),
                fyBalance: Number(cdBalancesFY._sum.clrBalAmt || 0),
                monthlyRunRate: (cdFY._sum.netCdOpened || 0) / (differenceInMonths(bDate, fyBoundaries.start) + 1),
                avgPerBranch: (cdThisMonth._sum.netCdOpened || 0) / activeBranchCount
            },
            branchCount: activeBranchCount,
            branchBreakdown: branchBreakdown.sort((a: any, b: any) => b.total - a.total),
            branchBreakdownFY: branchBreakdownFY.sort((a: any, b: any) => b.total - a.total)
        };
    }

    private static async getBranchBreakdown(sbRange: any, cdMonthFilter: any, avgBalStart: Date, sbDivisor: number, cdDivisor: number) {
        const branchSb = await prisma.fact.groupBy({
            by: ['unitId', 'metric'],
            where: { 
                date: sbRange, 
                metric: { in: ['PLAN_SB_OPEN', 'PLAN_SB_CLOSE', 'PLAN_SB_QUAL'] } 
            },
            _sum: { value: true }
        });

        // For CD, if cdMonthFilter is a string (e.g., monthKey), adapt it to a date range
        let cdRange = cdMonthFilter;
        if (typeof cdMonthFilter === 'string') {
            const calDates = await prisma.calendarMaster.aggregate({
                where: { monthKey: cdMonthFilter },
                _min: { calDate: true },
                _max: { calDate: true }
            });
            
            if (!calDates._min.calDate) {
                // Fallback to start/end of month based on the monthKey string
                const [year, month] = cdMonthFilter.split('-').map(Number);
                const fallbackStart = new Date(Date.UTC(year, month - 1, 1));
                cdRange = { gte: fallbackStart, lte: endOfMonth(fallbackStart) };
            } else {
                cdRange = { gte: calDates._min.calDate, lte: calDates._max.calDate };
            }
        }
 
        const branchCd = await prisma.fact.groupBy({
            by: ['unitId', 'metric'],
            where: { 
                date: cdRange, 
                metric: { in: ['PLAN_CD_OPEN', 'PLAN_CD_CLOSE', 'PLAN_CD_QUAL'] } 
            },
            _sum: { value: true }
        });

        const branchAvgSb = await prisma.accountOpening.groupBy({
            by: ['solId'],
            where: { acctOpnDate: { gte: avgBalStart }, isQualified: true, accountClass: 'SB' },
            _avg: { clrBalAmt: true }
        });

        const branchAvgCd = await prisma.accountOpening.groupBy({
            by: ['solId'],
            where: { acctOpnDate: { gte: avgBalStart }, isQualified: true, accountClass: { in: ['CAA', 'CD'] } },
            _avg: { clrBalAmt: true }
        });

        const branchMap = new Map<string, any>();

        branchSb.forEach((f: any) => {
            if (!branchMap.has(f.unitId)) {
                branchMap.set(f.unitId, { unitId: f.unitId, sbTotal: 0, sbClosed: 0, sbQualified: 0, cdTotal: 0, cdClosed: 0, cdQualified: 0 });
            }
            const entry = branchMap.get(f.unitId);
            if (f.metric === 'PLAN_SB_OPEN') entry.sbTotal = Number(f._sum.value || 0);
            if (f.metric === 'PLAN_SB_CLOSE') entry.sbClosed = Number(f._sum.value || 0);
            if (f.metric === 'PLAN_SB_QUAL') entry.sbQualified = Number(f._sum.value || 0);
        });
 
        branchCd.forEach((f: any) => {
            if (!branchMap.has(f.unitId)) {
                branchMap.set(f.unitId, { unitId: f.unitId, sbTotal: 0, sbClosed: 0, sbQualified: 0, cdTotal: 0, cdClosed: 0, cdQualified: 0 });
            }
            const entry = branchMap.get(f.unitId);
            if (f.metric === 'PLAN_CD_OPEN') entry.cdTotal = Number(f._sum.value || 0);
            if (f.metric === 'PLAN_CD_CLOSE') entry.cdClosed = Number(f._sum.value || 0);
            if (f.metric === 'PLAN_CD_QUAL') entry.cdQualified = Number(f._sum.value || 0);
        });

        const avgMapSb = new Map(branchAvgSb.map((a: any) => [a.solId, a._avg.clrBalAmt || 0]));
        const avgMapCd = new Map(branchAvgCd.map((a: any) => [a.solId, a._avg.clrBalAmt || 0]));

        const unitIdsInMap = Array.from(branchMap.keys());
        const branches = await prisma.branch.findMany({
            where: { id: { in: unitIdsInMap } },
            select: { id: true, code: true, nameEn: true }
        });
        const nameMap = new Map(branches.map((b: any) => [b.id, b.nameEn]));
        const solCodeMap = new Map(branches.map((b: any) => [b.id, b.code]));
 
        return Array.from(branchMap.values()).map(item => {
            const solId = solCodeMap.get(item.unitId) || '0000';
            const gross = item.sbTotal + item.cdTotal;
            const closed = item.sbClosed + item.cdClosed;
            const qualified = item.sbQualified + item.cdQualified;
            const net = qualified - closed;
            return {
                code: solId,
                name: nameMap.get(item.unitId) || solId,
                sbTotal: item.sbTotal,
                sbClosed: item.sbClosed,
                sbQualified: item.sbQualified,
                cdTotal: item.cdTotal,
                cdClosed: item.cdClosed,
                cdQualified: item.cdQualified,
                total: gross,
                closed,
                net,
                qualified,
                lowBalance: gross - qualified,
                avgBalance: Number(avgMapSb.get(solId) || 0),
                cdAvgBalance: Number(avgMapCd.get(solId) || 0),
                sbRate: (item.sbQualified - item.sbClosed) / sbDivisor,
                cdRate: (item.cdQualified - item.cdClosed) / cdDivisor
            };
        });
    }

    /**
     * Re-processes all AccountOpening records based on latest configurations.
     */
    static async reprocessAllAccounts() {
        // 1. Load latest configurations
        const configs = await prisma.systemConfig.findMany({
            where: { group: 'PLANNING' }
        });
        const getConf = (key: string) => configs.find(c => c.key === key)?.value;

        const minSb = parseFloat(getConf('MIN_SB_BALANCE_THRESHOLD') || '500');
        const minCd = parseFloat(getConf('MIN_CD_BALANCE_THRESHOLD') || '1000');
        const adoptionSchemes: string[] = JSON.parse(getConf('PRODUCT_ADOPTION_SCHEMES') || '[]');

        // 2. Fetch all accounts with branch info
        const accounts = await prisma.accountOpening.findMany({
            include: { branch: { select: { populationGroup: true } } }
        });

        // 3. Batch Update
        const updates = accounts.map(account => {
            const popGroup = ((account.branch?.populationGroup as string) || 'URBAN').toUpperCase();
            const activeMinSb = popGroup === 'RURAL' ? 251 : minSb;

            const { isQualified, rejectionReason } = this.qualifyAccount(
                account.accountClass || 'OTHER',
                account.clrBalAmt.toNumber(),
                account.schmCode,
                activeMinSb,
                minCd,
                adoptionSchemes
            );

            return prisma.accountOpening.update({
                where: { foracid: account.foracid },
                data: { isQualified, rejectionReason }
            });
        });

        // Split into chunks to avoid overwhelming Prisma/DB connection
        const chunkSize = 100;
        for (let i = 0; i < updates.length; i += chunkSize) {
            await Promise.all(updates.slice(i, i + chunkSize));
        }

        // 4. Comprehensive Fact Table Refresh
        const uniqueDates = await prisma.accountOpening.groupBy({
            by: ['acctOpnDate']
        });

        console.log(`Synchronizing Fact Tables for ${uniqueDates.length} unique dates...`);
        for (const d of uniqueDates) {
            if (d.acctOpnDate) {
                await this.refreshFactTables(d.acctOpnDate);
            }
        }
    }

    /**
     * Core Qualification Logic (Shared).
     */
    private static qualifyAccount(
        accountClass: string,
        balance: number,
        schmCode: string,
        minSb: number,
        minCd: number,
        adoptionSchemes: string[]
    ) {
        let isQualified = true;
        let rejectionReason: string | null = null;

        // 1. Special Exemptions (Always Qualified)
        if (schmCode === 'SBSUB' || schmCode === 'CDSUB') {
            return { isQualified: true, rejectionReason: null };
        }

        // 2. Main Qualification Logic (Overall Performance - Removing Adoption Scheme Whitelist)
        if (accountClass === 'SB' && balance < minSb) {
            isQualified = false;
            rejectionReason = `BELOW_SB_THRESHOLD (${minSb})`;
        } else if (accountClass === 'CD' && balance < minCd) {
            isQualified = false;
            rejectionReason = `BELOW_CD_THRESHOLD (${minCd})`;
        }

        return { isQualified, rejectionReason };
    }

    /**
     * Generates a high-quality PNG image of the Special Performance Report.
     * Supports generating a combined report or a single metric report.
     */
    static async generateSpecialReportImage(period: 'month' | 'fy' = 'month', metricKey?: string) {
        console.log(`[SpecialReport] Starting generation for ${period}${metricKey ? ` (Metric: ${metricKey})` : ''}`);
        const reportData = await this.getSpecialReport(period);
        if ((reportData as any).error) throw new Error((reportData as any).error);
        
        console.log(`[SpecialReport] Data fetched. Rendering at 1920px width...`);

        const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);
        const formatCurrency = (num: number) => '₹' + new Intl.NumberFormat('en-IN').format(Math.round(num));
        const formatLakhs = (num: number) => (num / 100000).toFixed(2) + 'L';

        const interRegular = fontToBase64('inter-400.ttf');
        const interBold = fontToBase64('inter-700.ttf');

        const metricsList = [
            { key: 'sbNetOpening', label: 'SB Net Account Opening', unit: 'Accts', rateKey: 'sbRate', rateUnit: '/Day' },
            { key: 'cdNetOpening', label: 'CD Net Account Opening', unit: 'Accts', rateKey: 'cdRate', rateUnit: '/Mo' },
            { key: 'avgBalance', label: 'Average Balance (SB)', unit: '₹' },
            { key: 'cdAvgBalance', label: 'Average Balance (CD)', unit: '₹' }
        ];

        const enrichedMetrics = metricsList
            .filter(m => !metricKey || m.key === metricKey)
            .map(m => {
                const data = (reportData as any)[m.key];
                const valKey = m.key === 'sbNetOpening' ? 'sbNet' : m.key === 'cdNetOpening' ? 'cdNet' : m.key === 'avgBalance' ? 'avgBalance' : 'cdAvgBalance';
                
                const maxVal = Math.max(...data.top.map((b: any) => Math.abs(b[valKey])), 1);
                const maxBot = Math.max(...data.bottom.map((b: any) => Math.abs(b[valKey])), 1);

                const formatVal = (b: any) => {
                    const value = Number(b[valKey] || 0);
                    if (m.rateKey) {
                        const rateStr = `<div style="font-size: 64px; font-weight: 900; line-height: 1.1;">${Number(b[m.rateKey] || 0).toFixed(2)}${m.rateUnit}</div>`;
                        const actualValStr = m.unit === '₹' ? formatLakhs(value) : formatNumber(value);
                        const actualStr = `<div style="font-size: 32px; color: #64748b; font-weight: 700; margin-top: 8px;">(${actualValStr} ${m.unit})</div>`;
                        return rateStr + actualStr;
                    }
                    return m.unit === '₹' ? formatLakhs(value) : formatNumber(value);
                };

                return {
                    label: m.label,
                    data: {
                        top: data.top.map((b: any) => ({
                            name: b.name,
                            value: b[valKey],
                            formattedValue: formatVal(b),
                            percent: Math.min((Math.abs(b[valKey]) / maxVal) * 100, 100)
                        })),
                        bottom: data.bottom.map((b: any) => ({
                            name: b.name,
                            value: b[valKey],
                            formattedValue: formatVal(b),
                            percent: Math.min((Math.abs(b[valKey]) / (maxBot || 1)) * 100, 100)
                        }))
                    }
                };
            });

        const iobLogo = imageToBase64('assets/logo_full.svg');

        let fullMonthLabel = reportData.monthKey;
        try {
            fullMonthLabel = format(parseCBSDate(reportData.monthKey as string, new Date()), 'MMMM yyyy').toUpperCase();
        } catch (e) {
            console.error(`[SpecialReport] Failed to parse monthKey: ${reportData.monthKey}`);
        }

        const startDateStr = format(reportData.startDate || now, 'dd MMM yyyy').toUpperCase();
        const endDateStr = format(reportData.endDate || now, 'dd MMM yyyy').toUpperCase();

        const templateData = {
            monthKey: reportData.monthKey,
            fullMonthLabel,
            periodLabel: period === 'month' ? `Monthly Performance — ${fullMonthLabel}` : `Financial Year ${reportData.fyKey}`,
            dateRange: `${startDateStr} TO ${endDateStr}`,
            generatedAt: format(new Date(), 'dd MMM yyyy HH:mm'),
            metrics: enrichedMetrics,
            isSingle: !!metricKey,
            logoSrc: iobLogo,
            fonts: { regular: interRegular, bold: interBold }
        };

        console.log(`[SpecialReport] Rendering template (Period: ${fullMonthLabel})...`);
        const html = await renderTemplate('specialReport', templateData);
        
        console.log(`[SpecialReport] Launching browser...`);
        const browser = await getBrowser();
        const page = await browser.newPage();
        
        try {
            console.log(`[SpecialReport] Setting viewport to exact 1920x3216 and content...`);
            await page.setViewport({ width: 1920, height: 3216, deviceScaleFactor: 1 });
            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 45000 });
            
            console.log(`[SpecialReport] Final rendering: 1920x3216px. Generating screenshot...`);
            const imageBuffer = await page.screenshot({ 
                type: 'png',
                clip: { x: 0, y: 0, width: 1920, height: 3216 } 
            });
            console.log(`[SpecialReport] Generation successful! Size: ${Math.round(imageBuffer.length / 1024)} KB`);
            return imageBuffer;
        } catch (err) {
            console.error(`[SpecialReport] ERR:`, err);
            throw err;
        } finally {
            await page.close();
        }
    }
}
