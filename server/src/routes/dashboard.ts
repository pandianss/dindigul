import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/config', authenticateToken, async (req, res) => {
    try {
        // 1. Fetch the active SRM Message (most recent)
        const srmMessage = await prisma.srmMessage.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Fetch all active Dashboard Tickers
        const tickers = await prisma.dashboardTicker.findMany({
            where: { isActive: true },
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

        // 6. Format notices
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
            tickers: tickers.map((t: any) => t.text),
            announcements: formattedNotices,
            kpis,
            branchPulse,
            lastUpdated: latestDate || null
        });
    } catch (error) {
        console.error('Error fetching dashboard config:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard config' });
    }
});

export default router;
