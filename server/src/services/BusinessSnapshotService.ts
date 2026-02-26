import prisma from '../lib/prisma';
import { RuleEngine } from './RuleEngine';

export const MisParameter = {
    DEPOSIT_TOTAL: 'Total Dep',
    CASA: 'CASA',
    SB: 'SB',
    CD: 'CD',
    TD: 'TD',
    ADVANCE_TOTAL: 'Adv',
    BUSINESS_TOTAL: 'Bus',
    NPA: 'NPA',
    CD_RATIO: 'CD_Ratio',
    YIELD_ADVANCES: 'YIELD_ADVANCES',
    COST_DEPOSITS: 'COST_DEPOSITS',
    ADV_RETAIL: 'ADV_RETAIL',
    ADV_SME: 'ADV_SME',
    ADV_AGRI: 'ADV_AGRI',
    ADV_OTHER: 'ADV_OTHER',
    SMA0: 'SMA0',
    SMA1: 'SMA1',
    SMA2: 'SMA2'
};

export const MisStatus = {
    PROVISIONAL: 'PROVISIONAL',
    FINAL: 'FINAL'
};

export class BusinessSnapshotService {
    static async getSnapshot(unitCode: string, date: string) {
        const branch = await prisma.branch.findUnique({ where: { code: unitCode } });
        if (!branch) return null;

        const [y, m, d] = date.split('-').map(Number);
        const businessDate = new Date(Date.UTC(y, m - 1, d));

        const snapshot = await prisma.misSnapshot.findUnique({
            where: { unitId_businessDate_version: { unitId: branch.id, businessDate, version: 1 } },
            include: { panelData: true, exceptions: true }
        });

        if (!snapshot) return null;

        const parameters = await prisma.misParameterRegistry.findMany({
            where: { parameterName: { in: snapshot.panelData.map(p => p.parameter) } }
        });
        const paramMap = Object.fromEntries(parameters.map(p => [p.parameterName, p]));

        const enrichedPanelData = snapshot.panelData.map(p => {
            const data: any = { ...p };
            Object.keys(data).forEach(key => {
                if (key.startsWith('val_') || key.startsWith('growth_') || key.startsWith('budget_') || key.startsWith('gap_')) {
                    data[key] = Number(data[key] || 0);
                }
            });
            data.metadata = paramMap[p.parameter] || {
                displayName: p.parameter.replace(/_/g, ' '),
                category: 'Uncategorized'
            };
            return data;
        });

        return {
            ...snapshot,
            branch,
            panelData: enrichedPanelData
        };
    }

    static async generateFromStaging(date: string) {
        const [y, m, d] = date.split('-').map(Number);
        const businessDate = new Date(Date.UTC(y, m - 1, d));

        // Fetch Data from all sources
        const unitFinancials = await prisma.stgUnitFinancialsDaily.findMany({ where: { businessDate } });
        const portfolioData = await prisma.stgUserVerticalDaily.findMany({ where: { businessDate } });
        const misFacts = await prisma.fact.findMany({ where: { date: businessDate } });

        if (unitFinancials.length === 0 && portfolioData.length === 0 && misFacts.length === 0) {
            throw new Error(`No staging or MIS data found for date: ${date}`);
        }

        // Identify all affected units
        const stagingUnitCodes = [...new Set([...unitFinancials.map(uf => uf.unitCode), ...portfolioData.map(pd => pd.unitCode)])];
        const branchesFromStaging = await prisma.branch.findMany({ where: { code: { in: stagingUnitCodes } } });

        const allUnitIds = [...new Set([
            ...branchesFromStaging.map(b => b.id),
            ...misFacts.map(f => f.unitId)
        ])];

        const portfolioAggs: Record<string, any> = {};
        for (const row of portfolioData) {
            if (!portfolioAggs[row.unitCode]) {
                portfolioAggs[row.unitCode] = { retail: 0, sme: 0, agri: 0, other: 0, sma0: 0, sma1: 0, sma2: 0 };
            }
            const agg = portfolioAggs[row.unitCode];
            const bal = Number(row.outstanding || 0);
            const vert = (row.vertical || '').toUpperCase();
            if (vert.includes('RETAIL')) agg.retail += bal;
            else if (vert.includes('SME')) agg.sme += bal;
            else if (vert.includes('AGRI')) agg.agri += bal;
            else agg.other += bal;

            const sma = (row.smaType || '').toUpperCase();
            if (sma === 'SMA0') agg.sma0 += bal;
            else if (sma === 'SMA1') agg.sma1 += bal;
            else if (sma === 'SMA2') agg.sma2 += bal;
        }

        const results = [];
        for (const unitId of allUnitIds) {
            const branch = await prisma.branch.findUnique({ where: { id: unitId } });
            if (!branch) continue;

            const uf = unitFinancials.find(u => u.unitCode === branch.code);

            await prisma.$transaction(async (tx) => {
                // 1. If we have staging data, update Facts first
                if (uf) {
                    const log = await tx.ingestionLog.create({
                        data: {
                            unitId: branch.id,
                            status: 'PROCESSED',
                            filename: 'SNAPSHOT_JOB_STAGING',
                            meta: { source: 'STAGING_ACCOUNT_DAILY' }
                        }
                    });

                    await tx.fact.deleteMany({ where: { unitId: branch.id, date: businessDate } });

                    const sb = Number(uf.sbBalance || 0);
                    const cd = Number(uf.cdBalance || 0);
                    const td = Number(uf.tdBalance || 0);
                    const adv = Number(uf.advBalance || 0);
                    const dep = sb + cd + td;
                    const casa = sb + cd;
                    const port = portfolioAggs[uf.unitCode] || { retail: 0, sme: 0, agri: 0, other: 0, sma0: 0, sma1: 0, sma2: 0 };

                    await tx.fact.createMany({
                        data: [
                            { unitId: branch.id, date: businessDate, metric: MisParameter.DEPOSIT_TOTAL, value: dep, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.CASA, value: casa, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.SB, value: sb, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.CD, value: cd, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.TD, value: td, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.ADVANCE_TOTAL, value: adv, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.BUSINESS_TOTAL, value: dep + adv, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.ADV_RETAIL, value: port.retail, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.ADV_SME, value: port.sme, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.ADV_AGRI, value: port.agri, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.ADV_OTHER, value: port.other, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.NPA, value: port.gnpa || 0, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.CD_RATIO, value: dep > 0 ? (adv / dep) * 100 : 0, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.SMA0, value: port.sma0, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.SMA1, value: port.sma1, ingestionId: log.id },
                            { unitId: branch.id, date: businessDate, metric: MisParameter.SMA2, value: port.sma2, ingestionId: log.id }
                        ]
                    });
                }

                // 2. Create Snapshot Header
                const snapshot = await tx.misSnapshot.upsert({
                    where: { unitId_businessDate_version: { unitId: branch.id, businessDate, version: 1 } },
                    create: { unitId: branch.id, businessDate, status: MisStatus.PROVISIONAL, version: 1 },
                    update: { status: MisStatus.PROVISIONAL }
                });

                // 3. Populate Information Panel (using whatever facts are now in DB)
                await this.populatePanelInternal(tx, snapshot.id, branch.id, businessDate);
                results.push({ unitCode: branch.code, snapshotId: snapshot.id });
            });
        }

        return { success: true, processedCount: results.length, businessDate };
    }

    public static async populatePanelInternal(tx: any, snapshotId: string, unitId: string, date: Date) {
        // Fetch all enabled parameters from registry
        const registeredParams = await tx.misParameterRegistry.findMany({
            where: { isEnabled: true },
            orderBy: { orderIndex: 'asc' }
        });

        const metrics = registeredParams.length > 0
            ? registeredParams.map((p: any) => p.parameterName)
            : [MisParameter.DEPOSIT_TOTAL, MisParameter.CASA, MisParameter.ADVANCE_TOTAL, MisParameter.BUSINESS_TOTAL];

        const branch = await tx.branch.findUnique({ where: { id: unitId } });
        if (!branch) return;

        // Clear existing panel data
        await tx.misInformationPanel.deleteMany({ where: { snapshotId } });

        // Temporal Setup
        const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const yesterday = new Date(utcDate); yesterday.setUTCDate(utcDate.getUTCDate() - 1);
        const dby = new Date(utcDate); dby.setUTCDate(utcDate.getUTCDate() - 2);
        const prevMonthEnd = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), 0));

        // Fiscal Year calculation (Dindigul FY starts April 1, we use March 31 eod as Opening/Start)
        let fyYear = utcDate.getUTCMonth() < 3 ? utcDate.getUTCFullYear() - 1 : utcDate.getUTCFullYear();
        const fyStart = new Date(Date.UTC(fyYear, 2, 31)); // March 31 of current FY start year
        const fyEnd = new Date(Date.UTC(fyYear + 1, 2, 31));

        const prevFyStart = new Date(Date.UTC(fyYear - 1, 2, 31)); // March 31 of previous FY start year
        const prevFyEnd = new Date(Date.UTC(fyYear, 2, 31));

        // Budget setup
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const getPeriodKey = (d: Date) => `${months[d.getUTCMonth()]}-${d.getUTCFullYear().toString().slice(-2)}`;
        const currMonthKey = getPeriodKey(utcDate);

        // Quarter setup: Per user request, quarterly budget = target of the last month of that quarter
        const qEndMonth = (Math.floor(utcDate.getUTCMonth() / 3) * 3) + 2;
        const qEndYear = utcDate.getUTCFullYear();
        const quarterEndMonthKey = getPeriodKey(new Date(Date.UTC(qEndYear, qEndMonth, 1)));

        for (const metric of metrics) {
            let val_current = await this.getMetricValue(tx, unitId, metric, utcDate);
            let val_y_eod = await this.getMetricValue(tx, unitId, metric, yesterday);
            let val_dby = await this.getMetricValue(tx, unitId, metric, dby);
            let val_prev_m_end = await this.getMetricValue(tx, unitId, metric, prevMonthEnd);
            let val_fy_start = await this.getMetricValue(tx, unitId, metric, fyStart);
            let val_prev_fy_start = await this.getMetricValue(tx, unitId, metric, prevFyStart);
            let val_prev_fy_end = await this.getMetricValue(tx, unitId, metric, prevFyEnd);

            // Dynamic derived metrics for CD_Ratio if facts are missing
            if (metric === 'CD_Ratio' && val_current === 0) {
                const adv = await this.getMetricValue(tx, unitId, 'Adv', utcDate);
                const dep = await this.getMetricValue(tx, unitId, 'Total Dep', utcDate);
                if (dep > 0) val_current = (adv / dep) * 100;
            }

            const growth_day = Number(val_current) - Number(val_y_eod);
            const growth_month = Number(val_current) - Number(val_prev_m_end);
            const growth_fy = Number(val_current) - Number(val_fy_start);
            const growth_prev_fy = Number(val_prev_fy_end) - Number(val_prev_fy_start);

            // Budget Monthly
            const budgetItem = await tx.budgetMaster.findFirst({
                where: { solId: branch.code, parameterName: metric, periodKey: currMonthKey, isActive: true }
            });
            const budget_month = Number(budgetItem?.targetValue || 0);
            const gap_month = Number(val_current) - budget_month;

            // Budget Quarter: Just use the target of the last month of the quarter
            const qBudgetItem = await tx.budgetMaster.findFirst({
                where: { solId: branch.code, parameterName: metric, periodKey: quarterEndMonthKey, isActive: true }
            });
            const budget_quarter = Number(qBudgetItem?.targetValue || 0);
            const gap_quarter = Number(val_current) - budget_quarter;

            // Status logic
            let status = 'Neutral';
            if (budget_month > 0) {
                if (gap_month >= 0) status = 'Surpassed';
                else if (Math.abs(gap_month) < budget_month * 0.1) status = 'Positive';
                else status = 'Negative';
            } else {
                status = growth_day >= 0 ? 'Positive' : 'Negative';
            }

            await tx.misInformationPanel.create({
                data: {
                    snapshotId,
                    parameter: metric,
                    val_prev_fy_start,
                    val_prev_fy_end,
                    val_fy_start,
                    val_fy_end: 0, // Not typically used as future date
                    val_prev_m_end,
                    val_dby,
                    val_y_eod,
                    val_current,
                    growth_prev_fy,
                    growth_day,
                    growth_month,
                    growth_fy,
                    budget_month,
                    gap_month,
                    budget_quarter,
                    gap_quarter,
                    status
                }
            });
        }
    }

    private static async getMetricValue(tx: any, unitId: string, metric: string, date: Date): Promise<number> {
        // Broaden range to +/- 12 hours to handle UTC/IST midnight shifts
        const startSearch = new Date(date.getTime() - (12 * 60 * 60 * 1000));
        const endSearch = new Date(date.getTime() + (12 * 60 * 60 * 1000));

        const fact = await tx.fact.findFirst({
            where: {
                unitId,
                metric,
                date: {
                    gte: startSearch,
                    lte: endSearch
                }
            },
            orderBy: { date: 'desc' }
        });
        return fact ? Number(fact.value) : 0;
    }

    static async freezeSnapshot(snapshotId: string) {
        const frozen = await prisma.misSnapshot.update({
            where: { id: snapshotId },
            data: {
                status: MisStatus.FINAL,
                frozenAt: new Date()
            },
            include: { panelData: true }
        });

        // Trigger Evaluation
        await RuleEngine.evaluate(snapshotId);

        return frozen;
    }
}
