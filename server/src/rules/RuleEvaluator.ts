import prisma from '../lib/prisma';
import { ExceptionSeverity, ExceptionType } from '../types/mis';
import config from './config.json';

/**
 * Domain Service: Pure business logic for rule evaluation.
 * Hardcoded thresholds have been externalized to config.json.
 */
export class RuleEvaluator {
    
    /**
     * Determines if a metric movement represents a "Major Swing" (Risk).
     */
    static isCriticalSwing(prevVal: number, currentSwing: number): boolean {
        if (prevVal === 0) return false;
        const threshold = config.riskThresholds.criticalSwing;
        return (Math.abs(currentSwing) / Math.abs(prevVal)) > threshold;
    }

    /**
     * Evaluates a snapshot against configured business rules.
     */
    static async evaluateSnapshot(snapshotId: string) {
        const snapshot = await prisma.misSnapshot.findUnique({
            where: { id: snapshotId },
            include: { panelData: true }
        });

        if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`);

        const exceptions: any[] = [];
        const { highCashExcess } = config.riskThresholds;

        for (const row of snapshot.panelData) {
            const growth = Number(row.growth_day || 0);
            const current = Number(row.val_current || 0);
            const prev = Number(row.val_y_eod || 0);

            // 1. Cash Position Rules
            if (row.parameter === 'Cash_Excess' && Math.abs(current) > highCashExcess) {
                exceptions.push({
                    snapshotId: snapshot.id,
                    unitId: snapshot.unitId,
                    type: ExceptionType.LIQUIDITY,
                    severity: ExceptionSeverity.HIGH,
                    parameter: row.parameter,
                    message: current > 0 ? `Excess cash detected: ${current.toFixed(2)} Lakhs.` : `Cash deficit: ${Math.abs(current).toFixed(2)} Lakhs.`,
                    triggerValue: String(current),
                    ruleId: 'RULE-CASH-01',
                    status: 'OPEN',
                    businessDate: snapshot.businessDate
                });
            }

            // 2. Critical Portfolio Swing
            if (this.isCriticalSwing(prev, growth)) {
                 exceptions.push({
                    snapshotId: snapshot.id,
                    unitId: snapshot.unitId,
                    type: ExceptionType.RISK,
                    severity: ExceptionSeverity.CRITICAL,
                    parameter: row.parameter,
                    message: `Significant portfolio swing detected (${((Math.abs(growth)/Math.abs(prev))*100).toFixed(1)}%).`,
                    triggerValue: String(growth),
                    ruleId: 'RULE-OP-SWING',
                    status: 'OPEN',
                    businessDate: snapshot.businessDate
                });
            }
        }

        // Persist findings
        await prisma.misException.deleteMany({ where: { snapshotId } });
        if (exceptions.length > 0) {
            await prisma.misException.createMany({ data: exceptions });
        }
    }

    static async evaluate(snapshotId: string) {
        return await this.evaluateSnapshot(snapshotId);
    }
}
