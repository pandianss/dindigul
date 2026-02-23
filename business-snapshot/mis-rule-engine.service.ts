
import { Injectable, Logger } from '@nestjs/common';
import { MisSnapshot, MisInformationPanel, MisException } from '@prisma/client';
import { ExceptionSeverity, ExceptionType, MisParameter } from '../prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { SystemTaskService } from '../kernel/protocol/system-task.service';

@Injectable()
export class MisRuleEngineService {
    private readonly logger = new Logger(MisRuleEngineService.name);

    constructor(
        private prisma: PrismaService,
        private taskService: SystemTaskService
    ) { }

    async evaluate(snapshotId: string) {
        const snapshot = await this.prisma.misSnapshot.findUnique({
            where: { id: snapshotId },
            include: { panelData: true }
        });

        if (!snapshot) return;

        const exceptions: Partial<MisException>[] = [];

        // RULE CLASS 1: Budget Control
        exceptions.push(...this.checkBudgetControl(snapshot, snapshot.panelData));

        // RULE CLASS 2: Daily Deterioration
        exceptions.push(...this.checkDailyDeterioration(snapshot, snapshot.panelData));

        // RULE CLASS 3: Yield & Cost
        exceptions.push(...this.checkYieldAndCost(snapshot, snapshot.panelData));

        // RULE CLASS 7: Liquidity
        exceptions.push(...this.checkLiquidity(snapshot, snapshot.panelData));

        // Persist Exceptions
        if (exceptions.length > 0) {
            for (const e of exceptions) {
                const created = await this.prisma.misException.create({
                    data: {
                        snapshotId: snapshot.id,
                        unitId: snapshot.unitId,
                        businessDate: snapshot.businessDate,
                        type: e.type!,
                        severity: e.severity!,
                        parameter: e.parameter!,
                        message: e.message!,
                        triggerValue: e.triggerValue,
                        ruleId: e.ruleId,
                        status: 'OPEN'
                    }
                });

                // For CRITICAL exceptions, create a SystemTask for coordination
                if (created.severity === ExceptionSeverity.CRITICAL) {
                    const task = await this.taskService.createTask({
                        title: `CRITICAL: ${created.type} - ${created.parameter}`,
                        description: `Automated exception detected: ${created.message}. Trigger Value: ${created.triggerValue}`,
                        priority: 'CRITICAL',
                        unitId: created.unitId,
                        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h SLA
                    });

                    // Link exception back to Task
                    await this.prisma.misException.update({
                        where: { id: created.id },
                        data: { taskId: task.id }
                    });
                }
            }
            this.logger.log(`Processed ${exceptions.length} exceptions for Snapshot ${snapshot.id}`);
        }
    }

    // RULE CLASS 1: Budget Control
    private checkBudgetControl(snapshot: MisSnapshot, panel: MisInformationPanel[]): Partial<MisException>[] {
        const exs: Partial<MisException>[] = [];

        for (const row of panel) {
            // Check Gap
            if (row.gap_month && row.budget_month && Number(row.budget_month) > 0) {
                const gapPercent = (Number(row.gap_month) / Number(row.budget_month)) * 100;

                // Threshold: > 10% Gap is HIGH Severity
                if (gapPercent > 10) {
                    exs.push({
                        type: ExceptionType.BUDGET_CONTROL,
                        severity: ExceptionSeverity.HIGH,
                        parameter: row.parameter,
                        message: `Budget Gap > 10% (${gapPercent.toFixed(1)}%)`,
                        triggerValue: `${gapPercent.toFixed(1)}%`,
                        ruleId: 'RULE-01-BUDGET-GAP'
                    });
                }
            }
        }
        return exs;
    }

    // RULE CLASS 2: Daily Deterioration
    private checkDailyDeterioration(snapshot: MisSnapshot, panel: MisInformationPanel[]): Partial<MisException>[] {
        const exs: Partial<MisException>[] = [];

        for (const row of panel) {
            // Deposit Fall
            if (row.parameter === MisParameter.DEPOSIT_TOTAL || row.parameter === MisParameter.CASA) {
                if (Number(row.growth_day) < 0) {
                    exs.push({
                        type: ExceptionType.GROWTH,
                        severity: ExceptionSeverity.MEDIUM,
                        parameter: row.parameter,
                        message: `Daily fall detected: ${row.growth_day}`,
                        triggerValue: String(row.growth_day),
                        ruleId: 'RULE-02-DAILY-FALL'
                    });
                }
            }

            // GNPA Rise
            if (row.parameter === MisParameter.GNPA) {
                if (Number(row.growth_day) > 0) {
                    exs.push({
                        type: ExceptionType.RISK,
                        severity: ExceptionSeverity.CRITICAL,
                        parameter: row.parameter,
                        message: `GNPA Increased by ${row.growth_day}`,
                        triggerValue: String(row.growth_day),
                        ruleId: 'RULE-02-GNPA-RISE'
                    });
                }
            }
        }
        return exs;
    }

    // RULE CLASS 3: Yield & Cost
    private checkYieldAndCost(snapshot: MisSnapshot, panel: MisInformationPanel[]): Partial<MisException>[] {
        const exs: Partial<MisException>[] = [];

        for (const row of panel) {
            // Yield check (< 7% is LOW relative to cost)
            if (row.parameter === MisParameter.YIELD_ADVANCES) {
                if (Number(row.val_current) < 7) {
                    exs.push({
                        type: ExceptionType.BUDGET_CONTROL,
                        severity: ExceptionSeverity.HIGH,
                        parameter: row.parameter,
                        message: `Yield on advances below 7% threshold: ${row.val_current}%`,
                        triggerValue: `${row.val_current}%`,
                        ruleId: 'RULE-03-LOW-YIELD'
                    });
                }
            }

            // Cost check (> 6% is HIGH)
            if (row.parameter === MisParameter.COST_DEPOSITS) {
                if (Number(row.val_current) > 6) {
                    exs.push({
                        type: ExceptionType.BUDGET_CONTROL,
                        severity: ExceptionSeverity.MEDIUM,
                        parameter: row.parameter,
                        message: `Cost of deposits above 6% threshold: ${row.val_current}%`,
                        triggerValue: `${row.val_current}%`,
                        ruleId: 'RULE-03-HIGH-COST'
                    });
                }
            }
        }
        return exs;
    }

    // RULE CLASS 7: Liquidity
    private checkLiquidity(snapshot: MisSnapshot, panel: MisInformationPanel[]): Partial<MisException>[] {
        const exs: Partial<MisException>[] = [];

        for (const row of panel) {
            // CD Ratio check (> 85% is HIGH)
            if (row.parameter === MisParameter.CD_RATIO) {
                if (Number(row.val_current) > 85) {
                    exs.push({
                        type: ExceptionType.LIQUIDITY,
                        severity: ExceptionSeverity.HIGH,
                        parameter: row.parameter,
                        message: `CD Ratio above 85% safety limit: ${row.val_current}%`,
                        triggerValue: `${row.val_current}%`,
                        ruleId: 'RULE-07-CD-RATIO'
                    });
                }
            }
        }
        return exs;
    }
}
