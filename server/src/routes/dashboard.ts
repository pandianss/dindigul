import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { getFYMetrics } from '../utils/fyUtils';

const router = express.Router();

router.get('/config', authenticateToken, async (req, res) => {
    try {
        // 1. Fetch the active SRM Message (most recent)
        const srmMessage = await prisma.srmMessage.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Fetch all active Dashboard Tickers that haven't expired
        const tickers = await prisma.dashboardTicker.findMany({
            where: {
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            orderBy: { order: 'asc' }
        });

        // 3. Fetch latest 10 pinned or urgent Notices
        const notices = await prisma.notice.findMany({
            take: 10,
            orderBy: [
                { isPinned: 'desc' },
                { createdAt: 'desc' }
            ],
            include: {
                branch: { select: { code: true } }
            }
        });

        // 4. Compute branch-level KPIs from latest snapshots grouped by parameter
        const latestSnapshots = await (prisma as any).snapshot.findMany({
            orderBy: { date: 'desc' },
            take: 500,
            include: { parameter: true, branch: true }
        });

        // Group by parameter code and take the most recent batch
        const paramMap: Record<string, { values: number[], budgets: number[], param: any }> = {};
        const dateGroups = new Map<string, any[]>();
        for (const s of latestSnapshots) {
            const dk = s.date.toISOString();
            if (!dateGroups.has(dk)) dateGroups.set(dk, []);
            dateGroups.get(dk)!.push(s);
        }
        const sortedDates = Array.from(dateGroups.keys()).sort((a, b) => b.localeCompare(a));
        const latestDate = sortedDates[0];
        const recentSnaps = latestDate ? dateGroups.get(latestDate)! : [];

        for (const s of recentSnaps) {
            const code = s.parameter?.code || 'UNKNOWN';
            if (!paramMap[code]) paramMap[code] = { values: [], budgets: [], param: s.parameter };
            paramMap[code].values.push(s.value);
            if (s.budget) paramMap[code].budgets.push(s.budget);
        }

        const kpis = Object.entries(paramMap).map(([code, { values, budgets, param }]) => {
            const actual = values.reduce((a, b) => a + b, 0);
            const budget = budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) : 0;
            const pace = budget > 0 ? ((actual - budget) / budget) * 100 : 0;
            const unit = param?.unit || '';
            let status = 'LAGGING';
            if (Math.abs(pace) < 1) status = 'POSITIVE';
            else if (pace > 0) status = 'SURPASSED';
            else if (pace < -10) status = 'NEGATIVE';

            const formatVal = (v: number) => {
                if (unit === 'Cr') return `₹${v.toFixed(1)} Cr`;
                if (unit === '%') return `${v.toFixed(2)}%`;
                return v.toLocaleString('en-IN');
            };

            return {
                code,
                label: param?.nameEn || code,
                val: formatVal(actual),
                budget: formatVal(budget),
                pace: parseFloat(pace.toFixed(1)),
                status,
                unit
            };
        });

        // 5. Branch pulse summary from snapshot statuses
        const branchPulse = {
            SURPASSED: recentSnaps.filter((s: any) => s.status === 'SURPASSED').length,
            POSITIVE: recentSnaps.filter((s: any) => s.status === 'POSITIVE').length,
            LAGGING: recentSnaps.filter((s: any) => s.status === 'LAGGING').length,
            NEGATIVE: recentSnaps.filter((s: any) => s.status === 'NEGATIVE').length,
        };

        // 6. Fetch Pending Actions (Letters + Audit)
        const pendingLetters = await prisma.letter.findMany({
            where: { status: { in: ['DRAFT', 'SENT'] } },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { branch: true, parameter: true }
        });

        const pendingAudit = await (prisma as any).auditObservation.findMany({
            where: { status: 'PENDING' },
            take: 5,
            orderBy: { targetDate: 'asc' },
            include: { branch: true }
        });

        const pendingActions = [
            ...pendingLetters.map((l: any) => ({
                id: l.id,
                type: l.type, // APPRECIATION or EXPLANATION
                branch: `${l.branch?.nameEn} (${l.branch?.code})`,
                param: l.parameter?.nameEn || 'General',
                due: l.period || l.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                status: l.status,
                urgent: l.type === 'EXPLANATION'
            })),
            ...pendingAudit.map((a: any) => ({
                id: a.id,
                type: 'AUDIT',
                branch: `${a.branch?.nameEn} (${a.branch?.code})`,
                param: a.observation,
                due: a.targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                status: a.status,
                urgent: a.riskLevel === 'HIGH'
            }))
        ].sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1)).slice(0, 8);

        // 7. Fetch Upcoming Events (Holidays)
        const today = new Date();
        const upcomingEvents = await prisma.holiday.findMany({
            where: { date: { gte: today } },
            take: 6,
            orderBy: { date: 'asc' }
        });

        // 8. Financial Year Metrics
        const fyMetrics = getFYMetrics();

        // 9. Format notices
        const formattedNotices = notices.map((n: any) => {
            const type = n.priority === 'HIGH' ? 'URGENT' : (n.category?.toUpperCase() || 'INFO');
            return {
                id: n.id,
                type,
                category: n.category,
                title: n.titleEn,
                body: n.contentEn,
                date: n.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                pinned: n.isPinned,
                author: n.targetRole || 'SYSTEM',
                branches: n.branchId ? [n.branch?.code || 'SPECIFIC'] : ['ALL']
            };
        });

        res.json({
            success: true,
            srmMessage,
            tickers: tickers.map((t: any) => ({
                text: t.text,
                link: t.linkUrl
            })),
            announcements: formattedNotices,
            kpis,
            branchPulse,
            lastUpdated: latestDate || null,
            pendingActions,
            upcomingEvents: upcomingEvents.map((e: any) => ({
                date: e.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
                day: e.date.toLocaleDateString('en-GB', { weekday: 'short' }),
                label: e.nameEn,
                type: e.type || 'CAMP'
            })),
            fyMetrics
        });
    } catch (error) {
        console.error('Error fetching dashboard config:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard config' });
    }
});

// 7. Admin: Update SRM Message
router.post('/srm-message', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    const { name, title, region, highlight, message } = req.body;
    try {
        const newMessage = await prisma.srmMessage.create({
            data: { name, title, region, highlight, message, isActive: true }
        });
        // Deactivate older messages
        await prisma.srmMessage.updateMany({
            where: { id: { not: newMessage.id } },
            data: { isActive: false }
        });
        res.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Error updating SRM message:', error);
        res.status(500).json({ success: false, error: 'Failed to update message' });
    }
});

// 8. Admin: Add Dashboard Ticker
router.post('/tickers', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    const { text, expiresAt, linkUrl } = req.body;
    try {
        const ticker = await prisma.dashboardTicker.create({
            data: {
                text,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                linkUrl,
                isActive: true,
                order: 0
            }
        });
        res.json({ success: true, ticker });
    } catch (error) {
        console.error('Error adding ticker:', error);
        res.status(500).json({ success: false, error: 'Failed to add ticker' });
    }
});

// 9. Admin: Update/Toggle Ticker
router.put('/tickers/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    const { text, isActive, expiresAt, linkUrl, order } = req.body;
    try {
        const ticker = await prisma.dashboardTicker.update({
            where: { id: req.params.id },
            data: {
                text,
                isActive,
                expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : undefined,
                linkUrl,
                order
            }
        });
        res.json({ success: true, ticker });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update ticker' });
    }
});

// 10. Admin: Delete Ticker
router.delete('/tickers/:id', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    try {
        await prisma.dashboardTicker.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete ticker' });
    }
});

// 10. Admin: Get all tickers for management
router.get('/admin/tickers', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
    try {
        const tickers = await prisma.dashboardTicker.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(tickers);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch tickers' });
    }
});

export default router;

