import prisma from '../lib/prisma';

export const ExceptionSeverity = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
};

export const ExceptionType = {
    BUDGET_CONTROL: 'BUDGET_CONTROL',
    GROWTH: 'GROWTH',
    RISK: 'RISK',
    LIQUIDITY: 'LIQUIDITY'
};

// These should match the constants in BusinessSnapshotService
const MisParameter = {
    DEPOSIT_TOTAL: 'Total Dep',
    CASA: 'CASA',
    NPA: 'NPA',
    CD_RATIO: 'CD_Ratio',
    YIELD_ADVANCES: 'YIELD_ADVANCES',
    COST_DEPOSITS: 'COST_DEPOSITS'
};

export class RuleEngine {
    static async evaluate(snapshotId: string) {
        const snapshot = await prisma.misSnapshot.findUnique({
            where: { id: snapshotId },
            include: { panelData: true }
        });

        if (!snapshot) return;

        const exceptions: any[] = [];

        for (const row of snapshot.panelData) {
            // Rule 1: Daily Fall in Primary Metrics
            if ((row.parameter === MisParameter.DEPOSIT_TOTAL || row.parameter === MisParameter.CASA) && Number(row.growth_day) < 0) {
                exceptions.push({
                    type: ExceptionType.GROWTH,
                    severity: ExceptionSeverity.MEDIUM,
                    parameter: row.parameter,
                    message: `Daily fall detected: ${Number(row.growth_day).toFixed(2)}`,
                    triggerValue: String(row.growth_day),
                    ruleId: 'RULE-FALL-01'
                });
            }

            // Rule 2: NPA Rise (Critical)
            if (row.parameter === MisParameter.NPA && Number(row.growth_day) > 0) {
                exceptions.push({
                    type: ExceptionType.RISK,
                    severity: ExceptionSeverity.CRITICAL,
                    parameter: row.parameter,
                    message: `NPA increased by ${Number(row.growth_day).toFixed(2)}`,
                    triggerValue: String(row.growth_day),
                    ruleId: 'RULE-RISK-01'
                });
            }

            // Rule 3: CD Ratio Threshold
            if (row.parameter === MisParameter.CD_RATIO && Number(row.val_current) > 85) {
                exceptions.push({
                    type: ExceptionType.LIQUIDITY,
                    severity: ExceptionSeverity.HIGH,
                    parameter: row.parameter,
                    message: `CD Ratio above 85% safety limit: ${Number(row.val_current).toFixed(2)}%`,
                    triggerValue: `${Number(row.val_current).toFixed(2)}%`,
                    ruleId: 'RULE-LIQ-01'
                });
            }

            // Rule 4: Yield and Cost anomalies
            if (row.parameter === MisParameter.YIELD_ADVANCES && Number(row.val_current) < 7) {
                exceptions.push({
                    type: ExceptionType.BUDGET_CONTROL,
                    severity: ExceptionSeverity.HIGH,
                    parameter: row.parameter,
                    message: `Yield on advances below 7% threshold: ${Number(row.val_current).toFixed(2)}%`,
                    triggerValue: `${Number(row.val_current).toFixed(2)}%`,
                    ruleId: 'RULE-YIELD-01'
                });
            }
        }

        // Persist Exceptions
        if (exceptions.length > 0) {
            // Clear old exceptions for this snapshot
            await prisma.misException.deleteMany({
                where: { snapshotId }
            });

            await prisma.misException.createMany({
                data: exceptions.map(e => ({
                    snapshotId,
                    unitId: snapshot.unitId,
                    businessDate: snapshot.businessDate,
                    ...e,
                    status: 'OPEN'
                }))
            });
        }
    }
}
