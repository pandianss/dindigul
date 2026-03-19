import prisma from '../lib/prisma';
import { MisParameter, ExceptionSeverity, ExceptionType } from '../types/mis';



export class RuleEngine {
    static async evaluate(snapshotId: string) {
        const snapshot = await prisma.misSnapshot.findUnique({
            where: { id: snapshotId },
            include: { panelData: true }
        });

        if (!snapshot) return;

        // Fetch category info for dynamic rule application
        const parameters = await prisma.misParameterRegistry.findMany({
            where: { parameterName: { in: snapshot.panelData.map(p => p.parameter) } }
        });
        const paramMap = Object.fromEntries(parameters.map(p => [p.parameterName, p]));

        const exceptions: any[] = [];

        for (const row of snapshot.panelData) {
            const metadata = paramMap[row.parameter];
            const isKeyBusinessParam = metadata?.category === 'Key Business Parameters';
            const isBetterLow = ['NPA', 'EXPENSE', 'COST', 'PROVISION'].some(k => row.parameter.toUpperCase().includes(k));

            // Rule 1: Operational Risk (+/- 10% daily swing in Key Parameters)
            if (isKeyBusinessParam) {
                const prevVal = Math.abs(Number(row.val_y_eod || 0));
                const currentSwing = Math.abs(Number(row.growth_day || 0));

                if (prevVal > 0 && (currentSwing / prevVal) > 0.1) {
                    const direction = Number(row.growth_day) > 0 ? 'Increase' : 'Decrease';
                    exceptions.push({
                        type: ExceptionType.RISK,
                        severity: ExceptionSeverity.CRITICAL,
                        parameter: row.parameter,
                        message: `Significant daily ${direction.toLowerCase()} detected (${((currentSwing / prevVal) * 100).toFixed(1)}%). Potential operational error or major portfolio shift.`,
                        triggerValue: `${Number(row.growth_day).toFixed(2)}`,
                        ruleId: 'RULE-OP-RISK'
                    });
                }
            }

            // Rule 2: Monthly Growth (Negative growth in Other Parameters)
            if (!isKeyBusinessParam && !isBetterLow && Number(row.growth_month || 0) < 0) {
                exceptions.push({
                    type: ExceptionType.GROWTH,
                    severity: ExceptionSeverity.MEDIUM,
                    parameter: row.parameter,
                    message: `Negative growth for the month: ${Number(row.growth_month).toFixed(2)}. Portfolio performance lagging.`,
                    triggerValue: String(row.growth_month),
                    ruleId: 'RULE-MONTHLY-GROWTH'
                });
            }

            // Rule 3: NPA Rise (Critical)
            if (row.parameter === 'NPA' && Number(row.growth_day) > 0) {
                exceptions.push({
                    type: ExceptionType.RISK,
                    severity: ExceptionSeverity.CRITICAL,
                    parameter: row.parameter,
                    message: `NPA increased by ${Number(row.growth_day).toFixed(2)}. Immediate attention required.`,
                    triggerValue: String(row.growth_day),
                    ruleId: 'RULE-RISK-01'
                });
            }

            // Rule 4: CD Ratio Threshold
            if (row.parameter === 'CD_Ratio' && Number(row.val_current) > 85) {
                exceptions.push({
                    type: ExceptionType.LIQUIDITY,
                    severity: ExceptionSeverity.HIGH,
                    parameter: row.parameter,
                    message: `CD Ratio above 85% safety limit: ${Number(row.val_current).toFixed(2)}%`,
                    triggerValue: `${Number(row.val_current).toFixed(2)}%`,
                    ruleId: 'RULE-LIQ-01'
                });
            }

            // Rule 5: Cash Deficit — branch holding less cash than CRL
            if (row.parameter === 'Cash_Excess' && Number(row.val_current) < 0) {
                exceptions.push({
                    type: ExceptionType.LIQUIDITY,
                    severity: ExceptionSeverity.HIGH,
                    parameter: row.parameter,
                    message: `Cash deficit of ₹ ${Math.abs(Number(row.val_current)).toFixed(2)} Lakhs — branch holding below Cash Required Level.`,
                    triggerValue: `${Number(row.val_current).toFixed(2)}`,
                    ruleId: 'RULE-CASH-01'
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

    static async evaluateBatch(snapshotIds: string[]) {
        const snapshots = await prisma.misSnapshot.findMany({
            where: { id: { in: snapshotIds } },
            include: { panelData: true }
        });

        if (snapshots.length === 0) return;

        // Fetch category info for dynamic rule application (once per batch)
        const allParameterNames = [...new Set(snapshots.flatMap(s => s.panelData.map(p => p.parameter)))];
        const parameters = await prisma.misParameterRegistry.findMany({
            where: { parameterName: { in: allParameterNames } }
        });
        const paramMap = Object.fromEntries(parameters.map(p => [p.parameterName, p]));

        const allExceptions: any[] = [];

        for (const snapshot of snapshots) {
            for (const row of snapshot.panelData) {
                const metadata = paramMap[row.parameter];
                const isKeyBusinessParam = metadata?.category === 'Key Business Parameters';
                const isBetterLow = ['NPA', 'EXPENSE', 'COST', 'PROVISION'].some(k => row.parameter.toUpperCase().includes(k));

                // Rule 1: Operational Risk (+/- 10% daily swing in Key Parameters)
                if (isKeyBusinessParam) {
                    const prevVal = Math.abs(Number(row.val_y_eod || 0));
                    const currentSwing = Math.abs(Number(row.growth_day || 0));

                    if (prevVal > 0 && (currentSwing / prevVal) > 0.1) {
                        const direction = Number(row.growth_day) > 0 ? 'Increase' : 'Decrease';
                        allExceptions.push({
                            snapshotId: snapshot.id,
                            unitId: snapshot.unitId,
                            businessDate: snapshot.businessDate,
                            type: ExceptionType.RISK,
                            severity: ExceptionSeverity.CRITICAL,
                            parameter: row.parameter,
                            message: `Significant daily ${direction.toLowerCase()} detected (${((currentSwing / prevVal) * 100).toFixed(1)}%). Potential operational error or major portfolio shift.`,
                            triggerValue: `${Number(row.growth_day).toFixed(2)}`,
                            ruleId: 'RULE-OP-RISK',
                            status: 'OPEN'
                        });
                    }
                }

                // Rule 2: Monthly Growth (Negative growth in Other Parameters)
                if (!isKeyBusinessParam && !isBetterLow && Number(row.growth_month || 0) < 0) {
                    allExceptions.push({
                        snapshotId: snapshot.id,
                        unitId: snapshot.unitId,
                        businessDate: snapshot.businessDate,
                        type: ExceptionType.GROWTH,
                        severity: ExceptionSeverity.MEDIUM,
                        parameter: row.parameter,
                        message: `Negative growth for the month: ${Number(row.growth_month).toFixed(2)}. Portfolio performance lagging.`,
                        triggerValue: String(row.growth_month),
                        ruleId: 'RULE-MONTHLY-GROWTH',
                        status: 'OPEN'
                    });
                }

                // Rule 3: NPA Rise (Critical)
                if (row.parameter === 'NPA' && Number(row.growth_day) > 0) {
                    allExceptions.push({
                        snapshotId: snapshot.id,
                        unitId: snapshot.unitId,
                        businessDate: snapshot.businessDate,
                        type: ExceptionType.RISK,
                        severity: ExceptionSeverity.CRITICAL,
                        parameter: row.parameter,
                        message: `NPA increased by ${Number(row.growth_day).toFixed(2)}. Immediate attention required.`,
                        triggerValue: String(row.growth_day),
                        ruleId: 'RULE-RISK-01',
                        status: 'OPEN'
                    });
                }

                // Rule 4: CD Ratio Threshold
                if (row.parameter === 'CD_Ratio' && Number(row.val_current) > 85) {
                    allExceptions.push({
                        snapshotId: snapshot.id,
                        unitId: snapshot.unitId,
                        businessDate: snapshot.businessDate,
                        type: ExceptionType.LIQUIDITY,
                        severity: ExceptionSeverity.HIGH,
                        parameter: row.parameter,
                        message: `CD Ratio above 85% safety limit: ${Number(row.val_current).toFixed(2)}%`,
                        triggerValue: `${Number(row.val_current).toFixed(2)}%`,
                        ruleId: 'RULE-LIQ-01',
                        status: 'OPEN'
                    });
                }

                // Rule 5: Cash Deficit
                if (row.parameter === 'Cash_Excess' && Number(row.val_current) < 0) {
                    allExceptions.push({
                        snapshotId: snapshot.id,
                        unitId: snapshot.unitId,
                        businessDate: snapshot.businessDate,
                        type: ExceptionType.LIQUIDITY,
                        severity: ExceptionSeverity.HIGH,
                        parameter: row.parameter,
                        message: `Cash deficit of ₹ ${Math.abs(Number(row.val_current)).toFixed(2)} Lakhs — branch holding below Cash Required Level.`,
                        triggerValue: `${Number(row.val_current).toFixed(2)}`,
                        ruleId: 'RULE-CASH-01',
                        status: 'OPEN'
                    });
                }
            }
        }

        // Persist Exceptions Batch
        await prisma.misException.deleteMany({
            where: { snapshotId: { in: snapshotIds } }
        });

        if (allExceptions.length > 0) {
            await prisma.misException.createMany({
                data: allExceptions
            });
        }
    }
}
