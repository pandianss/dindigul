import prisma from '../lib/prisma';

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
    };
}

// ── Org metadata ──────────────────────────────────────────────────────────────

export async function getCurrentOrgMeta() {
    const organization = await (prisma as any).organizationConfig.findUnique({ where: { id: 'singleton' } });
    const roBranch = await prisma.branch.findFirst({ where: { type: 'RO' } });
    return {
        ...organization,
        officeNameEn: roBranch?.nameEn || 'Dindigul Regional Office',
        officeNameTa: (roBranch as any)?.nameTa || 'திண்டுக்கல் மண்டல அலுவலகம்',
        officeNameHi: (roBranch as any)?.nameHi || 'डिंडिगुल क्षेत्रीय कार्यालय',
        address: (roBranch as any)?.address || 'Regional Office, 123 Madurai Road, Dindigul - 624001, Tamil Nadu',
        addressTa: (roBranch as any)?.addressTa || 'மண்டல அலுவலகம், 123 மதுரை ரோடு, திண்டுக்கல் - 624001, தமிழ்நாடு',
        addressHi: (roBranch as any)?.addressHi || 'क्षेत्रीय कार्यालय, 123 मदुरै रोड, डिंडीगुल - 624001, तमिलनाडु',
        phone: (roBranch as any)?.phone || '+91 451 2420000',
        email: (roBranch as any)?.email || 'ro.dindigul@bank.com',
    };
}

// ── March 31st baseline ───────────────────────────────────────────────────────

async function getMarchFigure(branchId: string, paramId: string, referenceDate: Date) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth(); // 0-indexed
    const marchYear = month <= 2 ? year - 1 : year;
    const marchStart = new Date(marchYear, 2, 1);
    const marchEnd = new Date(marchYear, 2, 31, 23, 59, 59);
    const snap = await (prisma as any).snapshot.findFirst({
        where: { branchId, parameterId: paramId, date: { gte: marchStart, lte: marchEnd } },
        orderBy: { date: 'desc' }
    });
    return { value: snap?.value || 0, date: marchEnd };
}

// ── Achievement % ─────────────────────────────────────────────────────────────

function achievementPct(actual: number, budget: number, invert: boolean): number {
    if (budget === 0) return actual === 0 ? 100 : (invert ? 0 : 200);
    if (invert) {
        // For NPA: achieving less than budget is good
        // 100% = exactly at budget, >100% = better (actual < budget)
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
    period: string, exceptions: any[]
): string {
    const exceptionList = exceptions
        .map(e => `  • [${e.ruleId}] ${e.parameter}: ${e.message}`)
        .join('\n');
    return `Dear Sir/Madam,

The Risk Monitoring System has flagged the following operational risk exceptions for the ${branchName} Branch during ${period}:

${exceptionList}

These exceptions require your immediate attention and a written response outlining the corrective measures being undertaken. Please submit your response to the Regional Office within 3 working days.

Failure to address these exceptions in a timely manner may result in escalation to higher management.`;
}

// ── Core evaluation function ──────────────────────────────────────────────────

export interface GenerationResult {
    created: number;
    skipped: number;
    details: { branch: string; param: string; type: string; reason: string }[];
}

export async function generateLettersForPeriod(period: string): Promise<GenerationResult> {
    const criteria = await loadCriteria();
    const orgMeta = await getCurrentOrgMeta();
    const result: GenerationResult = { created: 0, skipped: 0, details: [] };

    const toTitleCase = (s: string) =>
        (s || '').toLowerCase().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // ── Per-parameter evaluation ─────────────────────────────────────────────
    for (const paramCode of criteria.enabledParamCodes) {
        const param = await (prisma as any).parameter.findUnique({ where: { code: paramCode } });
        if (!param) {
            console.warn(`[LetterGen] Parameter '${paramCode}' not found in parameters table — skipping`);
            result.details.push({ branch: '-', param: paramCode, type: '-', reason: 'Parameter not found' });
            continue;
        }

        const isInverted = criteria.invertParamCodes.includes(paramCode);

        // Fetch all snapshots for this parameter, deduplicated by branch
        const snapshots = await (prisma as any).snapshot.findMany({
            where: { parameterId: param.id },
            orderBy: { date: 'desc' },
            include: {
                branch: {
                    include: {
                        headUser: { include: { designation: true } }
                    }
                }
            }
        });

        // Deduplicate: one snapshot per branch (most recent)
        const seen = new Set<string>();
        const uniqueSnaps: any[] = [];
        for (const s of snapshots) {
            if (s.branchId && !seen.has(s.branchId)) {
                seen.add(s.branchId);
                uniqueSnaps.push(s);
            }
        }

        if (uniqueSnaps.length === 0) {
            result.details.push({ branch: '-', param: paramCode, type: '-', reason: 'No snapshots found' });
            continue;
        }

        // Annotate each snapshot with achievement %
        const annotated = uniqueSnaps.map(s => ({
            ...s,
            achievementPct: achievementPct(s.value, s.budget || 0, isInverted)
        }));

        // Sort by achievement descending (best performers first)
        annotated.sort((a, b) => b.achievementPct - a.achievementPct);

        // Determine which branches receive each letter type
        // Mode A: threshold-based (if appreciationThreshold > 0)
        // Mode B: pure rank (top N / bottom N)
        const appreciationCandidates: typeof annotated = [];
        const explanationCandidates: typeof annotated = [];

        // Mode C: FY Decline checks
        const checkFyDecline = criteria.fyDeclineParamCodes.includes(paramCode);
        const declineCandidates: typeof annotated = [];

        // Pre-fetch March info for all branches to check for decline
        for (const s of annotated) {
            const marchInfo = await getMarchFigure(s.branchId, param.id, s.date);
            s.marchInfo = marchInfo; // attach for later
            if (checkFyDecline) {
                const isDecline = isInverted
                    ? (s.value > marchInfo.value)  // For NPA: higher is worse (decline in performance)
                    : (s.value < marchInfo.value); // For Deposits: lower is worse

                if (isDecline) {
                    declineCandidates.push(s);
                }
            }
        }

        if (criteria.appreciationThreshold > 0) {
            // Threshold mode: all branches meeting/exceeding threshold get appreciation
            for (const s of annotated) {
                if (s.achievementPct >= criteria.appreciationThreshold) {
                    appreciationCandidates.push(s);
                } else if (s.achievementPct < criteria.explanationThreshold) {
                    explanationCandidates.push(s);
                }
            }
            // Still cap at topN / bottomN to avoid flooding
            appreciationCandidates.splice(criteria.appreciationTopN);
            explanationCandidates.splice(criteria.explanationBottomN);
        } else {
            // Pure rank mode
            appreciationCandidates.push(...annotated.slice(0, criteria.appreciationTopN));
            explanationCandidates.push(...annotated.slice(-criteria.explanationBottomN).reverse());
        }

        // Add any branch that suffered an FY decline to the explanation list (if not already present)
        for (const s of declineCandidates) {
            if (!explanationCandidates.find(c => c.branchId === s.branchId)) {
                explanationCandidates.push(s);
            }
        }

        // Create APPRECIATION letters
        for (const snap of appreciationCandidates) {
            const existing = await (prisma as any).letter.findFirst({
                where: { branchId: snap.branchId, parameterId: param.id, period, type: 'APPRECIATION' }
            });
            if (existing) {
                result.skipped++;
                result.details.push({ branch: snap.branch.nameEn, param: paramCode, type: 'APPRECIATION', reason: 'Already exists' });
                continue;
            }

            const headName = toTitleCase(snap.branch.headUser?.fullNameEn || 'The Branch Manager');
            const headDesignation = toTitleCase(snap.branch.headUser?.designation?.nameEn || 'Branch Head');
            const marchInfo = snap.marchInfo;
            const gap = snap.value - (snap.budget || 0);
            const performanceData = {
                march31stDate: marchInfo.date,
                march31st: marchInfo.value,
                latestDate: snap.date,
                latest: snap.value,
                budget: snap.budget || 0,
                gap,
                status: gap >= 0 ? '+ve' : '-ve'
            };

            await (prisma as any).letter.create({
                data: {
                    type: 'APPRECIATION',
                    titleEn: `${param.nameEn} Achievement - ${period}`,
                    contentEn: buildAppreciationContent(
                        toTitleCase(snap.branch.nameEn), headDesignation,
                        param.nameEn, period, snap.value, snap.budget || 0),
                    branchId: snap.branchId,
                    parameterId: param.id,
                    valueAtTime: snap.value,
                    budgetAtTime: snap.budget,
                    period,
                    orgMeta: { ...orgMeta, performanceData }
                }
            });
            result.created++;
            result.details.push({
                branch: snap.branch.nameEn, param: paramCode, type: 'APPRECIATION',
                reason: `${snap.achievementPct.toFixed(1)}% achievement`
            });
        }

        // Create EXPLANATION letters
        for (const snap of explanationCandidates) {
            // Do not send explanation to a branch that already got appreciation for same param+period
            const alreadyApprec = appreciationCandidates.some(a => a.branchId === snap.branchId);
            if (alreadyApprec) continue;

            const existing = await (prisma as any).letter.findFirst({
                where: { branchId: snap.branchId, parameterId: param.id, period, type: 'EXPLANATION' }
            });
            if (existing) {
                result.skipped++;
                result.details.push({ branch: snap.branch.nameEn, param: paramCode, type: 'EXPLANATION', reason: 'Already exists' });
                continue;
            }

            const headDesignation = toTitleCase(snap.branch.headUser?.designation?.nameEn || 'Branch Head');
            const marchInfo = snap.marchInfo;
            const gap = snap.value - (snap.budget || 0);
            const performanceData = {
                march31stDate: marchInfo.date, march31st: marchInfo.value,
                latestDate: snap.date, latest: snap.value,
                budget: snap.budget || 0, gap, status: gap >= 0 ? '+ve' : '-ve'
            };

            const isDecline = isInverted ? (snap.value > marchInfo.value) : (snap.value < marchInfo.value);
            let reasonStr = `${snap.achievementPct.toFixed(1)}% achievement`;
            if (checkFyDecline && isDecline) {
                reasonStr += ` (Decline from March 31st FY)`;
            } else if (snap.achievementPct < criteria.explanationThreshold) {
                reasonStr += ` (below ${criteria.explanationThreshold}% threshold)`;
            }

            await (prisma as any).letter.create({
                data: {
                    type: 'EXPLANATION',
                    titleEn: `Review of ${param.nameEn} Performance - ${period}`,
                    contentEn: buildExplanationContent(
                        toTitleCase(snap.branch.nameEn), headDesignation,
                        param.nameEn, period, snap.value, snap.budget || 0),
                    branchId: snap.branchId,
                    parameterId: param.id,
                    valueAtTime: snap.value,
                    budgetAtTime: snap.budget,
                    period,
                    orgMeta: { ...orgMeta, performanceData }
                }
            });
            result.created++;
            result.details.push({
                branch: snap.branch.nameEn, param: paramCode, type: 'EXPLANATION',
                reason: reasonStr
            });
        }
    }

    // ── OP_RISK letters from CRITICAL exceptions ──────────────────────────────
    if (criteria.opRiskFromExceptions) {
        const criticalExceptions = await prisma.misException.findMany({
            where: { severity: 'CRITICAL', status: 'OPEN' },
            include: { branch: { include: { headUser: { include: { designation: true } } } } }
        });

        // Group by branch
        const byBranch = new Map<string, typeof criticalExceptions>();
        for (const ex of criticalExceptions) {
            const arr = byBranch.get(ex.unitId) || [];
            arr.push(ex);
            byBranch.set(ex.unitId, arr);
        }

        for (const [unitId, exceptions] of byBranch) {
            const branch = exceptions[0].branch;
            const existing = await (prisma as any).letter.findFirst({
                where: { branchId: unitId, period, type: 'OP_RISK' }
            });
            if (existing) {
                result.skipped++;
                result.details.push({ branch: branch.nameEn, param: 'EXCEPTIONS', type: 'OP_RISK', reason: 'Already exists' });
                continue;
            }

            const headDesignation = toTitleCase(branch.headUser?.designation?.nameEn || 'Branch Head');
            await (prisma as any).letter.create({
                data: {
                    type: 'OP_RISK',
                    titleEn: `Operational Risk Advisory - ${period}`,
                    contentEn: buildOpRiskContent(toTitleCase(branch.nameEn), headDesignation, period, exceptions),
                    branchId: unitId,
                    period,
                    orgMeta: orgMeta
                }
            });
            result.created++;
            result.details.push({
                branch: branch.nameEn, param: 'EXCEPTIONS', type: 'OP_RISK',
                reason: `${exceptions.length} CRITICAL exception(s)`
            });
        }
    }

    return result;
}
