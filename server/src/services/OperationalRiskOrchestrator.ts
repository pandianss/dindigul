import prisma from '../lib/prisma';
import { ReferenceGenerator } from '../infra/ReferenceGenerator';
import { logger } from '../utils/logger';
import { format } from 'date-fns';
import { FactRepository } from '../infra/FactRepository';
import { toUTCDate, getYesterday } from '../utils/businessUtils';

export class OperationalRiskOrchestrator {
    
    /**
     * Scans for MIS Exceptions and generates high-fidelity OpRisk Advisory Drafts.
     */
    static async generateDrafts(dateStr: string, signatoryId?: string) {
        const businessDate = toUTCDate(dateStr);
        const prevDate = getYesterday(businessDate);
        const period = format(businessDate, 'dd.MM.yyyy');
        const prevPeriod = format(prevDate, 'dd.MM.yyyy');
        
        logger.info('OP_RISK_GEN_START', { dateStr, period });

        // 1. Fetch Exceptions for the date
        const exceptions = await prisma.misException.findMany({
            where: { businessDate },
            include: { branch: true }
        });

        if (exceptions.length === 0) {
            logger.info('OP_RISK_GEN_SKIP_NO_EXCEPTIONS', { dateStr });
            return { count: 0 };
        }

        // 2. Group by Branch
        const branchGroups = exceptions.reduce((acc: any, ex: any) => {
            const code = ex.unitId;
            if (!acc[code]) acc[code] = [];
            acc[code].push(ex);
            return acc;
        }, {});

        // 3. Purge existing OP_RISK drafts for this period to avoid duplicates
        await prisma.letter.deleteMany({
            where: {
                type: 'OP_RISK',
                period,
                status: 'DRAFT'
            }
        });

        let createdCount = 0;

        // Metrics needed for the tables
        const kbpMetrics = ['SB', 'CD', 'TD', 'Total Dep', 'Adv', 'Bus'];
        const advMetrics = ['Core Ret', 'MSME', 'Core_Agri', 'Gold'];
        const otherMetrics = ['NPA', 'Branch_PL', 'CASH_CRL', 'CASH_HAND', 'CASH_ATM', 'CASH_BC', 'CASH_BNA', 'CASH_TOTAL'];
        const allMetrics = [...kbpMetrics, ...advMetrics, ...otherMetrics];

        for (const [unitId, branchEx] of Object.entries(branchGroups) as any) {
            // Filter only high/critical for letters
            const relevantEx = branchEx.filter((ex: any) => ['CRITICAL', 'HIGH'].includes(ex.severity));
            if (relevantEx.length === 0) continue;

            const branch = branchEx[0].branch;
            
            // Fetch trend data
            const trend = await FactRepository.getTrendData(unitId, businessDate, prevDate, allMetrics);
            const cur = trend.current;
            const prev = trend.previous;

            // 4. Build Content
            const titleEn = `Operational Risk Advisory - ${branch.nameEn} (${branch.code})`;
            
            const contentEn = `
            <div class="op-risk-letter" style="font-family: 'Century Gothic', 'Segoe UI', sans-serif; color: #1a202c; line-height: 1.6; width: 100%; font-size: 18px;">
                <div style="text-align: center; margin-bottom: 30px; border-bottom: 4px double #00338d; padding-bottom: 15px;">
                    <h2 style="font-family: Arial, sans-serif; font-size: 24px; font-weight: 800; color: #00338d; text-transform: uppercase; margin: 0; letter-spacing: 1px;">
                        POSITION AS ON - ${period}
                    </h2>
                </div>

                <p style="margin-bottom: 25px; text-align: justify;">
                    Based on our daily operational risk monitoring for the period ended <strong>${period}</strong>, we have identified <strong>${relevantEx.length}</strong> significant exceptions for your branch requiring immediate attention and mitigation.
                </p>

                <div style="margin-top: 30px;">
                    <h3 style="font-family: Arial, sans-serif; font-size: 18px; font-weight: 800; color: #00338d; text-transform: uppercase; border-left: 6px solid #00338d; padding-left: 15px; margin-bottom: 15px;">
                        The current cash management position of the branch is summarized below:
                    </h3>
                    ${this.renderCashTable(cur)}
                </div>

                <p style="font-size: 15px; color: #4a5568; font-style: italic; margin-top: 12px;">
                    Effective monitoring of cash holdings within authorized limits across all points (Branch/ATM/BC) is crucial for both security and optimal liquidity management.
                </p>
                    
                    <div style="display: flex; gap: 15px; margin-top: 25px;">
                        ${this.renderRiskWidgets(cur)}
                    </div>

                    <div style="margin-top: 30px;">
                        <p style="font-size: 15px; margin-bottom: 15px; text-align: justify;">
                            In addition, a review of the recent business movement of the branch indicates the following trend position which should be monitored to ensure consistency and stability in business growth:
                        </p>

                        <h3 style="font-family: Arial, sans-serif; font-size: 16px; font-weight: 800; color: #00338d; text-transform: uppercase; border-left: 6px solid #00338d; padding-left: 15px; margin-bottom: 15px;">
                            Trend Position: Key Business Parameters (KBP)
                        </h3>
                        ${this.renderTrendTable(kbpMetrics, cur, prev, period, prevPeriod)}
                    </div>

                    <div style="margin-top: 35px; padding: 15px; border-top: 1px solid #e2e8f0; background-color: #f8fafc; border-radius: 4px;">
                        <p style="font-size: 13.5px; margin-bottom: 10px; text-align: justify; font-weight: 500;">
                            The above exceptions require immediate verification at the branch level. You are advised to review the root cause of each observation, complete the necessary control rectification, and strengthen branch-level monitoring so that recurrence is avoided.
                        </p>
                        <p style="font-size: 13.5px; margin: 0; text-align: justify; color: #4a5568;">
                            As Branch Head, you may ensure that the observations are diarised, tracked to closure, and discussed with the concerned officials. This communication is issued for your information and corrective action.
                        </p>
                    </div>
                </div>
            `;

            // 5. Generate Reference
            const refNo = await ReferenceGenerator.generate('OP_RISK', 'Planning Department', businessDate);

            // 6. Create Letter Draft
            await prisma.letter.create({
                data: {
                    type: 'OP_RISK',
                    status: 'DRAFT',
                    titleEn,
                    contentEn,
                    branchId: unitId,
                    period,
                    referenceNo: refNo,
                    signatoryId: signatoryId || undefined,
                    version: 1
                }
            });

            createdCount++;
        }

        logger.info('OP_RISK_GEN_COMPLETE', { count: createdCount });
        return { count: createdCount };
    }

    private static renderCashTable(cur: Record<string, number>) {
        const total = (cur['CASH_HAND'] || 0) + (cur['CASH_ATM'] || 0) + (cur['CASH_BC'] || 0) + (cur['CASH_BNA'] || 0);
        const crl = cur['CASH_CRL'] || 0;
        const excess = total - crl;

        return `
            <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 12.5px; border: 1.2px solid #00338d; -webkit-print-color-adjust: exact;">
                <thead>
                    <tr style="background-color: #f8fafc !important; border-bottom: 2px solid #00338d;">
                        <th style="padding: 10px; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border: 1px solid #cbd5e1; font-weight: 900; color: #00338d !important;">Cash Management Summary</th>
                        <th style="padding: 10px; text-align: right; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; border: 1px solid #cbd5e1; font-weight: 900; color: #00338d !important;">Possession (₹ L)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: 1px solid #e2e8f0; padding: 6px 10px; font-weight: 700; color: #334155;">Authorized Cash Retention Limit (CRL)</td>
                        <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: right; font-weight: 700; color: #334155;">${crl.toFixed(2)}</td>
                    </tr>
                    <tr style="background-color: #f1f5f9;">
                        <td style="border: 1px solid #e2e8f0; padding: 6px 10px; font-weight: 800; color: #00338d;">TOTAL CASH POSSESSION (A+B+C+D)</td>
                        <td style="border: 1px solid #e2e8f0; padding: 6px 10px; text-align: right; font-weight: 800; color: #00338d;">${total.toFixed(2)}</td>
                    </tr>
                    <tr style="color: #475569; font-size: 11.5px;">
                        <td style="border: 1px solid #e2e8f0; padding: 5px 10px; padding-left: 20px;">(A) Cash on Hand (Branch)</td>
                        <td style="border: 1px solid #e2e8f0; padding: 5px 10px; text-align: right;">${(cur['CASH_HAND'] || 0).toFixed(2)}</td>
                    </tr>
                    <tr style="color: #475569; font-size: 11.5px;">
                        <td style="border: 1px solid #e2e8f0; padding: 5px 10px; padding-left: 20px;">(B) ATM Cash</td>
                        <td style="border: 1px solid #e2e8f0; padding: 5px 10px; text-align: right;">${(cur['CASH_ATM'] || 0).toFixed(2)}</td>
                    </tr>
                    <tr style="color: #475569; font-size: 11.5px;">
                        <td style="border: 1px solid #e2e8f0; padding: 5px 10px; padding-left: 20px;">(C) Cash with BC</td>
                        <td style="border: 1px solid #e2e8f0; padding: 5px 10px; text-align: right;">${(cur['CASH_BC'] || 0).toFixed(2)}</td>
                    </tr>
                    <tr style="color: #475569; font-size: 11.5px;">
                        <td style="border: 1px solid #e2e8f0; padding: 5px 10px; padding-left: 20px;">(D) BNA Cash</td>
                        <td style="border: 1px solid #e2e8f0; padding: 5px 10px; text-align: right;">${(cur['CASH_BNA'] || 0).toFixed(2)}</td>
                    </tr>
                    <tr style="background-color: #fff5f5;">
                        <td style="border: 1px solid #e2e8f0; padding: 10px; font-weight: 900; text-transform: uppercase; color: #c53030; font-size: 13px;">Excess over Authorized CRL</td>
                        <td style="border: 1px solid #e2e8f0; padding: 10px; text-align: right; font-weight: 900; color: #c53030; font-size: 15px;">${excess.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    private static renderRiskWidgets(cur: Record<string, number>) {
        const dep = cur['Total Dep'] || 1;
        const adv = cur['Adv'] || 0;
        const cdRatio = (adv / dep) * 100;
        const profit = cur['Branch_PL'] || 0;
        const casaPct = cur['CASA_PCT'] || (((cur['SB'] || 0) + (cur['CD'] || 0)) / dep * 100);

        const cdStatus = cdRatio > 75 ? 'SATURATION RISK' : 'HEALTHY';
        const cdColor = cdRatio > 75 ? '#c53030' : '#10b981';
        const cdBg = cdRatio > 75 ? '#fff5f5' : '#f0fdf4';
        const cdBorder = cdRatio > 75 ? '#feb2b2' : '#b9f6ca';

        const profitStatus = profit > 0 ? 'FAVORABLE' : 'UNFAVORABLE';
        const profitColor = profit > 0 ? '#10b981' : '#c53030';
        const profitBg = profit > 0 ? '#f0fdf4' : '#fff5f5';
        const profitBorder = profit > 0 ? '#b9f6ca' : '#feb2b2';

        const casaStatus = casaPct >= 40 ? 'HEALTHY' : (casaPct >= 35 ? 'STABLE' : 'MONITOR');
        const casaColor = casaPct >= 40 ? '#10b981' : (casaPct >= 35 ? '#f59e0b' : '#c53030');
        const casaBg = casaPct >= 40 ? '#f0fdf4' : (casaPct >= 35 ? '#fffbeb' : '#fff5f5');
        const casaBorder = casaPct >= 40 ? '#b9f6ca' : (casaPct >= 35 ? '#fde68a' : '#feb2b2');

        return `
            <div style="flex: 1; border: 1.2px solid ${cdBorder}; background-color: ${cdBg}; padding: 12px; border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); -webkit-print-color-adjust: exact;">
                <div style="font-size: 10px; font-weight: 800; color: #7f1d1d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; opacity: 0.8;">Liquidity Risk (CD Ratio)</div>
                <div style="font-size: 22px; font-weight: 900; color: #1e293b;">${cdRatio.toFixed(2)}%</div>
                <div style="display: flex; align-items: center; margin-top: 4px;">
                    <span style="font-size: 9px; color: #64748b; font-weight: 600;">Target: < 75% | </span>
                    <span style="font-size: 9px; color: ${cdColor}; font-weight: 800; margin-left: 5px; background: white; padding: 1px 5px; border-radius: 4px; border: 1px solid ${cdColor}; white-space: nowrap;">${cdStatus}</span>
                </div>
            </div>
            <div style="flex: 1; border: 1.2px solid ${casaBorder}; background-color: ${casaBg}; padding: 12px; border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); -webkit-print-color-adjust: exact;">
                <div style="font-size: 10px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; opacity: 0.8;">Deposit Mix (CASA %)</div>
                <div style="font-size: 22px; font-weight: 900; color: #1e293b;">${casaPct.toFixed(2)}%</div>
                <div style="display: flex; align-items: center; margin-top: 4px;">
                    <span style="font-size: 9px; color: #64748b; font-weight: 600;">Target: > 40% | </span>
                    <span style="font-size: 9px; color: ${casaColor}; font-weight: 800; margin-left: 5px; background: white; padding: 1px 5px; border-radius: 4px; border: 1px solid ${casaColor}; white-space: nowrap;">${casaStatus}</span>
                </div>
            </div>
            <div style="flex: 1; border: 1.2px solid ${profitBorder}; background-color: ${profitBg}; padding: 12px; border-radius: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); -webkit-print-color-adjust: exact;">
                <div style="font-size: 10px; font-weight: 800; color: #064e3b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; opacity: 0.8;">Profitability (Net Profit)</div>
                <div style="font-size: 22px; font-weight: 900; color: #1e293b;">₹ ${profit.toFixed(2)} L</div>
                <div style="display: flex; align-items: center; margin-top: 4px;">
                    <span style="font-size: 9px; color: #64748b; font-weight: 600;">Status: </span>
                    <span style="font-size: 9px; color: ${profitColor}; font-weight: 800; margin-left: 5px; background: white; padding: 1px 5px; border-radius: 4px; border: 1px solid ${profitColor}; white-space: nowrap;">${profitStatus}</span>
                </div>
            </div>
        `;
    }

    private static renderTrendTable(metrics: string[], cur: Record<string, number>, prev: Record<string, number>, curDate: string, prevDate: string) {
        return `
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; border: 1px solid #1e293b; -webkit-print-color-adjust: exact; table-layout: auto;">
                <tbody>
                    <!-- HARDENED HEADER ROW -->
                    <tr style="background-color: #f8fafc !important; border-bottom: 2px solid #00338d;">
                        <td style="padding: 12px 8px; text-align: left; border: 1px solid #cbd5e1; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 900; color: #000000 !important; background-color: #f8fafc !important; width: 22%;">KBP</td>
                        <td style="padding: 12px 8px; text-align: right; border: 1px solid #cbd5e1; font-size: 12px; text-transform: uppercase; font-weight: 900; color: #000000 !important; background-color: #f8fafc !important; width: 14%; white-space: nowrap;">${prevDate}</td>
                        <td style="padding: 12px 8px; text-align: right; border: 1px solid #cbd5e1; font-size: 12px; text-transform: uppercase; font-weight: 900; color: #000000 !important; background-color: #f8fafc !important; width: 14%; white-space: nowrap;">${curDate}</td>
                        <td style="padding: 12px 8px; text-align: right; border: 1px solid #cbd5e1; font-size: 12px; text-transform: uppercase; font-weight: 900; color: #000000 !important; background-color: #f8fafc !important; width: 22%; white-space: nowrap;">MOVEMENT</td>
                        <td style="padding: 12px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 12px; text-transform: uppercase; font-weight: 900; color: #000000 !important; background-color: #f8fafc !important; width: 14%;">THRESHOLD</td>
                        <td style="padding: 12px 8px; text-align: center; border: 1px solid #cbd5e1; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 900; color: #000000 !important; background-color: #f8fafc !important; width: 14%;">STATUS</td>
                    </tr>
                    ${metrics.map((m, idx) => {
                        const vCur = cur[m] || 0;
                        const vPrev = prev[m] || 0;
                        const mov = vCur - vPrev;
                        const pct = vPrev !== 0 ? (mov / vPrev) * 100 : 0;
                        const color = mov >= 0 ? '#10b981' : '#ef4444';
                        const status = Math.abs(pct) < 10 ? 'WITHIN LIMIT' : 'VARIANCE';
                        const statusColor = status === 'WITHIN LIMIT' ? '#10b981' : '#ef4444';
                        const statusBg = status === 'WITHIN LIMIT' ? '#f0fdf4' : '#fff5f5';
                        const thresholdText = (m === 'NPA' || m === 'Branch_PL') ? 'Zero Tolerance' : '10% Variance';

                        return `
                            <tr style="${idx % 2 === 0 ? '' : 'background-color: #f8fafc;'}">
                                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: 800; color: #334155;">${m}</td>
                                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; color: #475569; white-space: nowrap;">${vPrev.toFixed(2)} L</td>
                                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: 800; color: #1e293b; white-space: nowrap;">${vCur.toFixed(2)} L</td>
                                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: right; color: ${color}; font-weight: 800; white-space: nowrap;">${mov >= 0 ? '+' : ''}${mov.toFixed(2)} L (${pct.toFixed(1)}%)</td>
                                <td style="padding: 10px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #64748b; font-size: 11px;">${thresholdText}</td>
                                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">
                                    <span style="display: inline-block; color: ${statusColor}; font-weight: 900; font-size: 8px; background: ${statusBg}; padding: 2px 6px; border-radius: 9999px; border: 1px solid ${statusColor}; text-transform: uppercase; white-space: nowrap; line-height: 1;">
                                        ${status}
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
}
