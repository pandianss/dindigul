import prisma from '../lib/prisma';
import { 
    toUTCDate, 
    getFinancialYearStart, 
    getPreviousMonthEnd, 
    getYesterday 
} from '../utils/businessUtils';
import { logger } from '../utils/logger';
import { RuleEvaluator } from '../rules/RuleEvaluator';

/**
 * Service Layer: Responsible for transforming raw Facts into structured MisSnapshots.
 * Enforces Single Source of Truth by deriving all values from the Fact table.
 */
export class SnapshotBuilder {
    
    static async generateDailySnapshots(dateStr: string) {
        const businessDate = toUTCDate(dateStr);
        
        // Banking Logic: FY reference is ALWAYS the closing of the previous March 31st
        const fyYear = businessDate.getUTCMonth() < 3 ? businessDate.getUTCFullYear() - 1 : businessDate.getUTCFullYear();
        const fyClosingDate = new Date(Date.UTC(fyYear, 2, 31)); // March 31st of current FY start
        const prevYearClosingDate = new Date(Date.UTC(fyYear - 1, 2, 31)); // March 31st of previous year
        
        const pmEndDate = getPreviousMonthEnd(businessDate);
        const yesterdayDate = getYesterday(businessDate);

        logger.info('SNAPSHOT_GEN_START', { 
            businessDate: businessDate.toISOString(),
            fyClosing: fyClosingDate.toISOString(),
            prevYearClosing: prevYearClosingDate.toISOString(),
            pmEnd: pmEndDate.toISOString()
        });

        const [branches, registry] = await Promise.all([
            prisma.branch.findMany({
                include: { _count: { select: { users: true } } }
            }),
            prisma.misParameterRegistry.findMany({
                where: { isEnabled: true }
            })
        ]);

        let createdCount = 0;
        let skippedCount = 0;

        for (const branch of branches) {
            // 1. Fetch Facts for all relevant dates to calculate growth
            const allFacts = await prisma.fact.findMany({
                where: {
                    unitId: branch.code,
                    date: {
                        in: [businessDate, fyClosingDate, prevYearClosingDate, pmEndDate, yesterdayDate]
                    }
                }
            });

            if (allFacts.length === 0) {
                logger.warn('SNAPSHOT_BRANCH_SKIP_NO_FACTS', { 
                    sol: branch.code, 
                    date: businessDate.toISOString().split('T')[0] 
                });
                skippedCount++;
                continue;
            }

            // Organize facts by date and metric
            const factMap: Record<string, Record<string, number>> = {};
            [businessDate, fyClosingDate, prevYearClosingDate, pmEndDate, yesterdayDate].forEach(d => {
                factMap[d.toISOString()] = {};
            });

            allFacts.forEach(f => {
                const dateKey = f.date.toISOString();
                if (factMap[dateKey]) {
                    factMap[dateKey][f.metric] = Number(f.value);
                }
            });

            const currentFacts = factMap[businessDate.toISOString()];
            const fyFacts = factMap[fyClosingDate.toISOString()];
            const prevYearFacts = factMap[prevYearClosingDate.toISOString()];
            const pmFacts = factMap[pmEndDate.toISOString()];
            const yesterdayFacts = factMap[yesterdayDate.toISOString()];

            // Inject Business Per Employee
            const staffCount = (branch as any)._count?.users || 1; // Avoid division by zero
            currentFacts['Bus_Per_Employee'] = Number(((currentFacts['Bus'] || 0) / staffCount).toFixed(2));
            fyFacts['Bus_Per_Employee'] = Number(((fyFacts['Bus'] || 0) / staffCount).toFixed(2));
            prevYearFacts['Bus_Per_Employee'] = Number(((prevYearFacts['Bus'] || 0) / staffCount).toFixed(2));
            pmFacts['Bus_Per_Employee'] = Number(((pmFacts['Bus'] || 0) / staffCount).toFixed(2));
            yesterdayFacts['Bus_Per_Employee'] = Number(((yesterdayFacts['Bus'] || 0) / staffCount).toFixed(2));

            // 2. Create or Update Snapshot
            const snapshot = await prisma.misSnapshot.upsert({
                where: {
                    unitId_businessDate_version: {
                        unitId: branch.code,
                        businessDate,
                        version: 1
                    }
                },
                update: { status: 'DRAFT' },
                create: {
                    unitId: branch.code,
                    businessDate,
                    status: 'DRAFT',
                    version: 1
                }
            });

            // 3. Prepare Panel Data (Materialized View of Facts)
            const panelRecords = registry.map(reg => {
                const metric = reg.parameterName;
                const valCurrent = currentFacts[metric] || 0;
                const valFyStart = fyFacts[metric] || 0;
                const valPmEnd = pmFacts[metric] || 0;
                const valYesterday = yesterdayFacts[metric] || 0;

                return {
                    snapshotId: snapshot.id,
                    parameter: metric,
                    val_current: valCurrent,
                    val_fy_start: valFyStart,
                    val_prev_fy_start: prevYearFacts[metric] || 0, // Maps to the first historical column
                    val_prev_fy_end: valFyStart, // Maps to the second historical column (Prev FY End)
                    val_prev_m_end: valPmEnd,
                    val_y_eod: valYesterday,
                    growth_fy: valCurrent - valFyStart,
                    growth_month: valCurrent - valPmEnd,
                    growth_day: valCurrent - valYesterday,
                    status: 'NEUTRAL'
                };
            });

            // Clean old panel data and insert new
            await prisma.misInformationPanel.deleteMany({ where: { snapshotId: snapshot.id } });
            await prisma.misInformationPanel.createMany({ data: panelRecords });

            // 4. Trigger Rule Engine for Exceptions
            await RuleEvaluator.evaluateSnapshot(snapshot.id);

            createdCount++;
        }

        logger.info('SNAPSHOT_GEN_COMPLETE', { count: createdCount, skipped: skippedCount });
        return { success: true, count: createdCount, skipped: skippedCount };
    }
}
