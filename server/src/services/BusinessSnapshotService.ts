import prisma from '../lib/prisma';
import { RuleEngine } from './RuleEngine';

export const MisParameter = {
    DEPOSIT_TOTAL: 'DEPOSIT_TOTAL',
    CASA: 'CASA',
    SB: 'SB',
    CD: 'CD',
    TD: 'TD',
    ADV: 'ADV',
    BUS: 'BUS',
    ADVANCE_TOTAL: 'ADVANCE_TOTAL',
    BUSINESS_TOTAL: 'BUSINESS_TOTAL',
    GNPA: 'GNPA',
    YIELD_ADVANCES: 'YIELD_ADVANCES',
    COST_DEPOSITS: 'COST_DEPOSITS',
    CD_RATIO: 'CD_RATIO',
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
        if (!branch) throw new Error('Branch not found');

        const businessDate = new Date(date);

        return prisma.misSnapshot.findUnique({
            where: {
                unitId_businessDate_version: {
                    unitId: branch.id,
                    businessDate,
                    version: 1
                }
            },
            include: {
                panelData: true,
                exceptions: true
            }
        });
    }

    static async generateFromStaging(date: string) {
        const businessDate = new Date(date);

        // Fetch Staging Data
        const unitFinancials = await prisma.stgUnitFinancialsDaily.findMany({ where: { businessDate } });
        const portfolioData = await prisma.stgUserVerticalDaily.findMany({ where: { businessDate } });

        if (unitFinancials.length === 0 && portfolioData.length === 0) {
            throw new Error(`No staging data found for date: ${date}`);
        }

        const results = [];

        // Aggregate Portfolio per unit
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

        for (const uf of unitFinancials) {
            const branch = await prisma.branch.findUnique({ where: { code: uf.unitCode } });
            if (!branch) continue;

            await prisma.$transaction(async (tx) => {
                // a. Create Ingestion Log
                const log = await tx.ingestionLog.create({
                    data: {
                        unitId: branch.id,
                        status: 'PROCESSED',
                        filename: 'SNAPSHOT_JOB_STAGING',
                        meta: { source: 'STAGING_ACCOUNT_DAILY' }
                    }
                });

                // b. Clear/Create Facts
                await tx.fact.deleteMany({ where: { unitId: branch.id, date: businessDate } });

                const sb = Number(uf.sbBalance || 0);
                const cd = Number(uf.cdBalance || 0);
                const td = Number(uf.tdBalance || 0);
                const adv = Number(uf.advBalance || 0);
                const dep = sb + cd + td;
                const bus = dep + adv;
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
                        { unitId: branch.id, date: businessDate, metric: MisParameter.BUSINESS_TOTAL, value: bus, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: MisParameter.ADV_RETAIL, value: port.retail, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: MisParameter.ADV_SME, value: port.sme, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: MisParameter.ADV_AGRI, value: port.agri, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: MisParameter.ADV_OTHER, value: port.other, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: MisParameter.SMA0, value: port.sma0, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: MisParameter.SMA1, value: port.sma1, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: MisParameter.SMA2, value: port.sma2, ingestionId: log.id }
                    ]
                });

                // c. Create Snapshot Header
                const snapshot = await tx.misSnapshot.upsert({
                    where: { unitId_businessDate_version: { unitId: branch.id, businessDate, version: 1 } },
                    create: {
                        unitId: branch.id,
                        businessDate,
                        status: MisStatus.PROVISIONAL,
                        version: 1
                    },
                    update: {
                        status: MisStatus.PROVISIONAL
                    }
                });

                // d. Populate Information Panel
                await this.populatePanelInternal(tx, snapshot.id, branch.id, businessDate);

                results.push({ unitCode: uf.unitCode, snapshotId: snapshot.id });
            });
        }

        return { success: true, processedCount: results.length, businessDate };
    }

    private static async populatePanelInternal(tx: any, snapshotId: string, unitId: string, date: Date) {
        const metrics = [
            MisParameter.DEPOSIT_TOTAL,
            MisParameter.CASA,
            MisParameter.ADVANCE_TOTAL,
            MisParameter.BUSINESS_TOTAL,
            MisParameter.GNPA
        ];

        const yesterday = new Date(date); yesterday.setDate(date.getDate() - 1);
        const dayBeforeYesterday = new Date(date); dayBeforeYesterday.setDate(date.getDate() - 2);
        const prevMonthEnd = new Date(date.getFullYear(), date.getMonth(), 0);
        let fyYear = date.getFullYear(); if (date.getMonth() < 3) fyYear--;
        const fyStart = new Date(fyYear, 3, 1);

        for (const metric of metrics) {
            const val_current = await this.getMetricValue(tx, unitId, metric, date);
            const val_y_eod = await this.getMetricValue(tx, unitId, metric, yesterday);
            const val_dby = await this.getMetricValue(tx, unitId, metric, dayBeforeYesterday);
            const val_prev_m_end = await this.getMetricValue(tx, unitId, metric, prevMonthEnd);
            const val_fy_start = await this.getMetricValue(tx, unitId, metric, fyStart);

            const growth_day = Number(val_current) - Number(val_y_eod);
            const growth_month = Number(val_current) - Number(val_prev_m_end);
            const growth_fy = Number(val_current) - Number(val_fy_start);

            await tx.misInformationPanel.create({
                data: {
                    snapshotId,
                    parameter: metric,
                    val_fy_start,
                    val_prev_m_end,
                    val_dby,
                    val_y_eod,
                    val_current,
                    growth_day,
                    growth_month,
                    growth_fy,
                    budget_month: 0,
                    gap_month: 0
                }
            });
        }
    }

    private static async getMetricValue(tx: any, unitId: string, metric: string, date: Date): Promise<number> {
        const fact = await tx.fact.findFirst({
            where: { unitId, metric, date },
            orderBy: { createdAt: 'desc' }
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
