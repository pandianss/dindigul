import prisma from '../lib/prisma';
import { ExceptionSeverity, ExceptionType } from '../types/mis';

type PanelRow = {
    parameter: string;
    val_current?: unknown;
    val_y_eod?: unknown;
    growth_day?: unknown;
};

type SnapshotForRules = {
    id: string;
    unitId: string;
    businessDate: Date;
    panelData: PanelRow[];
};

type ParameterMetadata = {
    category?: string | null;
};

type ExceptionDraft = {
    snapshotId: string;
    unitId: string;
    businessDate: Date;
    type: string;
    severity: string;
    parameter: string;
    message: string;
    triggerValue: string;
    ruleId: string;
    status: 'OPEN';
};

const KEY_PARAMETER_CATEGORY = 'Key Business Parameters';
const LOWER_IS_BETTER_TERMS = ['NPA', 'EXPENSE', 'COST', 'PROVISION'];
const CD_RATIO_PARAMETERS = new Set(['CD_Ratio', 'CD Ratio']);
const CASA_PARAMETERS = new Set(['CASA%', 'CASA']);
const PROFIT_PARAMETERS = new Set(['Operating Profit (Loss)', 'Profit', 'NET_PROFIT', 'BRANCH_PL']);

function toNumber(value: unknown): number {
    return Number(value || 0);
}

function isLowerBetter(parameter: string): boolean {
    const normalized = parameter.toUpperCase();
    return LOWER_IS_BETTER_TERMS.some(term => normalized.includes(term));
}

function isOperationalSwingCandidate(parameter: string, isKeyBusinessParam: boolean): boolean {
    return isKeyBusinessParam && !CASA_PARAMETERS.has(parameter) && !CD_RATIO_PARAMETERS.has(parameter);
}

function buildException(
    snapshot: SnapshotForRules,
    details: Omit<ExceptionDraft, 'snapshotId' | 'unitId' | 'businessDate' | 'status'>
): ExceptionDraft {
    return {
        snapshotId: snapshot.id,
        unitId: snapshot.unitId,
        businessDate: snapshot.businessDate,
        ...details,
        status: 'OPEN'
    };
}

function buildExceptionsForSnapshot(
    snapshot: SnapshotForRules,
    paramMap: Record<string, ParameterMetadata | undefined>
): ExceptionDraft[] {
    const exceptions: ExceptionDraft[] = [];

    for (const row of snapshot.panelData) {
        const metadata = paramMap[row.parameter];
        const isKeyBusinessParam = metadata?.category === KEY_PARAMETER_CATEGORY;
        const growthDay = toNumber(row.growth_day);
        const currentValue = toNumber(row.val_current);

        if (isOperationalSwingCandidate(row.parameter, isKeyBusinessParam)) {
            const prevVal = Math.abs(toNumber(row.val_y_eod));
            const currentSwing = Math.abs(growthDay);

            if (prevVal > 0 && (currentSwing / prevVal) > 0.1) {
                const direction = growthDay > 0 ? 'increase' : 'decrease';
                exceptions.push(buildException(snapshot, {
                    type: ExceptionType.RISK,
                    severity: ExceptionSeverity.CRITICAL,
                    parameter: row.parameter,
                    message: `Significant daily ${direction} detected (${((currentSwing / prevVal) * 100).toFixed(1)}%). Potential operational error or major portfolio shift.`,
                    triggerValue: growthDay.toFixed(2),
                    ruleId: 'RULE-OP-RISK'
                }));
            }
        }

        if (!isKeyBusinessParam && !isLowerBetter(row.parameter) && growthDay < 0) {
            exceptions.push(buildException(snapshot, {
                type: ExceptionType.GROWTH,
                severity: ExceptionSeverity.MEDIUM,
                parameter: row.parameter,
                message: `Negative daily movement detected: ${growthDay.toFixed(2)}. Portfolio performance lagging.`,
                triggerValue: String(row.growth_day),
                ruleId: 'RULE-DAILY-DECLINE'
            }));
        }

        if (row.parameter === 'NPA' && growthDay > 0) {
            exceptions.push(buildException(snapshot, {
                type: ExceptionType.RISK,
                severity: ExceptionSeverity.CRITICAL,
                parameter: row.parameter,
                message: `NPA increased by ${growthDay.toFixed(2)}. Immediate attention required.`,
                triggerValue: String(row.growth_day),
                ruleId: 'RULE-RISK-01'
            }));
        }

        if (CD_RATIO_PARAMETERS.has(row.parameter) && currentValue > 85) {
            exceptions.push(buildException(snapshot, {
                type: ExceptionType.LIQUIDITY,
                severity: ExceptionSeverity.HIGH,
                parameter: row.parameter,
                message: `CD Ratio above 85% safety limit: ${currentValue.toFixed(2)}%`,
                triggerValue: `${currentValue.toFixed(2)}%`,
                ruleId: 'RULE-LIQ-01'
            }));
        }

        if (row.parameter === 'Cash_Excess' && Math.abs(currentValue) > 0.01) {
            const isExcess = currentValue > 0;
            exceptions.push(buildException(snapshot, {
                type: ExceptionType.LIQUIDITY,
                severity: ExceptionSeverity.HIGH,
                parameter: row.parameter,
                message: isExcess
                    ? `Excess cash holding of Rs. ${currentValue.toFixed(2)} Lakhs - branch holding above authorized CRL.`
                    : `Cash deficit of Rs. ${Math.abs(currentValue).toFixed(2)} Lakhs - branch holding below Cash Required Level.`,
                triggerValue: currentValue.toFixed(2),
                ruleId: 'RULE-CASH-01'
            }));
        }

        if (PROFIT_PARAMETERS.has(row.parameter) && currentValue < 0) {
            exceptions.push(buildException(snapshot, {
                type: ExceptionType.RISK,
                severity: ExceptionSeverity.HIGH,
                parameter: 'Profit',
                message: `Net Loss recorded for the period: Rs. ${Math.abs(currentValue).toFixed(2)} Lakhs. Immediate analysis of income/expenditure gaps required.`,
                triggerValue: currentValue.toFixed(2),
                ruleId: 'RULE-PROFIT-01'
            }));
        }
    }

    return exceptions;
}

async function loadParameterMap(parameterNames: string[]) {
    if (parameterNames.length === 0) return {};

    const parameters = await prisma.misParameterRegistry.findMany({
        where: { parameterName: { in: [...new Set(parameterNames)] } }
    });

    return Object.fromEntries(parameters.map(p => [p.parameterName, p]));
}

export class RuleEngine {
    static async evaluate(snapshotId: string) {
        const snapshot = await prisma.misSnapshot.findUnique({
            where: { id: snapshotId },
            include: { panelData: true }
        });

        if (!snapshot) return;

        const paramMap = await loadParameterMap(snapshot.panelData.map(p => p.parameter));
        const exceptions = buildExceptionsForSnapshot(snapshot, paramMap);

        await prisma.misException.deleteMany({
            where: { snapshotId }
        });

        if (exceptions.length > 0) {
            await prisma.misException.createMany({
                data: exceptions
            });
        }
    }

    static async evaluateBatch(snapshotIds: string[]) {
        if (snapshotIds.length === 0) return;

        const snapshots = await prisma.misSnapshot.findMany({
            where: { id: { in: snapshotIds } },
            include: { panelData: true }
        });

        if (snapshots.length === 0) return;

        const paramMap = await loadParameterMap(snapshots.flatMap(s => s.panelData.map(p => p.parameter)));
        const allExceptions = snapshots.flatMap(snapshot => buildExceptionsForSnapshot(snapshot, paramMap));

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
