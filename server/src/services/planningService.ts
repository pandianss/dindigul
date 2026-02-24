import { PrismaClient } from '@prisma/client';
import { parseCSV } from '../utils/csv';
import { countWorkingDaysInInterval, getFYBoundaries, Holiday } from '../utils/calendar';
import {
    startOfMonth,
    endOfMonth,
    subMonths,
    format,
    isAfter,
    startOfDay,
    parse as parseDate,
    differenceInMonths
} from 'date-fns';

const prisma = new PrismaClient();

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

export class PlanningService {
    /**
     * Processes Account Opening CSV data with Qualification Engine.
     */
    static async processAccountOpenings(csvContent: string, businessDate: Date) {
        const records = parseCSV<AccountOpeningCSVRow>(csvContent);

        // Load configurations
        const configs = await prisma.systemConfig.findMany({
            where: { group: 'PLANNING' }
        });
        const getConf = (key: string) => configs.find(c => c.key === key)?.value;

        const minSb = parseFloat(getConf('MIN_SB_BALANCE_THRESHOLD') || '500');
        const minCd = parseFloat(getConf('MIN_CD_BALANCE_THRESHOLD') || '1000');
        const premiumThreshold = parseFloat(getConf('PREMIUM_BALANCE_THRESHOLD') || '1000000');
        const adoptionSchemes: string[] = JSON.parse(getConf('PRODUCT_ADOPTION_SCHEMES') || '[]');

        const results = { total: records.length, processed: 0, skipped: 0, errors: 0 };
        const bDate = startOfDay(businessDate);

        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            await Promise.all(batch.map(async (record) => {
                try {
                    if (!record.FORACID || !record.SOL_ID) {
                        results.skipped++;
                        return;
                    }

                    // 1. Normalization Layer
                    const cleanAmount = (val: string | undefined) => {
                        if (!val) return 0;
                        return parseFloat(val.toString().replace(/,/g, '').trim()) || 0;
                    };

                    const balance = cleanAmount(record.CLR_BAL_AMT);
                    const avgBalance = cleanAmount(record['AVERAGE BALANCE']);
                    const schmType = (record.SCHM_TYPE || '').toUpperCase();
                    const schmCode = (record.SCHM_CODE || '').toUpperCase();

                    // Derive Account Class
                    let accountClass = 'OTHER';
                    if (schmType.includes('SB')) accountClass = 'SB';
                    else if (schmType.includes('CD') || schmType.includes('CA')) accountClass = 'CD';

                    // 2. Business Qualification Engine
                    const { isQualified, rejectionReason } = this.qualifyAccount(
                        accountClass,
                        balance,
                        schmCode,
                        minSb,
                        minCd,
                        adoptionSchemes
                    );

                    // 3. Customer Intelligence (Value Scoring)
                    let valueBucket = 'RETAIL';
                    if (balance >= premiumThreshold) valueBucket = 'PREMIUM';
                    else if (balance >= premiumThreshold / 10) valueBucket = 'HIGH_VALUE';

                    // Standardize Date
                    let opnDate: Date;
                    const dateStr = record.ACCT_OPN_DATE.trim();
                    if (dateStr.includes('/')) opnDate = parseDate(dateStr, 'dd/MM/yyyy', new Date());
                    else if (dateStr.includes('-')) opnDate = parseDate(dateStr, 'dd-MM-yyyy', new Date());
                    else opnDate = new Date(dateStr);
                    if (isNaN(opnDate.getTime())) opnDate = bDate;

                    await prisma.accountOpening.upsert({
                        where: { foracid: record.FORACID },
                        update: {
                            solId: record.SOL_ID,
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
                            solId: record.SOL_ID,
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

        // Trigger Fact Table Refresh
        await this.refreshFactTables(bDate);

        return results;
    }

    /**
     * Refreshes Fact Tables using Calendar Master.
     */
    private static async refreshFactTables(businessDate: Date) {
        console.log(`Refreshing fact tables for ${format(businessDate, 'yyyy-MM-dd')}...`);

        // 1. Get Calendar Info
        const calendar = await prisma.calendarMaster.findUnique({
            where: { calDate: businessDate }
        });
        if (!calendar) {
            console.warn(`No calendar entry for ${format(businessDate, 'yyyy-MM-dd')}. Skipping fact refresh.`);
            return;
        }

        // 2. Aggregate counts by Branch using robust count/aggregate logic
        const branches = await prisma.branch.findMany({ select: { code: true } });

        for (const branch of branches) {
            // Daily SB Fact
            const dailyStats = await prisma.accountOpening.aggregate({
                where: {
                    solId: branch.code,
                    acctOpnDate: businessDate,
                    accountClass: 'SB'
                },
                _count: { foracid: true }
            });

            const qualifiedStats = await prisma.accountOpening.count({
                where: {
                    solId: branch.code,
                    acctOpnDate: businessDate,
                    accountClass: 'SB',
                    isQualified: true
                }
            });

            if (dailyStats._count.foracid > 0) {
                await prisma.factSbDailyBranch.upsert({
                    where: { solId_openDay: { solId: branch.code, openDay: businessDate } },
                    update: {
                        netSbOpened: dailyStats._count.foracid,
                        qualifiedCount: qualifiedStats,
                        workingDayFlag: calendar.isWorkingDay,
                        dataQualityFlag: 'VALID'
                    },
                    create: {
                        solId: branch.code,
                        openDay: businessDate,
                        netSbOpened: dailyStats._count.foracid,
                        qualifiedCount: qualifiedStats,
                        workingDayFlag: calendar.isWorkingDay,
                        dataQualityFlag: 'VALID'
                    }
                });
            }

            // Monthly CD Fact refresh (for the whole monthKey if businessDate covers it)
            const cdStats = await prisma.accountOpening.count({
                where: {
                    solId: branch.code,
                    accountClass: 'CD',
                    acctOpnDate: {
                        gte: startOfMonth(businessDate),
                        lte: endOfMonth(businessDate)
                    }
                }
            });

            const qualifiedCdStats = await prisma.accountOpening.count({
                where: {
                    solId: branch.code,
                    accountClass: 'CD',
                    isQualified: true,
                    acctOpnDate: {
                        gte: startOfMonth(businessDate),
                        lte: endOfMonth(businessDate)
                    }
                }
            });

            if (cdStats > 0) {
                await prisma.factCdMonthlyBranch.upsert({
                    where: { solId_monthKey: { solId: branch.code, monthKey: calendar.monthKey } },
                    update: {
                        netCdOpened: cdStats,
                        qualifiedCount: qualifiedCdStats,
                        dataQualityFlag: 'VALID'
                    },
                    create: {
                        solId: branch.code,
                        monthKey: calendar.monthKey,
                        netCdOpened: cdStats,
                        qualifiedCount: qualifiedCdStats,
                        dataQualityFlag: 'VALID'
                    }
                });
            }
        }
    }

    /**
     * Specialized Intelligence Reports.
     */
    static async getIntelligenceReports() {
        const now = new Date();
        const cal = await prisma.calendarMaster.findUnique({ where: { calDate: startOfDay(now) } });
        const monthKey = cal?.monthKey || format(now, 'yyyy-MM');

        // 1. Top Customers
        const topCustomers = await prisma.accountOpening.findMany({
            where: { isQualified: true },
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
                ...(strategicSchemes.length > 0 ? { schmCode: { in: strategicSchemes } } : {})
            },
            _count: { foracid: true },
            _avg: { clrBalAmt: true },
            orderBy: { _count: { foracid: 'desc' } }
        });

        // 3. Branch Performance Leaderboard (using Fact tables)
        const branchLeaderboard = await prisma.factSbDailyBranch.groupBy({
            by: ['solId'],
            where: { openDay: { gte: startOfMonth(now) } },
            _sum: { netSbOpened: true, qualifiedCount: true }
        });

        // Enrich with branch names
        const enrichedLeaderboard = await Promise.all(branchLeaderboard.map(async (item: { solId: string, _sum: { netSbOpened: number | null, qualifiedCount: number | null } }) => {
            const branch = await prisma.branch.findUnique({ where: { code: item.solId }, select: { nameEn: true } });
            return {
                ...item,
                branchName: branch?.nameEn || item.solId
            };
        }));

        // 4. Rejection Summary
        const rejectionSummary = await prisma.accountOpening.groupBy({
            by: ['rejectionReason'],
            where: { isQualified: false },
            _count: { foracid: true }
        });

        // 5. Detailed Scheme Rejections
        const rejectedSchemes = await prisma.accountOpening.groupBy({
            by: ['schmCode'],
            where: { rejectionReason: 'NON_ELIGIBLE_SCHEME' },
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
     * Calculates SB/CD analytics based on Fact tables and Calendar Master.
     */
    static async getAnalytics() {
        const now = new Date();
        const bDate = startOfDay(now);
        const cal = await prisma.calendarMaster.findUnique({ where: { calDate: bDate } });

        if (!cal) {
            return { error: 'Calendar master not initialized for today' };
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
        const getConf = (key: string) => configs.find(c => c.key === key)?.value;

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

        // 3. SB Stats using Fact tables
        // Find date range for current monthKey to avoid timezone issues
        const currentMonthDates = await prisma.calendarMaster.aggregate({
            where: { monthKey },
            _min: { calDate: true }
        });
        const monthStart = currentMonthDates._min.calDate || startOfMonth(bDate);

        const sbThisMonth = await prisma.factSbDailyBranch.aggregate({
            where: { openDay: { gte: monthStart, lte: bDate } },
            _sum: { netSbOpened: true, qualifiedCount: true }
        });
        const sbLastMonth = await prisma.factSbDailyBranch.aggregate({
            where: { openDay: { gte: lastMonthStart, lte: lastMonthEnd } },
            _sum: { netSbOpened: true, qualifiedCount: true }
        });
        const fyBoundaries = getFYBoundaries(bDate);
        const sbFY = await prisma.factSbDailyBranch.aggregate({
            where: { openDay: { gte: fyBoundaries.start, lte: bDate } },
            _sum: { netSbOpened: true, qualifiedCount: true }
        });

        // 4. CD Stats using Fact tables
        const cdThisMonth = await prisma.factCdMonthlyBranch.aggregate({
            where: { monthKey },
            _sum: { netCdOpened: true, qualifiedCount: true }
        });
        const cdLastMonth = await prisma.factCdMonthlyBranch.aggregate({
            where: { monthKey: format(lastMonthStart, 'yyyy-MM') },
            _sum: { netCdOpened: true, qualifiedCount: true }
        });
        const cdFY = await prisma.factCdMonthlyBranch.aggregate({
            where: { monthKey: { gte: format(fyBoundaries.start, 'yyyy-MM') } }, // Simple range
            _sum: { netCdOpened: true, qualifiedCount: true }
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
            { gte: format(fyBoundaries.start, 'yyyy-MM') },
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
                qualified: sbThisMonth._sum.qualifiedCount || 0,
                lastMonth: sbLastMonth._sum.qualifiedCount || 0,
                fy: sbFY._sum.qualifiedCount || 0,
                pace: wdThisMonth > 0 ? ((sbThisMonth._sum.qualifiedCount || 0) / wdThisMonth).toFixed(2) : '0',
                dailyRunRate: (sbThisMonth._sum.netSbOpened || 0) / (wdThisMonth || 1),
                avgPerBranch: (sbThisMonth._sum.netSbOpened || 0) / activeBranchCount
            },
            cd: {
                thisMonth: cdThisMonth._sum.qualifiedCount || 0,
                total: cdThisMonth._sum.netCdOpened || 0,
                lastMonth: cdLastMonth._sum.qualifiedCount || 0,
                fy: cdFY._sum.qualifiedCount || 0,
                monthlyRunRate: (cdFY._sum.netCdOpened || 0) / (differenceInMonths(bDate, fyBoundaries.start) + 1),
                avgPerBranch: (cdThisMonth._sum.netCdOpened || 0) / activeBranchCount
            },
            branchCount: activeBranchCount,
            branchBreakdown: branchBreakdown.sort((a: any, b: any) => b.total - a.total),
            branchBreakdownFY: branchBreakdownFY.sort((a: any, b: any) => b.total - a.total)
        };
    }

    private static async getBranchBreakdown(sbRange: any, cdMonthFilter: any, avgBalStart: Date, sbDivisor: number, cdDivisor: number) {
        const branchSb = await prisma.factSbDailyBranch.groupBy({
            by: ['solId'],
            where: { openDay: sbRange },
            _sum: { netSbOpened: true, qualifiedCount: true }
        });

        const branchCd = await prisma.factCdMonthlyBranch.groupBy({
            by: ['solId'],
            where: { monthKey: cdMonthFilter },
            _sum: { netCdOpened: true, qualifiedCount: true }
        });

        const branchAvg = await prisma.accountOpening.groupBy({
            by: ['solId'],
            where: { acctOpnDate: { gte: avgBalStart } },
            _avg: { clrBalAmt: true }
        });

        const branchMap = new Map<string, any>();

        for (const item of branchSb) {
            branchMap.set(item.solId, {
                solId: item.solId,
                sbTotal: item._sum.netSbOpened || 0,
                sbQualified: item._sum.qualifiedCount || 0,
                cdTotal: 0,
                cdQualified: 0
            });
        }

        for (const item of branchCd) {
            const existing = branchMap.get(item.solId) || { solId: item.solId, sbTotal: 0, sbQualified: 0 };
            branchMap.set(item.solId, {
                ...existing,
                cdTotal: item._sum.netCdOpened || 0,
                cdQualified: item._sum.qualifiedCount || 0
            });
        }

        const avgMap = new Map(branchAvg.map(a => [a.solId, a._avg.clrBalAmt || 0]));
        const solIds = Array.from(branchMap.keys());
        const branches = await prisma.branch.findMany({
            where: { code: { in: solIds } },
            select: { code: true, nameEn: true }
        });
        const nameMap = new Map(branches.map(b => [b.code, b.nameEn]));

        return Array.from(branchMap.values()).map(item => {
            const total = item.sbTotal + item.cdTotal;
            const qualified = item.sbQualified + item.cdQualified;
            return {
                code: item.solId,
                name: nameMap.get(item.solId) || item.solId,
                sbTotal: item.sbTotal,
                sbQualified: item.sbQualified,
                cdTotal: item.cdTotal,
                cdQualified: item.cdQualified,
                total,
                qualified,
                lowBalance: total - qualified,
                avgBalance: avgMap.get(item.solId) || 0,
                sbRate: item.sbTotal / sbDivisor,
                cdRate: item.cdTotal / cdDivisor
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

        // 2. Fetch all accounts
        const accounts = await prisma.accountOpening.findMany();

        // 3. Batch Update
        const updates = accounts.map(account => {
            const { isQualified, rejectionReason } = this.qualifyAccount(
                account.accountClass || 'OTHER',
                account.clrBalAmt.toNumber(),
                account.schmCode,
                minSb,
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

        if (adoptionSchemes.length > 0 && !adoptionSchemes.includes(schmCode)) {
            isQualified = false;
            rejectionReason = 'NON_ELIGIBLE_SCHEME';
        } else if (accountClass === 'SB' && balance < minSb) {
            isQualified = false;
            rejectionReason = `BELOW_SB_THRESHOLD (${minSb})`;
        } else if (accountClass === 'CD' && balance < minCd) {
            isQualified = false;
            rejectionReason = `BELOW_CD_THRESHOLD (${minCd})`;
        }

        return { isQualified, rejectionReason };
    }
}
