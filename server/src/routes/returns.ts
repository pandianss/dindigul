import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { PDFRenderer, TemplateRenderer } from '../renderers';
import { FactRepository } from '../infra';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const router = Router();

router.get('/generate', authenticateToken, async (req: any, res) => {
    const { date, period = 'Monthly' } = req.query;
    if (!date) return res.status(400).json({ error: 'date query parameter required (YYYY-MM-DD)' });

    try {
        const [y, m, d] = String(date).split('-').map(Number);
        const businessDate = new Date(Date.UTC(y, m - 1, d));

        // 1. Fetch all snapshots for this date to aggregate
        const snapshots = await prisma.misSnapshot.findMany({
            where: { businessDate },
            include: {
                panelData: true,
                branch: true
            }
        });

        if (snapshots.length === 0) {
            return res.status(404).json({ error: `No MIS data found for ${date}` });
        }

        // 2. Fetch Parameter Registry for Display Names and Categories
        const registry = await prisma.misParameterRegistry.findMany({
            where: { isEnabled: true },
            orderBy: { orderIndex: 'asc' }
        });
        const regMap = Object.fromEntries(registry.map(r => [r.parameterName, r]));

        // 3. Aggregate Data for the entire Region
        const regionalTotals: Record<string, any> = {};

        for (const snap of snapshots) {
            // Skip Regional Office if it somehow has its own snapshot to avoid double counting
            if (snap.branch?.type === 'REGIONAL OFFICE') continue;

            for (const p of snap.panelData) {
                if (!regionalTotals[p.parameter]) {
                    const regEntry = regMap[p.parameter];
                    regionalTotals[p.parameter] = {
                        parameter: p.parameter,
                        displayName: regEntry?.displayName || p.parameter.replace(/_/g, ' '),
                        category: regEntry?.category || 'Other',
                        orderIndex: regEntry?.orderIndex || 999,
                        val_current: 0,
                        val_fy_start: 0,
                        val_prev_m_end: 0,
                        budget_month: 0,
                        growth_fy: 0,
                        growth_month: 0,
                        gap_month: 0
                    };
                }

                const rt = regionalTotals[p.parameter];
                rt.val_current += Number(p.val_current);
                rt.val_fy_start += Number(p.val_fy_start);
                rt.val_prev_m_end += Number(p.val_prev_m_end);
                rt.budget_month += Number(p.budget_month);
                rt.growth_fy += Number(p.growth_fy);
                rt.growth_month += Number(p.growth_month);
                rt.gap_month += Number(p.gap_month);
            }
        }

        // 4. Handle Ratio Parameters (CASA%, CD Ratio) separately to avoid summing percentages
        if (regionalTotals['CASA%'] && regionalTotals['Total Dep'] && regionalTotals['CASA']) {
            const dep = regionalTotals['Total Dep'].val_current;
            const casa = regionalTotals['CASA'].val_current;
            const depPrev = regionalTotals['Total Dep'].val_fy_start;
            const casaPrev = regionalTotals['CASA'].val_fy_start;

            regionalTotals['CASA%'].val_current = dep > 0 ? (casa / dep) * 100 : 0;
            regionalTotals['CASA%'].val_fy_start = depPrev > 0 ? (casaPrev / depPrev) * 100 : 0;
            regionalTotals['CASA%'].growth_fy = regionalTotals['CASA%'].val_current - regionalTotals['CASA%'].val_fy_start;
        }

        if (regionalTotals['CD_Ratio'] && regionalTotals['Total Dep'] && regionalTotals['Adv']) {
            const dep = regionalTotals['Total Dep'].val_current;
            const adv = regionalTotals['Adv'].val_current;
            const depPrev = regionalTotals['Total Dep'].val_fy_start;
            const advPrev = regionalTotals['Adv'].val_fy_start;

            regionalTotals['CD_Ratio'].val_current = dep > 0 ? (adv / dep) * 100 : 0;
            regionalTotals['CD_Ratio'].val_fy_start = depPrev > 0 ? (advPrev / depPrev) * 100 : 0;
            regionalTotals['CD_Ratio'].growth_fy = regionalTotals['CD_Ratio'].val_current - regionalTotals['CD_Ratio'].val_fy_start;
        }

        // 5. Group by Category
        const sortedParams = Object.values(regionalTotals).sort((a, b) => a.orderIndex - b.orderIndex);
        const categories: Record<string, any[]> = {};
        for (const p of sortedParams) {
            if (!categories[p.category]) categories[p.category] = [];
            categories[p.category].push(p);
        }

        const categoryList = Object.entries(categories).map(([name, params]) => ({ name, params }));

        // 6. Get RO Metadata
        const roData = await FactRepository.getRegionalOfficeConfig();

        // 7. Render Template and Generate PDF
        const html = await TemplateRenderer.renderLetter({
            metadata: {
                referenceNo: `RO/DGL/RETURNS/${period.toUpperCase()}/${date}`,
                letterDate: format(businessDate, 'dd.MM.yyyy'),
                generatedAt: new Date(),
                type: 'MANUAL',
                category: 'GENERAL',
                version: 1
            },
            organization: {
                bankName: roData.bankName,
                officeName: roData.officeName,
                address: roData.address,
                phone: roData.phone,
                email: roData.email,
                website: 'http://dindigulbank.com'
            },
            recipient: { name: 'Regional Management', isExternal: false },
            signatory: {
                name: { en: roData.signatoryName, hi: '', ta: '' },
                title: { en: roData.signingAuthEn, hi: '', ta: '' }
            },
            content: {
                title: { en: `CONSOLIDATED ${String(period).toUpperCase()} RETURN`, hi: '', ta: '' },
                bodyHtml: '' // In real use, would build table here
            }
        });

        const pdfBuffer = await PDFRenderer.generate(html);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Return_${period}_${date}.pdf`);
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('[returns/generate] Error:', error);
        res.status(500).json({ error: 'Failed to generate return' });
    }
});

router.get('/generate-visits', authenticateToken, async (req: any, res) => {
    const { month, preparerId, signatoryId } = req.query;
    if (!month) return res.status(400).json({ error: 'month query parameter required (YYYY-MM)' });

    try {
        const [year, monthNum] = String(month).split('-').map(Number);
        const startDate = startOfMonth(new Date(year, monthNum - 1));
        const endDate = endOfMonth(new Date(year, monthNum - 1));

        // 1. Fetch all branches and categorize
        const branches = await prisma.branch.findMany({
            where: {
                OR: [ { type: 'BRANCH' }, { type: 'Branch' } ]
            }
        });

        // Robust grouping (case-insensitive and handling space vs underscore)
        const ruralSU = branches.filter(b => {
             const pg = (b.populationGroup || '').toUpperCase().replace(/\s/g, '_');
             return pg === 'RURAL' || pg === 'SEMI_URBAN';
        });
        const urbanMetro = branches.filter(b => {
             const pg = (b.populationGroup || '').toUpperCase().replace(/\s/g, '_');
             return pg === 'URBAN' || pg === 'METRO';
        });

        // 2. Fetch actual visits for this month
        const visits = await prisma.branchVisit.findMany({
            where: {
                visitDate: { gte: startDate, lte: endDate }
            },
            include: { branch: true, visitor: true },
            orderBy: { visitDate: 'asc' }
        });

        // 3. Aggregate stats by category
        const filterVisits = (pgList: string[]) => visits.filter(v => {
            const pg = (v.branch?.populationGroup || '').toUpperCase().replace(/\s/g, '_');
            return pgList.includes(pg);
        });

        const visitsRuralSU = filterVisits(['RURAL', 'SEMI_URBAN']);
        const visitsUrbanMetro = filterVisits(['URBAN', 'METRO']);

        const stats = {
            rural: {
                total: ruralSU.length,
                target: Math.ceil(ruralSU.length / 3),
                actual1: visitsRuralSU.filter(v => v.visitorCategory === 'FIRST_LINE').length,
                actual2: visitsRuralSU.filter(v => v.visitorCategory === 'SECOND_LINE').length,
                actualTotal: visitsRuralSU.length
            },
            urban: {
                total: urbanMetro.length,
                target: Math.ceil(urbanMetro.length / 6),
                actual1: visitsUrbanMetro.filter(v => v.visitorCategory === 'FIRST_LINE').length,
                actual2: visitsUrbanMetro.filter(v => v.visitorCategory === 'SECOND_LINE').length,
                actualTotal: visitsUrbanMetro.length
            }
        };

        const totalTarget = stats.rural.target + stats.urban.target;
        const totalActual = stats.rural.actualTotal + stats.urban.actualTotal;

        const visitDetails = visits.map((v, idx) => ({
            sl: idx + 1,
            branchName: `${v.branch?.nameEn} [${v.branch?.code}]`,
            category: v.branch?.populationGroup?.substring(0, 1) || 'O',
            date: format(v.visitDate, 'dd.MM.yyyy'),
            official: v.visitor?.fullNameEn || 'N/A'
        }));

        // 4. Resolve Signatories
        const roData = await FactRepository.getRegionalOfficeConfig();
        
        const fetchSignatory = async (id: string) => {
            if (!id) return null;
            return prisma.user.findUnique({ where: { id } });
        };

        const preparer = await fetchSignatory(preparerId as string);
        const signatory = await fetchSignatory(signatoryId as string);

        const refNo = `RO/DGL/RETURNS/BV/${year}/${String(monthNum).padStart(2, '0')}/${Math.floor(Math.random() * 900) + 100}`;

        const html = await TemplateRenderer.renderLetter({
            metadata: {
                referenceNo: refNo,
                letterDate: format(new Date(), 'dd.MM.yyyy'),
                generatedAt: new Date(),
                type: 'MANUAL',
                category: 'GENERAL',
                version: 1
            },
            organization: {
                bankName: roData.bankName,
                officeName: roData.officeName,
                address: roData.address,
                phone: roData.phone,
                email: roData.email,
                website: 'http://dindigulbank.com'
            },
            recipient: { name: 'Regional Management', isExternal: false },
            signatory: {
                name: { en: signatory?.fullNameEn || roData.signatoryName, hi: '', ta: '' },
                title: { en: signatory?.designationEn || roData.signingAuthEn, hi: '', ta: '' }
            },
            content: {
                title: { en: 'Branch Visits Report', hi: '', ta: '' },
                bodyHtml: '' // Table data would go here
            }
        });

        const pdfBuffer = await PDFRenderer.generate(html);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Branch_Visits_${month}.pdf`);
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('[returns/generate-visits] Error:', error);
        // Temporary file-based logger to capture remote errors
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), '..', 'error_log.txt');
            fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] PDF Error: ${error.message}\nStack: ${error.stack}\n`);
        } catch (logErr) {
            console.error('Failed to log to file:', logErr);
        }
        res.status(500).json({ error: 'Failed to generate visits report', details: error.message });
    }
});

router.get('/generate-visit-letter/:visitId', authenticateToken, async (req: any, res) => {
    const { visitId } = req.params;
    try {
        const visit = await prisma.branchVisit.findUnique({
            where: { id: visitId },
            include: {
                branch: true,
                visitor: {
                    include: { designation: true }
                }
            }
        });

        if (!visit) return res.status(404).json({ error: 'Visit record not found' });

        const roData = await FactRepository.getRegionalOfficeConfig();

        const html = await TemplateRenderer.renderLetter({
            metadata: {
                referenceNo: visit.id.substring(0, 8).toUpperCase(),
                letterDate: format(new Date(), 'dd.MM.yyyy'),
                generatedAt: new Date(),
                type: 'MANUAL',
                category: 'GENERAL',
                version: 1
            },
            organization: {
                bankName: roData.bankName,
                officeName: roData.officeName,
                address: roData.address,
                phone: roData.phone,
                email: roData.email,
                website: 'http://dindigulbank.com'
            },
            recipient: { name: visit.branch.nameEn, isExternal: false },
            signatory: {
                name: { en: roData.signatoryName, hi: '', ta: '' },
                title: { en: roData.signingAuthEn, hi: '', ta: '' }
            },
            content: {
                title: { en: 'Visit Observation Letter', hi: '', ta: '' },
                bodyHtml: `<p>Observations for visit on ${format(visit.visitDate, 'dd.MM.yyyy')}:</p><p>${visit.observations || 'N/A'}</p>`
            }
        });

        const pdfBuffer = await PDFRenderer.generate(html);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Observation_Letter_${visit.branch.code}.pdf`);
        res.send(pdfBuffer);

    } catch (error: any) {
        console.error('[returns/generate-visit-letter] Error:', error);
        res.status(500).json({ error: 'Failed to generate observation letter' });
    }
});

export default router;
