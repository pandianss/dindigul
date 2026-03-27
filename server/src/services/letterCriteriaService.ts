import prisma from '../lib/prisma';
import { getRegionalOfficeData } from './pdfService';
import { generateReference } from './referenceService';

// ── Config helpers ────────────────────────────────────────────────────────────

async function loadCriteria() {
    const rows = await prisma.systemConfig.findMany({ where: { group: 'LETTER_CRITERIA' } });
    const get = (key: string) => rows.find(r => r.key === key)?.value ?? '';

    return {
        enabledParamCodes: get('LETTER_ENABLED_PARAMS').split(',').map(s => s.trim()).filter(Boolean),
        appreciationTopN: parseInt(get('LETTER_APPRECIATION_TOP_N') || '3'),
        explanationBottomN: parseInt(get('LETTER_EXPLANATION_BOTTOM_N') || '3'),
        appreciationThreshold: parseFloat(get('LETTER_APPRECIATION_THRESHOLD') || '100'),
        explanationThreshold: parseFloat(get('LETTER_EXPLANATION_THRESHOLD') || '80'),
        invertParamCodes: get('LETTER_INVERT_PARAMS').split(',').map(s => s.trim()).filter(Boolean),
        fyDeclineParamCodes: get('LETTER_FY_DECLINE_PARAMS').split(',').map(s => s.trim()).filter(Boolean),
        opRiskFromExceptions: get('LETTER_OPRISK_FROM_EXCEPTIONS') === 'true',
        opRiskSeverities: get('LETTER_OPRISK_SEVERITIES').split(',').map(s => s.trim()).filter(Boolean),
    };
}

// ── Org metadata ──────────────────────────────────────────────────────────────

export async function getCurrentOrgMeta() {
    return await getRegionalOfficeData();
}

// ── March 31st baseline ───────────────────────────────────────────────────────

async function getMarchFigure(branchId: string, paramId: string, referenceDate: Date, paramCode?: string, targetUnit?: string, latestValue?: number) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth(); // 0-indexed
    const marchYear = month <= 2 ? year - 1 : year;
    const marchStart = new Date(marchYear, 1, 1); // Feb 1st (safety margin)
    const marchEnd = new Date(marchYear, 2, 31, 23, 59, 59); // March 31st

    // 1. Try Snapshot table first
    const snap = await (prisma as any).snapshot.findFirst({
        where: { 
            branchId, 
            parameterId: paramId, 
            date: { gte: marchStart, lte: marchEnd } 
        },
        orderBy: { date: 'desc' }
    });

    let value = 0;
    if (snap?.value) {
        value = Number(snap.value);
    } else if (paramCode) {
        // 2. Fallback to MisInformationPanel
        const mapping: Record<string, string> = {
            'TOTAL_ADVANCES': 'Adv',
            'TOTAL_DEPOSITS': 'Total Dep',
            'CASA': 'CASA',
            'GROSS_NPA': 'NPA',
            'CASA_RATIO': 'CASA%'
        };
        const misParam = mapping[paramCode];
        if (misParam) {
            const misPanel = await (prisma as any).misInformationPanel.findFirst({
                where: {
                    snapshot: { unitId: branchId },
                    parameter: misParam
                },
                orderBy: { snapshot: { businessDate: 'desc' } }
            });

            if (misPanel?.val_prev_fy_end) {
                value = Number(misPanel.val_prev_fy_end);
            }
        }
    }

    // ── Smart Scaling Heuristic ──────────────────────────────────────────────────
    // If the target unit is Crores, but the historical value is > 100x the current value,
    // it's highly likely the historical data was stored in Lakhs.
    if (targetUnit === 'Cr' && latestValue !== undefined && latestValue > 0) {
        if (value > latestValue * 10) { 
            // If historical is 10x larger than current, it's likely Lakhs vs Cr (100x difference normally, but allow for growth)
            value = value / 100;
        }
    }

    return { value, date: marchEnd };
}

// ── Achievement % ─────────────────────────────────────────────────────────────

function achievementPct(actual: number, budget: number, invert: boolean): number {
    if (budget === 0) return actual === 0 ? 100 : (invert ? 0 : 200);
    if (invert) {
        return (budget / actual) * 100;
    }
    return (actual / budget) * 100;
}

// ── Letter content templates ──────────────────────────────────────────────────

function buildAppreciationContent(
    branchName: string, headDesignation: string,
    paramName: string, period: string,
    actual: number, budget: number
): string {
    return `Dear Sir/Madam,

We are pleased to formally acknowledge the outstanding performance of the ${branchName} Branch under your leadership as ${headDesignation} for the period of ${period}.

A review of the branch's performance in the ${paramName} portfolio reveals an achievement of ₹ ${actual.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr against the assigned target of ₹ ${budget.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr.

[PERFORMANCE_TABLE]

Such dedication and a results-oriented approach are highly appreciated by the Management. We place on record our appreciation for the diligent efforts of you and your entire team. We trust you will continue to maintain this momentum and strive for even greater milestones in the upcoming quarters.

Keep up the excellent work!`;
}

function buildExplanationContent(
    branchName: string, headDesignation: string,
    paramName: string, period: string,
    actual: number, budget: number
): string {
    return `Dear Sir/Madam,

We draw your urgent attention to the performance of the ${branchName} Branch for the period of ${period}, specifically regarding the ${paramName} portfolio.

A detailed review indicates a significant shortfall in achieving the allocated target. Against an expected budget of ₹ ${budget.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr, the branch has achieved ₹ ${actual.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr. This underperformance is a matter of serious concern for the Management.

[PERFORMANCE_TABLE]

As the ${headDesignation}, you are requested to analyse the reasons for this shortfall and formulate a concrete, time-bound Plan of Action to bridge this gap. Please submit the detailed Plan of Action to the Regional Office within 7 working days.

We expect a marked improvement in your branch's performance in the coming weeks. Please treat this matter with the highest priority.`;
}

function buildOpRiskContent(
    branchName: string, headDesignation: string,
    period: string
): string {
    return `Dear Sir/Madam,

The Risk Monitoring System has flagged the following operational risk exceptions for the ${branchName} Branch during ${period}:

[EXCEPTION_TABLE]

Further, a review of the branch's daily business movement indicates the following trends:

[MOVEMENT_TABLE]

The above exceptions and business movements require your immediate attention. You are requested to analyze the reasons and submit a written response outlining the corrective measures to the Regional Office within 3 working days.

Failure to address these observations in a timely manner may result in escalation to higher management.`;
}

async function getDailyMovement(branchId: string, referenceDate: Date) {
    const params = [
        { code: 'TOTAL_DEPOSITS', mis: 'Total Dep', name: 'Total Deposits' },
        { code: 'TOTAL_ADVANCES', mis: 'Adv', name: 'Total Advances' },
        { code: 'CASA', mis: 'CASA', name: 'CASA' },
        { code: 'GROSS_NPA', mis: 'NPA', name: 'Gross NPA' },
        { code: 'PROFIT_LOSS', mis: 'Branch_PL', name: 'Profit & Loss' }
    ];

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(branch?.type?.toUpperCase() || '') || branch?.code === '3933';
    const scale = !isRegional ? 100 : 1;

    const movements = [];

    for (const p of params) {
        let snaps: any[] = [];
        const param = await (prisma as any).parameter.findUnique({ where: { code: p.code } });
        
        if (param) {
            // Try snapshots first for the most accurate/historical data, limited by the reference date
            snaps = await (prisma as any).snapshot.findMany({
                where: { branchId, parameterId: param.id, date: { lte: referenceDate } },
                orderBy: { date: 'desc' },
                take: 2
            });
        }

        if (snaps.length >= 2) {
            const latest = Number(snaps[0].value);
            const previous = Number(snaps[1].value);
            const diff = latest - previous;
            const pct = previous !== 0 ? (diff / previous) * 100 : 0;

            movements.push({
                parameter: p.name,
                previousValue: previous,
                latestValue: latest,
                movement: diff,
                pct: pct
            });
        } else {
            // Fallback to MisInformationPanel (pre-calculated from upload) for that specific date
            const mis = await (prisma as any).misInformationPanel.findFirst({
                where: { 
                    snapshot: { unitId: branchId, businessDate: referenceDate },
                    parameter: p.mis
                }
            });

            if (mis) {
                const latest = parseFloat(mis.val_current || '0') / scale;
                const movement = parseFloat(mis.growth_day || '0') / scale;
                const previous = latest - movement;
                const pct = previous !== 0 ? (movement / previous) * 100 : 0;

                movements.push({
                    parameter: p.name,
                    previousValue: previous,
                    latestValue: latest,
                    movement: movement,
                    pct: pct
                });
            }
        }
    }

    return movements;
}

// ── Core evaluation function ──────────────────────────────────────────────────

export interface GenerationResult {
    created: number;
    skipped: number;
    details: { branch: string; param: string; type: string; reason: string }[];
}

export async function generateLettersForPeriod(
    period: string, 
    options: { date?: string; type?: 'PERFORMANCE' | 'OP_RISK' | 'ALL' } = {}
): Promise<GenerationResult> {
    const { date, type = 'ALL' } = options;
    const criteria = await loadCriteria();
    const orgMeta = await getCurrentOrgMeta();
    const result: GenerationResult = { created: 0, skipped: 0, details: [] };

    const toTitleCase = (s: string) =>
        (s || '').toLowerCase().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // ── 1. Performance Assessment ─────────────────────────────────────────────
    if (type === 'ALL' || type === 'PERFORMANCE') {
        // PURGE ALL DRAFTS for Performance types BEFORE generation
        await (prisma as any).letter.deleteMany({
            where: { 
                type: { in: ['APPRECIATION', 'EXPLANATION'] },
                status: 'DRAFT'
            }
        });
        for (const paramCode of criteria.enabledParamCodes) {
            const param = await (prisma as any).parameter.findUnique({ where: { code: paramCode } });
            if (!param) {
                result.details.push({ branch: '-', param: paramCode, type: '-', reason: 'Parameter not found' });
                continue;
            }

            const isInverted = criteria.invertParamCodes.includes(paramCode);
            
            // If specific date provided, only look for snapshots on that date
            const snapshotQuery: any = { parameterId: param.id };
            if (date) {
                const [y, m, d] = date.split('-').map(Number);
                snapshotQuery.date = new Date(Date.UTC(y, m - 1, d));
            }

            const snapshots = await (prisma as any).snapshot.findMany({
                where: snapshotQuery,
                orderBy: { date: 'desc' },
                include: {
                    branch: {
                        include: {
                            headUser: { include: { designation: true, department: true } }
                        }
                    }
                }
            });

            const seen = new Set<string>();
            const uniqueSnaps: any[] = [];
            for (const s of snapshots) {
                if (s.branchId && !seen.has(s.branchId)) {
                    if (s.branch?.type === 'REGIONAL OFFICE') continue;
                    seen.add(s.branchId);
                    uniqueSnaps.push(s);
                }
            }

            if (uniqueSnaps.length === 0) continue;

            const annotated = uniqueSnaps.map(s => {
                const scaledBudget = param.unit === 'Cr' ? (s.budget || 0) / 100 : (s.budget || 0);
                return {
                    ...s,
                    scaledBudget,
                    achievementPct: achievementPct(s.value, scaledBudget, isInverted)
                };
            });

            annotated.sort((a, b) => b.achievementPct - a.achievementPct);

            const appreciationCandidates: typeof annotated = [];
            const explanationCandidates: typeof annotated = [];
            const checkFyDecline = criteria.fyDeclineParamCodes.includes(paramCode);
            const declineCandidates: typeof annotated = [];

            for (const s of annotated) {
                const marchInfo = await getMarchFigure(s.branchId, param.id, s.date, param.code, param.unit, s.value);
                s.marchInfo = marchInfo;
                if (checkFyDecline) {
                    const isDecline = isInverted ? (s.value > marchInfo.value) : (s.value < marchInfo.value);
                    if (isDecline) declineCandidates.push(s);
                }
            }

            if (criteria.appreciationThreshold > 0) {
                for (const s of annotated) {
                    if (s.achievementPct >= criteria.appreciationThreshold) {
                        appreciationCandidates.push(s);
                    } else if (s.achievementPct < criteria.explanationThreshold) {
                        explanationCandidates.push(s);
                    }
                }
                appreciationCandidates.splice(criteria.appreciationTopN);
                explanationCandidates.splice(criteria.explanationBottomN);
            } else {
                appreciationCandidates.push(...annotated.slice(0, criteria.appreciationTopN));
                explanationCandidates.push(...annotated.slice(-criteria.explanationBottomN).reverse());
            }

            for (const s of declineCandidates) {
                if (!explanationCandidates.find(c => c.branchId === s.branchId)) {
                    explanationCandidates.push(s);
                }
            }

            for (const snap of appreciationCandidates) {
                const existing = await (prisma as any).letter.findFirst({
                    where: { branchId: snap.branchId, parameterId: param.id, period, type: 'APPRECIATION' }
                });
                
                if (existing) {
                    if (existing.status === 'SENT') {
                        result.skipped++;
                        continue;
                    }
                    await (prisma as any).letter.delete({ where: { id: existing.id } });
                }

                const headDesignation = toTitleCase(snap.branch.headUser?.designation?.nameEn || 'Branch Head');
                const marchInfo = snap.marchInfo;
                const gap = snap.value - snap.scaledBudget;
                const deptName = snap.branch.headUser?.department?.nameEn || 'PLNG';
                const referenceNo = await generateReference('LETTER', deptName, snap.date);

                const performanceData = {
                    march31stDate: marchInfo.date, march31st: marchInfo.value,
                    latestDate: snap.date, latest: snap.value,
                    budget: snap.scaledBudget, gap, status: gap >= 0 ? '+ve' : '-ve',
                    isInverted
                };

                const letter = await (prisma as any).letter.create({
                    data: {
                        type: 'APPRECIATION',
                        titleEn: `${param.nameEn} Achievement - ${period}`,
                        contentEn: buildAppreciationContent(toTitleCase(snap.branch.nameEn), headDesignation, param.nameEn, period, snap.value, snap.scaledBudget),
                        branchId: snap.branchId,
                        parameterId: param.id,
                        valueAtTime: snap.value,
                        budgetAtTime: snap.scaledBudget,
                        period,
                        orgMeta: { ...orgMeta, performanceData }
                    }
                });

                await (prisma as any).$executeRaw`
                    UPDATE letters SET "referenceNo" = ${referenceNo} WHERE id = ${letter.id}
                `;
                result.created++;
            }

            for (const snap of explanationCandidates) {
                const alreadyApprec = appreciationCandidates.some(a => a.branchId === snap.branchId);
                if (alreadyApprec) continue;

                const existing = await (prisma as any).letter.findFirst({
                    where: { branchId: snap.branchId, parameterId: param.id, period, type: 'EXPLANATION' }
                });

                if (existing) {
                    if (existing.status === 'SENT') {
                        result.skipped++;
                        continue;
                    }
                    await (prisma as any).letter.delete({ where: { id: existing.id } });
                }

                const headDesignation = snap.branch.type === 'REGIONAL OFFICE' 
                    ? "Region Head" 
                    : toTitleCase(snap.branch.headUser?.designation?.nameEn || 'Branch Head');
                const marchInfo = snap.marchInfo;
                const gap = snap.value - snap.scaledBudget;
                const deptName = snap.branch.headUser?.department?.nameEn || 'PLNG';
                const referenceNo = await generateReference('LETTER', deptName, snap.date);

                const performanceData = {
                    march31stDate: marchInfo.date, march31st: marchInfo.value,
                    latestDate: snap.date, latest: snap.value,
                    budget: snap.scaledBudget, gap, status: gap >= 0 ? '+ve' : '-ve',
                    isInverted
                };

                const letter = await (prisma as any).letter.create({
                    data: {
                        type: 'EXPLANATION',
                        titleEn: `Review of ${param.nameEn} Performance - ${period}`,
                        contentEn: buildExplanationContent(toTitleCase(snap.branch.nameEn), headDesignation, param.nameEn, period, snap.value, snap.scaledBudget),
                        branchId: snap.branchId,
                        parameterId: param.id,
                        valueAtTime: snap.value,
                        budgetAtTime: snap.scaledBudget,
                        period,
                        orgMeta: { ...orgMeta, performanceData }
                    }
                });

                await (prisma as any).$executeRaw`
                    UPDATE letters SET "referenceNo" = ${referenceNo} WHERE id = ${letter.id}
                `;
                result.created++;
            }
        }
    }

    // ── 2. Operational Risk ────────────────────────────────────────────────────
    if ((type === 'ALL' || type === 'OP_RISK') && criteria.opRiskFromExceptions) {
        const [y, m, d] = (date || '').split('-').map(Number);
        const businessDate = date ? new Date(Date.UTC(y, m - 1, d)) : new Date();
        const displayPeriod = date ? `${String(businessDate.getUTCDate()).padStart(2, '0')}.${String(businessDate.getUTCMonth() + 1).padStart(2, '0')}.${businessDate.getUTCFullYear()}` : period;

        // PURGE ALL DRAFTS for this type BEFORE generation
        // This ensures a clean slate as requested by the user: "older records [should be] purged"
        // We remove the 'period' filter to ensure Feb 2026 drafts are gone when generating Mar 16.
        await (prisma as any).letter.deleteMany({
            where: { 
                type: 'OP_RISK',
                status: 'DRAFT'
            }
        });

        // Use a range to be safe against any time-of-day offsets
        const startOfDay = new Date(businessDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(businessDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const exceptionQuery: any = { 
            severity: { in: criteria.opRiskSeverities.length > 0 ? criteria.opRiskSeverities : ['CRITICAL', 'HIGH'] }, 
            status: 'OPEN',
            businessDate: { gte: startOfDay, lte: endOfDay },
            branch: { type: { not: 'REGIONAL OFFICE' } }
        };

        const criticalExceptions = await prisma.misException.findMany({
            where: exceptionQuery,
            include: { branch: { include: { headUser: { include: { designation: true, department: true } } } } }
        });

        const byBranch = new Map<string, typeof criticalExceptions>();
        for (const ex of criticalExceptions) {
            const arr = byBranch.get(ex.unitId) || [];
            arr.push(ex);
            byBranch.set(ex.unitId, arr);
        }

        for (const [unitId, exceptions] of byBranch) {
            const branch = exceptions[0].branch;
            
            // Check if ANY non-draft letter remains (e.g. SENT)
            const existingNonDraft = await (prisma as any).letter.findFirst({
                where: { branchId: unitId, period: displayPeriod, type: 'OP_RISK', status: { not: 'DRAFT' } }
            });

            if (existingNonDraft) {
                result.skipped++;
                continue;
            }

            const headDesignation = toTitleCase(branch.headUser?.designation?.nameEn || 'Branch Head');
            const deptName = branch.headUser?.department?.nameEn || 'PLNG';
            const refDate = date ? businessDate : new Date();
            const referenceNo = await generateReference('LETTER', deptName, refDate);
            const dailyMovement = await getDailyMovement(unitId, refDate);
            
            const letter = await (prisma as any).letter.create({
                data: {
                    type: 'OP_RISK',
                    titleEn: `Operational Risk Advisory - ${displayPeriod}`,
                    contentEn: buildOpRiskContent(toTitleCase(branch.nameEn), headDesignation, displayPeriod),
                    branchId: unitId,
                    period: displayPeriod,
                    orgMeta: { 
                        ...orgMeta, 
                        signatoryName: 'NIRAJ KUMAR',
                        signingAuthEn: 'Chief Manager',
                        signingAuthHi: 'मुख्य प्रबंधक',
                        signingAuthTa: 'தலைமை மேலாளர்',
                        exceptions: exceptions.map(e => ({
                            ruleId: e.ruleId,
                            parameter: e.parameter,
                            message: e.message
                        })),
                        dailyMovement
                    }
                }
            });

            await (prisma as any).$executeRaw`
                UPDATE letters SET "referenceNo" = ${referenceNo} WHERE id = ${letter.id}
            `;
            result.created++;
        }
    }

    return result;
}
