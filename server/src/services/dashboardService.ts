import prisma from '../lib/prisma';
import { getFYMetrics } from '../utils/fyUtils';

export const dashboardService = {
    async getConfig() {
        const srmMessage = await prisma.srmMessage.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
        });

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

        const latestSnapshots = await prisma.snapshot.findMany({
            orderBy: { date: 'desc' },
            take: 500,
            include: { parameter: true, branch: true }
        });

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
                if (unit === 'Cr' || unit === 'Lakhs') return `₹${v.toFixed(1)} Cr`;
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

        const branchPulse = {
            SURPASSED: recentSnaps.filter((s: any) => s.status === 'SURPASSED').length,
            POSITIVE: recentSnaps.filter((s: any) => s.status === 'POSITIVE').length,
            LAGGING: recentSnaps.filter((s: any) => s.status === 'LAGGING').length,
            NEGATIVE: recentSnaps.filter((s: any) => s.status === 'NEGATIVE').length,
        };

        const pendingLetters = await prisma.letter.findMany({
            where: { status: { in: ['DRAFT', 'SENT'] } },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { branch: true, parameter: true }
        });

        const pendingAudit = await prisma.auditObservation.findMany({
            where: { status: 'PENDING' },
            take: 5,
            orderBy: { targetDate: 'asc' },
            include: { branch: true }
        });

        const pendingActions = [
            ...pendingLetters.map((l: any) => ({
                id: l.id,
                type: l.type,
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

        const today = new Date();
        const upcomingEvents = await prisma.holiday.findMany({
            where: { date: { gte: today } },
            take: 6,
            orderBy: { date: 'asc' }
        });

        const fyMetrics = getFYMetrics();
        const curDate = new Date();
        const anniversaryCheckDates = Array.from({ length: 16 }, (_, i) => {
            const d = new Date(curDate);
            d.setDate(curDate.getDate() + i);
            return { month: d.getMonth() + 1, day: d.getDate(), year: d.getFullYear() };
        });

        const allBranches = await prisma.branch.findMany({
            where: { openDate: { not: null } },
            select: { id: true, nameEn: true, code: true, openDate: true }
        });

        const anniversaries = allBranches.filter(b => {
            const parts = b.openDate!.split('-');
            if (parts.length !== 3) return false;
            const m = parseInt(parts[1]);
            const d = parseInt(parts[2]);
            const y = parseInt(parts[0]);
            
            const match = anniversaryCheckDates.find(ad => ad.month === m && ad.day === d);
            if (!match) return false;
            
            (b as any).years = match.year - y;
            (b as any).displayDate = `${d.toString().padStart(2, '0')} ${new Date(2000, m - 1).toLocaleDateString('en-GB', { month: 'short' })}`;
            return true;
        }).map((b: any) => ({
            id: b.id,
            name: b.nameEn,
            code: b.code,
            years: b.years,
            date: b.displayDate,
            _m: parseInt(b.openDate!.split('-')[1]),
            _d: parseInt(b.openDate!.split('-')[2])
        })).sort((a, b) => (a._m - b._m) || (a._d - b._d));

        console.log(`[Dashboard] Found ${anniversaries.length} upcoming anniversaries`);

        const formattedNotices = notices.map((n: any) => {
            const type = n.priority === 'URGENT' ? 'URGENT' : (n.category?.toUpperCase() || 'INFO');
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

        return {
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
            anniversaries,
            fyMetrics
        };
    },

    async updateSrmMessage(data: any) {
        const newMessage = await prisma.srmMessage.create({
            data: { ...data, isActive: true }
        });
        await prisma.srmMessage.updateMany({
            where: { id: { not: newMessage.id } },
            data: { isActive: false }
        });
        return newMessage;
    },

    async addTicker(data: any) {
        return await prisma.dashboardTicker.create({
            data: {
                text: data.text,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
                linkUrl: data.linkUrl,
                isActive: true,
                order: 0
            }
        });
    },

    async updateTicker(id: string, data: any) {
        return await prisma.dashboardTicker.update({
            where: { id },
            data: {
                text: data.text,
                isActive: data.isActive,
                expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : undefined,
                linkUrl: data.linkUrl,
                order: data.order
            }
        });
    },

    async deleteTicker(id: string) {
        return await prisma.dashboardTicker.delete({ where: { id } });
    },

    async getAdminTickers() {
        return await prisma.dashboardTicker.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }
};
