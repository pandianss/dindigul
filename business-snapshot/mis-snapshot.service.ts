
import { Injectable, Logger, ConflictException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MisStatus, MisParameter, MisBlockType } from '../prisma/enums';
import { MisRuleEngineService } from './mis-rule-engine.service';
import { MisFactLoader } from './services/domain/mis-fact-loader.service';

@Injectable()
export class MisSnapshotService {
    private readonly logger = new Logger(MisSnapshotService.name);

    constructor(
        private prisma: PrismaService,
        // Forward Ref if circular dependency arises (often does with Services calling each other)
        @Inject(forwardRef(() => MisRuleEngineService))
        private ruleEngine: MisRuleEngineService,
        private factLoader: MisFactLoader
    ) { }

    async getSnapshot(unitCode: string, date: string) {
        const unit = await this.prisma.unit.findUnique({ where: { code: unitCode } });
        if (!unit) throw new NotFoundException('Unit not found');

        const businessDate = new Date(date);

        return this.prisma.misSnapshot.findUnique({
            where: {
                unitId_businessDate_version: {
                    unitId: unit.id,
                    businessDate: businessDate,
                    version: 1 // Default to latest version logic later
                }
            },
            include: {
                panelData: true,
                dqiDetails: true,
                exceptions: true
            }
        });
    }

    async createProvisionalSnapshot(unitCode: string, date: string) {
        const unit = await this.prisma.unit.findUnique({ where: { code: unitCode } });
        if (!unit) throw new NotFoundException('Unit not found');

        const businessDate = new Date(date);

        // Check if already exists
        const existing = await this.prisma.misSnapshot.findFirst({
            where: { unitId: unit.id, businessDate, status: MisStatus.FINAL }
        });

        if (existing) {
            throw new ConflictException('Final snapshot already exists for this date. Use Restatement flow.');
        }

        // 1. Create Snapshot Header
        const snapshot = await this.prisma.misSnapshot.create({
            data: {
                unitId: unit.id,
                businessDate,
                status: MisStatus.PROVISIONAL,
                version: 1
            }
        });

        // 2. Compute Information Panel (Mock Logic for Proto)
        // In real impl, this aggregates from `FACT` table
        await this.populatePanel(snapshot.id, unit.id, businessDate);

        return snapshot;
    }

    private async populatePanel(snapshotId: string, unitId: string, date: Date) {
        const metrics = [
            MisParameter.DEPOSIT_TOTAL,
            MisParameter.CASA,
            MisParameter.ADVANCE_TOTAL,
            MisParameter.BUSINESS_TOTAL,
            MisParameter.GNPA
        ];

        // Dates for Anchors
        const yesterday = new Date(date);
        yesterday.setDate(date.getDate() - 1);

        const dayBeforeYesterday = new Date(date);
        dayBeforeYesterday.setDate(date.getDate() - 2);

        const prevMonthEnd = new Date(date.getFullYear(), date.getMonth(), 0);

        // Fiscal Year Start (April 1st)
        let fyYear = date.getFullYear();
        if (date.getMonth() < 3) fyYear--; // if Jan-Mar, FY start is previous year Apr
        const fyStart = new Date(fyYear, 3, 1);

        for (const metric of metrics) {
            const val_current = await this.getMetricValue(unitId, metric, date);
            const val_y_eod = await this.getMetricValue(unitId, metric, yesterday);
            const val_dby = await this.getMetricValue(unitId, metric, dayBeforeYesterday);
            const val_prev_m_end = await this.getMetricValue(unitId, metric, prevMonthEnd);
            const val_fy_start = await this.getMetricValue(unitId, metric, fyStart);

            const growth_day = val_current - val_y_eod;
            const growth_month = val_current - val_prev_m_end;
            const growth_fy = val_current - val_fy_start;

            await this.prisma.misInformationPanel.create({
                data: {
                    snapshotId,
                    parameter: metric,
                    val_fy_start,
                    val_fy_end: 0, // Not used for now
                    val_prev_m_end,
                    val_dby,
                    val_y_eod,
                    val_current,
                    growth_day,
                    growth_month,
                    growth_fy,
                    budget_month: 0, // Fetch from Budget Service in future
                    gap_month: 0
                }
            });
        }
    }

    private async getMetricValue(unitId: string, metric: string, date: Date): Promise<number> {
        const fact = await this.prisma.fact.aggregate({
            where: {
                unitId,
                metric,
                date: {
                    lte: date // Often we take the latest value up to that date, or sum if it's flow. Assuming stock for now.
                }
            },
            _sum: { value: true },
            orderBy: { date: 'desc' },
            take: 1
        } as any); // Aggregation doesn't support take/orderBy normally, but we want the specific state.

        // Actually, for specific date:
        const specificFact = await this.prisma.fact.findFirst({
            where: { unitId, metric, date },
            orderBy: { createdAt: 'desc' }
        });

        return specificFact ? Number(specificFact.value) : 0;
    }

    async freezeSnapshot(snapshotId: string) {
        const frozen = await this.prisma.misSnapshot.update({
            where: { id: snapshotId },
            data: {
                status: MisStatus.FINAL,
                frozenAt: new Date()
            }
        });

        // Trigger Async Rule Engine
        // In a real system, this might be a job queue
        // For now, we do it inline-async (fire and forget)
        this.ruleEngine.evaluate(frozen.id).catch(e => this.logger.error(e));

        return frozen;
    }

    async getIngestionStatus(unitCode: string, date: string) {
        const unit = await this.prisma.unit.findUnique({ where: { code: unitCode } });
        if (!unit) throw new NotFoundException('Unit not found');

        const businessDate = new Date(date);

        // 1. Find all facts for this date/unit
        const factSummary = await this.prisma.fact.groupBy({
            by: ['metric'],
            where: { unitId: unit.id, date: businessDate },
            _count: { _all: true }
        });

        // 2. Find associated ingestion logs
        const facts = await this.prisma.fact.findMany({
            where: { unitId: unit.id, date: businessDate },
            select: { ingestionId: true },
            distinct: ['ingestionId']
        });

        const ingestionIds = facts.map(f => f.ingestionId);

        const logs = ingestionIds.length > 0 ? await this.prisma.ingestionLog.findMany({
            where: { id: { in: ingestionIds } },
            include: { user: { select: { name: true } } },
            orderBy: { createdAt: 'desc' }
        }) : [];

        return {
            unitCode,
            date: businessDate,
            isReady: factSummary.length > 3, // Heuristic: Need at least 4 metrics for a useful snapshot
            factCount: factSummary.reduce((acc, f) => acc + f._count._all, 0),
            metricsFound: factSummary.map(f => f.metric),
            logs: logs.map(l => ({
                id: l.id,
                filename: l.filename,
                status: l.status,
                uploadedBy: l.user?.name || 'System',
                createdAt: l.createdAt
            }))
        };
    }

    // Updated to use Domain Service (B3 Refactoring)
    async generateFromStaging(date: string, userId: string) {
        const businessDate = new Date(date);

        // 1. Verify Verticals (Gating)
        const readiness = await this.prisma.ingestionVerticalStatus.findMany({
            where: { businessDate },
        });

        // @ts-ignore
        const blockers = readiness.filter(r => r.isFreezeBlocker && r.status !== 'READY_FOR_MIS');
        if (blockers.length > 0) {
            throw new ConflictException(`Snapshot Gated: ${blockers.length} mandatory verticals are not READY.`);
        }

        // 2. Delegate to Domain Service for Aggregation
        const { unitAggregates, portfolioAggregates } = await this.factLoader.loadFactsFromStaging(businessDate);


        if (Object.keys(unitAggregates).length === 0 && Object.keys(portfolioAggregates).length === 0) {
            throw new NotFoundException('No staging data found for this business date.');
        }

        // 3. Persist to Fact and Create Snapshots
        const results = [];
        for (const [unitCode, stats] of Object.entries(unitAggregates)) {
            const unit = await this.prisma.unit.findUnique({ where: { code: unitCode } });
            if (!unit) continue;

            await this.prisma.$transaction(async (tx) => {
                // a. Create Ingestion Log record for the snapshot
                const log = await tx.ingestionLog.create({
                    data: {
                        unitId: unit.id,
                        status: 'PROCESSED', // This string is now legacy, but schema supports it
                        filename: 'SNAPSHOT_GEN',
                        // userId, // Removed from schema in Phase 1 A1 rewrite, needs audit if needed back
                        meta: { source: 'STAGING_ACCOUNT_DAILY', rowCount: 0 } // simplified
                    }
                });

                // b. Create Fresh Facts (or overwrite)
                // Delete existing facts for this unit/date if any
                await tx.fact.deleteMany({
                    where: { unitId: unit.id, date: businessDate }
                });

                const portfolioStats = portfolioAggregates[unitCode] || { retail: 0, sme: 0, agri: 0, other: 0, sma0: 0, sma1: 0, sma2: 0 };
                const s = stats as any;

                await tx.fact.createMany({
                    data: [
                        { unitId: unit.id, date: businessDate, metric: MisParameter.DEPOSIT_TOTAL, value: s.deposit, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.CASA, value: s.casa, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.SB, value: s.sb, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.CD, value: s.cd, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.TD, value: s.td, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.ADV, value: s.adv, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.BUS, value: s.bus, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.ADVANCE_TOTAL, value: s.adv, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.BUSINESS_TOTAL, value: s.bus, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.GNPA, value: 0, ingestionId: log.id },

                        // Portfolio Segments
                        { unitId: unit.id, date: businessDate, metric: MisParameter.ADV_RETAIL, value: portfolioStats.retail, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.ADV_SME, value: portfolioStats.sme, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.ADV_AGRI, value: portfolioStats.agri, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.ADV_OTHER, value: portfolioStats.other, ingestionId: log.id },

                        // SMA Buckets
                        { unitId: unit.id, date: businessDate, metric: MisParameter.SMA0, value: portfolioStats.sma0, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.SMA1, value: portfolioStats.sma1, ingestionId: log.id },
                        { unitId: unit.id, date: businessDate, metric: MisParameter.SMA2, value: portfolioStats.sma2, ingestionId: log.id },
                    ]
                });

                // c. Create MIS Snapshot Header
                const snapshot = await tx.misSnapshot.upsert({
                    where: {
                        unitId_businessDate_version: { unitId: unit.id, businessDate, version: 1 }
                    },
                    create: {
                        unitId: unit.id,
                        businessDate,
                        status: MisStatus.PROVISIONAL,
                        version: 1
                    },
                    update: {
                        status: MisStatus.PROVISIONAL
                    }
                });

                // d. Repopulate Panel (using newly created facts)
                await this.populatePanel(snapshot.id, unit.id, businessDate);

                // @ts-ignore
                results.push({ unitCode, snapshotId: snapshot.id });
            });
        }

        return {
            success: true,
            unitsProcessed: results.length,
            businessDate
        };
    }
}
