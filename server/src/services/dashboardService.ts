import prisma from '../lib/prisma';
import { getFYMetrics, getFYRange } from '../utils/calendar';
import { startOfDay, endOfDay } from 'date-fns';

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

        const latestDates = await prisma.fact.findMany({
            distinct: ['date'],
            orderBy: { date: 'desc' },
            take: 2,
            select: { date: true }
        });
        const latestDate = latestDates[0]?.date || new Date();
        const previousDate = latestDates[1]?.date || latestDate;

        const branch = await prisma.branch.findUnique({ where: { code: '3933' } });
        if (!branch) {
            return { success: false, error: 'Regional Office branch not found' };
        }

        const { start: fyStart } = getFYRange(latestDate);
        const baselineDate = new Date(fyStart.getTime() - 86400000);

        const [regParams, recentFacts, prevFacts, baselineFacts] = await Promise.all([
            prisma.misParameterRegistry.findMany({ 
                where: { 
                    parameterName: { in: ['SB', 'CD', 'CASA', 'TD', 'TOTAL_BUSINESS'] },
                    isEnabled: true 
                },
                orderBy: { orderIndex: 'asc' }
            }),
            prisma.fact.findMany({
                where: {
                    unitId: branch.id,
                    date: { gte: startOfDay(latestDate), lte: endOfDay(latestDate) }
                }
            }),
            prisma.fact.findMany({
                where: {
                    unitId: branch.id,
                    date: { gte: startOfDay(previousDate), lte: endOfDay(previousDate) }
                }
            }),
            prisma.fact.findMany({
                where: {
                    unitId: branch.id,
                    date: { gte: startOfDay(baselineDate), lte: endOfDay(baselineDate) }
                }
            })
        ]);

        const baselineMap = new Map<string, number>();
        baselineFacts.forEach(f => baselineMap.set(f.metric, Number(f.value)));

        const prevMap = new Map<string, number>();
        prevFacts.forEach(f => prevMap.set(f.metric, Number(f.value)));

        const dashboardMetrics = ['SB', 'CD', 'CASA', 'TD'];

        const kpis = recentFacts.filter(f => dashboardMetrics.includes(f.metric)).map(f => {
            const config = regParams.find(p => p.parameterName === f.metric);
            if (!config) return null;

            const isRatio = ['%', 'Ratio', 'Percent', 'CD_Ratio'].some(k => f.metric.includes(k));
            const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(branch.type?.toUpperCase() || '') || branch.code === '3933';

            const actual = Number(f.value);
            const baseline = baselineMap.get(f.metric) || actual;
            const previous = prevMap.get(f.metric) || actual;
            
            const fyGrowth = actual - baseline;
            const dailyGrowth = actual - previous;
            const pace = baseline !== 0 ? (fyGrowth / Math.abs(baseline)) * 100 : 0;
            
            let status: 'SURPASSED' | 'POSITIVE' | 'LAGGING' | 'NEGATIVE' = 'LAGGING';
            if (actual > baseline) status = 'POSITIVE';
            else if (actual < baseline) status = 'NEGATIVE';

            const unit = (config.category === 'CASH' || !isRegional) && !isRatio ? 'Lakhs' : (isRatio ? '%' : 'Cr');

            const formatVal = (v: number) => {
                if (unit === 'Cr' || unit === 'Lakhs') return `₹${v.toFixed(1)} ${unit}`;
                if (unit === '%') return `${v.toFixed(2)}%`;
                return v.toLocaleString('en-IN');
            };

            const getGrowthDisplay = (val: number) => {
                const prefix = val > 0 ? '+' : '';
                if (unit === 'Cr' || unit === 'Lakhs') return `${prefix}₹${val.toFixed(1)} ${unit}`;
                if (unit === '%') return `${prefix}${val.toFixed(2)}%`;
                return `${prefix}${val.toLocaleString('en-IN')}`;
            };

            return {
                code: f.metric,
                label: config.displayName,
                val: formatVal(actual),
                budget: 'N/A',
                growth: fyGrowth,
                growthDisplay: getGrowthDisplay(fyGrowth),
                dailyGrowth: dailyGrowth,
                dailyGrowthDisplay: getGrowthDisplay(dailyGrowth),
                pace: Number.isFinite(pace) ? parseFloat(pace.toFixed(1)) : 0,
                status,
                unit
            };
        }).filter(Boolean).sort((a: any, b: any) => {
            return dashboardMetrics.indexOf(a.code) - dashboardMetrics.indexOf(b.code);
        });


        const branchPulse = { SURPASSED: 0, POSITIVE: 0, LAGGING: 0, NEGATIVE: 0 };
        recentFacts.filter(f => f.metric === 'TOTAL_BUSINESS').forEach(f => {
            const baseline = baselineMap.get(`${f.unitId}:${f.metric}`) || 0;
            const actual = Number(f.value);
            if (actual > baseline) branchPulse.POSITIVE++;
            else branchPulse.NEGATIVE++;
        });

        const pendingLetters = await prisma.letter.findMany({
            where: { status: { in: ['DRAFT', 'SENT'] } },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { branch: true }
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
                param: 'General',
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

        const upcomingEvents = await prisma.holiday.findMany({
            where: { date: { gte: new Date() } },
            take: 6,
            orderBy: { date: 'asc' }
        });

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

        return {
            success: true,
            srmMessage,
            tickers: tickers.map((t: any) => ({ text: t.text, link: t.linkUrl })),
            announcements: notices.map((n: any) => ({
                id: n.id,
                type: n.priority === 'URGENT' ? 'URGENT' : (n.category?.toUpperCase() || 'INFO'),
                category: n.category,
                title: n.titleEn,
                body: n.contentEn,
                date: n.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                pinned: n.isPinned,
                author: n.targetRole || 'SYSTEM',
                branches: n.branchId ? [n.branch?.code || 'SPECIFIC'] : ['ALL']
            })),
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
            fyMetrics: getFYMetrics()
        };
    },

    async updateSrmMessage(data: any) {
        const newMessage = await prisma.srmMessage.create({ data: { ...data, isActive: true } });
        await prisma.srmMessage.updateMany({ where: { id: { not: newMessage.id } }, data: { isActive: false } });
        return newMessage;
    },

    async addTicker(data: any) {
        return await prisma.dashboardTicker.create({
            data: { text: data.text, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null, linkUrl: data.linkUrl, isActive: true, order: 0 }
        });
    },

    async updateTicker(id: string, data: any) {
        return await prisma.dashboardTicker.update({
            where: { id },
            data: { text: data.text, isActive: data.isActive, expiresAt: data.expiresAt ? new Date(data.expiresAt) : null, linkUrl: data.linkUrl, order: data.order }
        });
    },

    async deleteTicker(id: string) {
        return await prisma.dashboardTicker.delete({ where: { id } });
    },

    async getAdminTickers() {
        return await prisma.dashboardTicker.findMany({ orderBy: { createdAt: 'desc' } });
    }
};
