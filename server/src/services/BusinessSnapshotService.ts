import prisma from '../lib/prisma';
import { RuleEngine } from './RuleEngine';
import { MisParameter, MisStatus } from '../types/mis';
import { toUTCDate, normalizeAmount } from '../utils/businessUtils';



export class BusinessSnapshotService {
    static async getSnapshot(unitCode: string, date: string) {
        const branch = await prisma.branch.findUnique({ where: { code: unitCode } });
        if (!branch) return null;

        const businessDate = toUTCDate(date);

        const snapshot = await prisma.misSnapshot.findUnique({
            where: { unitId_businessDate_version: { unitId: branch.id, businessDate, version: 1 } },
            include: { panelData: true, exceptions: true }
        });

        // Even if the summary snapshot is missing, we attempt to retrieve core data from facts/registry
        const panelData = snapshot?.panelData || [];
        const exceptions = snapshot?.exceptions || [];

        const parameters = await prisma.misParameterRegistry.findMany({
            where: { parameterName: { in: panelData.map(p => p.parameter) } }
        });
        const paramMap = Object.fromEntries(parameters.map(p => [p.parameterName, p]));

        const enrichedPanelData = panelData.map(p => {
            const data: any = { ...p };
            Object.keys(data).forEach(key => {
                if (key.startsWith('val_') || key.startsWith('growth_') || key.startsWith('budget_') || key.startsWith('gap_')) {
                    data[key] = Number(data[key] || 0);
                }
            });
            data.metadata = paramMap[p.parameter] || {
                displayName: p.parameter.replace(/_/g, ' '),
                category: 'Uncategorized',
                orderIndex: 999
            };
            return data;
        }).sort((a, b) => (a.metadata?.orderIndex || 0) - (b.metadata?.orderIndex || 0));

        // Dynamically find which dates were likely used for comparison
        const availableDates = await prisma.fact.findMany({
            where: { unitId: branch.id, date: { lt: businessDate } },
            distinct: ['date'],
            orderBy: { date: 'desc' },
            take: 2,
            select: { date: true }
        });

        // Robust fallback for missing Cash Data: If certain cash metrics are missing from the panel, 
        // try to fetch them directly from recorded facts.
        const cashMetricCodes = ['CASH_TOTAL', 'CASH_CRL', 'CASH_BNA', 'CASH_ATM', 'CASH_BC', 'CASH_HAND', 'CASH_EXCESS', 'CASH_HOLDING', 'CASH_POSS', 'BNACASH', 'CASH_BNA_TOTAL'];
        const existingCash = enrichedPanelData.filter(p => cashMetricCodes.includes(p.parameter));
        const missingCash = cashMetricCodes.filter(code => !existingCash.some(p => p.parameter === code));

        if (missingCash.length > 0) {
            const missingFacts = await prisma.fact.findMany({
                where: {
                    unitId: branch.id,
                    metric: { in: missingCash },
                    date: { gte: new Date(businessDate.getTime()), lte: new Date(businessDate.getTime() + 86400000) }
                }
            });

            for (const f of missingFacts) {
                const meta = paramMap[f.metric] || { displayName: f.metric.replace(/_/g, ' '), category: 'CASH', orderIndex: 300 };
                existingCash.push({
                    parameter: f.metric,
                    val_current: Number(f.value),
                    val_y_eod: 0,
                    budget_month: 0,
                    metadata: meta
                } as any);
            }
        }

        return {
            ...snapshot,
            branch,
            panelData: enrichedPanelData,
            cashData: existingCash.sort((a, b) => (a.metadata?.orderIndex || 0) - (b.metadata?.orderIndex || 0)),
            compareDates: {
                yesterday: availableDates[0]?.date || new Date(businessDate.getTime() - 86400000),
                dby: availableDates[1]?.date || new Date(businessDate.getTime() - 172800000)
            }
        };

    }

    static async generateFromStaging(date: string) {
        const businessDate = toUTCDate(date);

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

        const snapshotsToPopulate: { id: string, unitId: string }[] = [];
        const results: any[] = [];

        for (const unitId of allUnitIds) {
            const branch = await prisma.branch.findUnique({ where: { id: unitId } });
            if (!branch) continue;
            if ((branch as any).type === 'REGIONAL OFFICE') continue; // RO is not a branch

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

                    let sb = Number(uf.sbBalance || 0);
                    let cd = Number(uf.cdBalance || 0);
                    let td = Number(uf.tdBalance || 0);
                    let adv = Number(uf.advBalance || 0);

                    const isNormalBranch = branch.type?.toUpperCase() === 'BRANCH';
                    sb = normalizeAmount(sb, isNormalBranch);
                    cd = normalizeAmount(cd, isNormalBranch);
                    td = normalizeAmount(td, isNormalBranch);
                    adv = normalizeAmount(adv, isNormalBranch);
                    const dep = sb + cd + td;
                    const casa = sb + cd;
                    const port = portfolioAggs[uf.unitCode] || { retail: 0, sme: 0, agri: 0, other: 0, sma0: 0, sma1: 0, sma2: 0, gnpa: 0 };

                    if (isNormalBranch) {
                        port.retail = normalizeAmount(port.retail, true);
                        port.sme = normalizeAmount(port.sme, true);
                        port.agri = normalizeAmount(port.agri, true);
                        port.other = normalizeAmount(port.other, true);
                        port.sma0 = normalizeAmount(port.sma0, true);
                        port.sma1 = normalizeAmount(port.sma1, true);
                        port.sma2 = normalizeAmount(port.sma2, true);
                        if (port.gnpa) port.gnpa = normalizeAmount(port.gnpa, true);
                    }

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
                            { unitId: branch.id, date: businessDate, metric: MisParameter.CASA_PERCENT, value: dep > 0 ? (casa / dep) * 100 : 0, ingestionId: log.id },
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

                snapshotsToPopulate.push({ id: snapshot.id, unitId: branch.id });
                results.push({ unitCode: branch.code, snapshotId: snapshot.id });
            }, { timeout: 30000 });
        }

        // 3. Batch Populate & Evaluate
        if (snapshotsToPopulate.length > 0) {
            await prisma.$transaction(async (tx) => {
                await this.populatePanelsBatch(tx, snapshotsToPopulate, businessDate);
                await RuleEngine.evaluateBatch(snapshotsToPopulate.map(s => s.id));
            }, { timeout: 120000 });
        }

        return { success: true, processedCount: results.length, businessDate };
    }

    public static async populatePanelsBatch(tx: any, snapshotsIdx: { id: string, unitId: string }[], date: Date) {
        if (snapshotsIdx.length === 0) return;

        const registeredParams = await tx.misParameterRegistry.findMany({
            where: { isEnabled: true },
            orderBy: { orderIndex: 'asc' }
        });

        const metrics = registeredParams.length > 0
            ? registeredParams.map((p: any) => p.parameterName)
            : [MisParameter.DEPOSIT_TOTAL, MisParameter.CASA, MisParameter.ADVANCE_TOTAL, MisParameter.BUSINESS_TOTAL];

        const unitIds = [...new Set(snapshotsIdx.map(s => s.unitId))];
        const branches = await tx.branch.findMany({ where: { id: { in: unitIds } } });
        const branchMap = Object.fromEntries(branches.map((b: any) => [b.id, b]));

        // Clear existing panel data
        const snapshotIds = snapshotsIdx.map(s => s.id);
        await tx.misInformationPanel.deleteMany({ where: { snapshotId: { in: snapshotIds } } });

        // Temporal Setup: Dynamic Date Detection
        const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        
        // Find the 2 most recent dates available before this snapshot globally (or for these units)
        // We look at the Fact table to see what dates actually have data
        const availableDates = await tx.fact.findMany({
            where: { date: { lt: utcDate } },
            distinct: ['date'],
            orderBy: { date: 'desc' },
            take: 2,
            select: { date: true }
        });

        const dates = {
            current: utcDate,
            yesterday: availableDates[0]?.date || new Date(utcDate.getTime() - 86400000),
            dby: availableDates[1]?.date || new Date(utcDate.getTime() - 172800000),
            prevMonthEnd: new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), 0)),
        };


        const fyYear = utcDate.getUTCMonth() < 3 ? utcDate.getUTCFullYear() - 1 : utcDate.getUTCFullYear();
        const fyDates = {
            fyStart: new Date(Date.UTC(fyYear, 2, 31)),
            prevFyStart: new Date(Date.UTC(fyYear - 1, 2, 31)),
            prevFyEnd: new Date(Date.UTC(fyYear, 2, 31)),
        };

        const allDates = [...Object.values(dates), ...Object.values(fyDates)];
        
        // Mega-fetch Facts
        const facts = await tx.fact.findMany({
            where: {
                unitId: { in: unitIds },
                date: { in: allDates }
            }
        });

        // Mega-fetch Budgets
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const getPeriodKey = (d: Date) => `${months[d.getUTCMonth()]}-${d.getUTCFullYear().toString().slice(-2)}`;
        
        const currMonthKey = getPeriodKey(utcDate);
        const qEndMonth = (Math.floor(utcDate.getUTCMonth() / 3) * 3) + 2;
        const qEndYear = utcDate.getUTCFullYear();
        const quarterEndMonthKey = getPeriodKey(new Date(Date.UTC(qEndYear, qEndMonth, 1)));

        const budgets = await tx.budgetMaster.findMany({
            where: {
                solId: { in: branches.map((b: any) => b.code) },
                periodKey: { in: [currMonthKey, quarterEndMonthKey] },
                isActive: true
            }
        });

        const panelDataToCreate = [];

        for (const snap of snapshotsIdx) {
            const branch = branchMap[snap.unitId];
            if (!branch) continue;

            const unitFacts = facts.filter((f: any) => f.unitId === snap.unitId);
            const unitBudgets = budgets.filter((b: any) => b.solId === branch.code);

            const getValInner = (metric: string, d: Date) => {
                const f = unitFacts.find((uf: any) => uf.metric === metric && Math.abs(uf.date.getTime() - d.getTime()) < 3600000); // 1hr tolerance
                return f ? Number(f.value) : 0;
            };

            const getRatioInner = (m: string, d: Date): number => {
                const lowerM = m.toLowerCase();
                
                // Force derivations for composite metrics
                if (lowerM === 'core adv' || lowerM === 'core_adv') {
                    const ret = getValInner('CORE_RETAIL', d) || getValInner('Core Ret', d);
                    const agri = getValInner('CORE_AGRI', d) || getValInner('Core_Agri', d);
                    const msme = getValInner('MSME', d) || getValInner('CORE_MSME', d);
                    return ret + agri + msme;
                }
                
                if (lowerM === 'total dep' || lowerM === 'total_dep' || lowerM === 'total_deposits') {
                    const casa = getValInner('CASA', d) || (getValInner('SB_DEPOSITS', d) + getValInner('CD_DEPOSITS', d));
                    const td = getValInner('TD_DEPOSITS', d) || getValInner('TD', d);
                    return casa + td;
                }

                if (lowerM === 'casa' || lowerM === 'casa_amt') {
                    return getValInner('CASA', d) || (getValInner('SB_DEPOSITS', d) + getValInner('CD_DEPOSITS', d));
                }

                const numVal = getValInner(m, d);
                if (numVal !== 0) return numVal;

                if (lowerM === 'cd_ratio') {
                    const adv = getValInner('TOTAL_ADVANCES', d) || getValInner('Adv', d);
                    const dep = getRatioInner('Total Dep', d); // Use derived dep
                    return dep > 0 ? (adv / dep) * 100 : 0;
                }
                if (lowerM === 'casa%' || lowerM === 'casa_percent') {
                    const casa = getRatioInner('CASA', d); // Use derived casa
                    const dep = getRatioInner('Total Dep', d); // Use derived dep
                    return dep > 0 ? (casa / dep) * 100 : 0;
                }
                
                // Add mapping for core deposit types if Fact table uses suffixes
                if (lowerM === 'sb' || lowerM === 'sb_deposits') {
                    return getValInner('SB_DEPOSITS', d) || getValInner('SB', d);
                }
                if (lowerM === 'cd' || lowerM === 'cd_deposits') {
                    return getValInner('CD_DEPOSITS', d) || getValInner('CD', d);
                }
                if (lowerM === 'td' || lowerM === 'td_deposits') {
                    return getValInner('TD_DEPOSITS', d) || getValInner('TD', d);
                }
                
                return numVal;
            };

            for (const metric of metrics) {
                const v = {
                    current: getRatioInner(metric, dates.current),
                    yesterday: getRatioInner(metric, dates.yesterday),
                    dby: getRatioInner(metric, dates.dby),
                    pM: getRatioInner(metric, dates.prevMonthEnd),
                    fyS: getRatioInner(metric, fyDates.fyStart),
                    pFyS: getRatioInner(metric, fyDates.prevFyStart),
                    pFyE: getRatioInner(metric, fyDates.prevFyEnd)
                };

                const g = {
                    day: v.current - v.yesterday,
                    month: v.current - v.pM,
                    fy: v.current - v.fyS,
                    prevFy: v.pFyE - v.pFyS
                };

                const getBudValInner = (m: string, pKey: string) => {
                    const findVal = (name: string) => {
                        const b = unitBudgets.find((ub: any) => ub.parameterName === name && ub.periodKey === pKey);
                        return b ? Number(b.targetValue) : 0;
                    };

                    let val = 0;
                    const lowerM = m.toLowerCase();
                    if (lowerM === 'total dep' || lowerM === 'total_dep') {
                        const casa = findVal('CASA') || (findVal('SB') + findVal('CD'));
                        val = casa + findVal('TD');
                    } else if (lowerM === 'casa' || lowerM === 'casa_amt') {
                        val = findVal('CASA') || (findVal('SB') + findVal('CD'));
                    } else if (lowerM === 'core adv' || lowerM === 'core_adv') {
                        val = findVal('Core Ret') + findVal('Core_Agri') + findVal('MSME');
                    } else {
                        val = findVal(m);
                    }

                    // Normalize to Crores only if it's NOT a management unit? 
                    // NO - user wants branches in LAKHS.
                    // Regional data is already in Crores in the CSV.
                    // So we just return the raw val.
                    return val;
                };

                const bMonth = getBudValInner(metric, currMonthKey);
                const bQuarter = getBudValInner(metric, quarterEndMonthKey);

                const isBetterLow = ['NPA', 'EXPENSE', 'COST', 'PROVISION'].some(k => metric.toUpperCase().includes(k));
                let status = 'Neutral';
                if (bMonth > 0) {
                    const gap = v.current - bMonth;
                    if (isBetterLow) {
                        if (gap <= 0) status = 'Surpassed';
                        else if (Math.abs(gap) < bMonth * 0.1) status = 'On-Track';
                        else status = 'Behind';
                    } else {
                        if (gap >= 0) status = 'Surpassed';
                        else if (Math.abs(gap) < bMonth * 0.1) status = 'On-Track';
                        else status = 'Behind';
                    }
                } else {
                    status = (isBetterLow ? g.day <= 0 : g.day >= 0) ? 'On-Track' : 'Behind';
                }

                const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(branch.type?.toUpperCase() || '') || branch.code === '3933';
                const isRatio = ['%', 'RATIO', 'PERCENT'].some(k => metric.toUpperCase().includes(k));
                const isCount = ['COUNT', 'NUMBER', 'OPENINGS'].some(k => metric.toUpperCase().includes(k));
                
                // Scale to Lakhs if it's a Branch (Not RO) and NOT a ratio/count
                const scale = (!isRegional && !isRatio && !isCount) ? 100 : 1;

                panelDataToCreate.push({
                    snapshotId: snap.id,
                    parameter: metric,
                    val_prev_fy_start: v.pFyS * scale,
                    val_prev_fy_end: v.pFyE * scale,
                    val_fy_start: v.fyS * scale,
                    val_fy_end: 0,
                    val_prev_m_end: v.pM * scale,
                    val_dby: v.dby * scale,
                    val_y_eod: v.yesterday * scale,
                    val_current: v.current * scale,
                    growth_prev_fy: g.prevFy * scale,
                    growth_day: g.day * scale,
                    growth_month: g.month * scale,
                    growth_fy: g.fy * scale,
                    budget_month: bMonth * scale,
                    gap_month: (v.current - bMonth) * scale,
                    budget_quarter: bQuarter * scale,
                    gap_quarter: (v.current - bQuarter) * scale,
                    status
                });
            }
        }

        if (panelDataToCreate.length > 0) {
            await tx.misInformationPanel.createMany({ data: panelDataToCreate });
        }
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

        // Temporal Setup: Dynamic Date Detection
        const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

        // Find the 2 most recent dates available before this snapshot for this branch
        const availableDates = await tx.fact.findMany({
            where: { unitId, date: { lt: utcDate } },
            distinct: ['date'],
            orderBy: { date: 'desc' },
            take: 2,
            select: { date: true }
        });

        const yesterday = availableDates[0]?.date || new Date(utcDate.getTime() - 86400000);
        const dby = availableDates[1]?.date || new Date(utcDate.getTime() - 172800000);
        
        const prevMonthEnd = new Date(Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), 0));

        // Fiscal Year calculation
        let fyYear = utcDate.getUTCMonth() < 3 ? utcDate.getUTCFullYear() - 1 : utcDate.getUTCFullYear();
        const fyStart = new Date(Date.UTC(fyYear, 2, 31)); 
        const prevFyStart = new Date(Date.UTC(fyYear - 1, 2, 31));
        const prevFyEnd = new Date(Date.UTC(fyYear, 2, 31));


        // Budget setup
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
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

            // Helper to calculate ratios if they are 0 but components are present
            const calculateRatios = async (val: number | any, m: string, d: Date) => {
                const numVal = Number(val || 0);
                if (numVal !== 0) return numVal;

                const lowerM = m.toLowerCase();
                if (lowerM === 'cd_ratio') {
                    const adv = await this.getMetricValue(tx, unitId, 'Adv', d);
                    const dep = await this.getMetricValue(tx, unitId, 'Total Dep', d);
                    return dep > 0 ? (adv / dep) * 100 : 0;
                }
                if (lowerM === 'casa%' || lowerM === 'casa_percent') {
                    const casa = await this.getMetricValue(tx, unitId, 'CASA', d);
                    const dep = await this.getMetricValue(tx, unitId, 'Total Dep', d);
                    return dep > 0 ? (casa / dep) * 100 : 0;
                }
                if (lowerM === 'core adv' || lowerM === 'core_adv') {
                    const retail = await this.getMetricValue(tx, unitId, 'Core Ret', d);
                    const agri = await this.getMetricValue(tx, unitId, 'Core_Agri', d);
                    const msme = await this.getMetricValue(tx, unitId, 'MSME', d);
                    return retail + agri + msme;
                }
                if (lowerM === 'core ret' || lowerM === 'core_ret') {
                    const hl = await this.getMetricValue(tx, unitId, 'HL', d);
                    const pl = await this.getMetricValue(tx, unitId, 'PersonalLoan', d);
                    const el = await this.getMetricValue(tx, unitId, 'EL', d);
                    const vl = await this.getMetricValue(tx, unitId, 'VL', d);
                    const mort = await this.getMetricValue(tx, unitId, 'Mort', d);
                    const liq = await this.getMetricValue(tx, unitId, 'Liq', d);
                    const oth = await this.getMetricValue(tx, unitId, 'OthRet', d);
                    return hl + pl + el + vl + mort + liq + oth;
                }
                if (lowerM === 'core_agri' || lowerM === 'core agri') {
                    const kcc = await this.getMetricValue(tx, unitId, 'KCC', d);
                    const shg = await this.getMetricValue(tx, unitId, 'SHG', d);
                    const gov = await this.getMetricValue(tx, unitId, 'Gov', d);
                    const oth = await this.getMetricValue(tx, unitId, 'OthSch', d);
                    return kcc + shg + gov + oth;
                }
                if (lowerM === 'msme') {
                    const mudra = await this.getMetricValue(tx, unitId, 'Mudra', d);
                    // Add other MSME sub-params here if they exist in Fact
                    return mudra;
                }
                if (lowerM === 'ret_td' || lowerM === 'ret td') {
                    const td = await this.getMetricValue(tx, unitId, 'TD', d);
                    const bulk = await this.getMetricValue(tx, unitId, 'Bulk_Dep', d);
                    return td - bulk;
                }
                
                // Add mapping for core deposit types
                if (lowerM === 'sb' || lowerM === 'sb_deposits') {
                    return (await this.getMetricValue(tx, unitId, 'SB_DEPOSITS', d)) || (await this.getMetricValue(tx, unitId, 'SB', d));
                }
                if (lowerM === 'cd' || lowerM === 'cd_deposits') {
                    return (await this.getMetricValue(tx, unitId, 'CD_DEPOSITS', d)) || (await this.getMetricValue(tx, unitId, 'CD', d));
                }
                if (lowerM === 'td' || lowerM === 'td_deposits') {
                    return (await this.getMetricValue(tx, unitId, 'TD_DEPOSITS', d)) || (await this.getMetricValue(tx, unitId, 'TD', d));
                }
                
                return numVal;
            };

            val_current = await calculateRatios(val_current, metric, utcDate);
            val_y_eod = await calculateRatios(val_y_eod, metric, yesterday);
            val_dby = await calculateRatios(val_dby, metric, dby);
            val_prev_m_end = await calculateRatios(val_prev_m_end, metric, prevMonthEnd);
            val_fy_start = await calculateRatios(val_fy_start, metric, fyStart);
            val_prev_fy_start = await calculateRatios(val_prev_fy_start, metric, prevFyStart);
            val_prev_fy_end = await calculateRatios(val_prev_fy_end, metric, prevFyEnd);

            const growth_day = Number(val_current) - Number(val_y_eod);
            const growth_month = Number(val_current) - Number(val_prev_m_end);
            const growth_fy = Number(val_current) - Number(val_fy_start);
            const growth_prev_fy = Number(val_prev_fy_end) - Number(val_prev_fy_start);

            // Budget Setup
            const getBudgetVal = async (m: string, pKey: string) => {
                let targetVal = 0;
                const lowerM = m.toLowerCase();

                const fetchVal = async (name: string) => {
                    const b = await tx.budgetMaster.findFirst({
                        where: { solId: branch.code, parameterName: name, periodKey: pKey, isActive: true }
                    });
                    return Number(b?.targetValue || 0);
                };

                if (lowerM === 'total dep' || lowerM === 'total_dep') {
                    const casa = await fetchVal('CASA');
                    const td = await fetchVal('TD');
                    targetVal = casa + td;
                } else if (lowerM === 'core adv' || lowerM === 'core_adv') {
                    const retail = await fetchVal('Core Ret');
                    const agri = await fetchVal('Core_Agri');
                    const msme = await fetchVal('MSME');
                    targetVal = retail + agri + msme;
                } else {
                    targetVal = await fetchVal(m);
                }

                // No longer dividing by 100 for branches.
                // Regional data is in Crores, Branch data is in Lakhs in source.
                return targetVal;
            };

            const budget_month = await getBudgetVal(metric, currMonthKey);
            const gap_month = Number(val_current) - budget_month;

            const budget_quarter = await getBudgetVal(metric, quarterEndMonthKey);
            const gap_quarter = Number(val_current) - budget_quarter;

            // Better Low metrics (Inverse)
            const isBetterLow = ['NPA', 'EXPENSE', 'COST', 'PROVISION'].some(k => metric.toUpperCase().includes(k));

            // Status logic
            let status = 'Neutral';
            if (budget_month > 0) {
                if (isBetterLow) {
                    // For NPA/Expenses, being BELOW budget is good
                    if (gap_month <= 0) status = 'Surpassed';
                    else if (Math.abs(gap_month) < budget_month * 0.1) status = 'On-Track';
                    else status = 'Behind';
                } else {
                    // For Profits/Advances, being ABOVE budget is good
                    if (gap_month >= 0) status = 'Surpassed';
                    else if (Math.abs(gap_month) < budget_month * 0.1) status = 'On-Track';
                    else status = 'Behind';
                }
            } else {
                if (isBetterLow) {
                    // Downward trend is good for NPA
                    status = growth_day <= 0 ? 'On-Track' : 'Behind';
                } else {
                    status = growth_day >= 0 ? 'On-Track' : 'Behind';
                }
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

    static async finalizeAllSnapshots(date: string) {
        const [y, m, d] = date.split('-').map(Number);
        const businessDate = new Date(Date.UTC(y, m - 1, d));

        const snapshots = await prisma.misSnapshot.findMany({
            where: { businessDate, status: MisStatus.PROVISIONAL }
        });

        const results = [];
        for (const s of snapshots) {
            await this.freezeSnapshot(s.id);
            results.push(s.id);
        }

        return { success: true, count: results.length };
    }

    static async getExceptionSummary(date: string) {
        const [y, m, d] = date.split('-').map(Number);
        const businessDate = new Date(Date.UTC(y, m - 1, d));

        const branches = await prisma.branch.findMany({
            where: { NOT: { type: 'REGIONAL OFFICE' } }, // Exclude Regional Office
            orderBy: { nameEn: 'asc' }
        });

        const snapshots = await prisma.misSnapshot.findMany({
            where: { businessDate },
            include: {
                exceptions: true,
                branch: true
            }
        }) as any[];

        return branches.map(branch => {
            const snap = snapshots.find(s => s.unitId === branch.id);
            return {
                branchCode: branch.code,
                branchName: branch.nameEn,
                snapshotStatus: snap?.status || 'MISSING',
                exceptionCount: snap?.exceptions?.length || 0,
                criticalCount: snap?.exceptions?.filter((e: any) => e.severity?.toUpperCase() === 'CRITICAL').length || 0,
                highCount: snap?.exceptions?.filter((e: any) => e.severity?.toUpperCase() === 'HIGH').length || 0,
                mediumCount: snap?.exceptions?.filter((e: any) => {
                    const s = e.severity?.toUpperCase();
                    return s === 'MEDIUM' || s === 'LOW' || (!s && e.severity);
                }).length || 0,
                exceptions: snap?.exceptions || []
            };
        });
    }
}
