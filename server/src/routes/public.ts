import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

router.get('/setup', async (req, res) => {
    try {
        const branchesCount = await prisma.branch.count({
            where: { type: 'BRANCH' }
        });

        const atmsCount = await prisma.atm.count();

        const roCount = await prisma.branch.count({
            where: { type: 'RO' }
        });

        const staffCount = await prisma.user.count();

        // Determine dates for Fact aggregations
        const latestFact = await prisma.fact.findFirst({ orderBy: { date: 'desc' } });
        const businessMetrics = {
            business: { val: 0, growth: 0 },
            deposits: { val: 0, growth: 0 },
            casa: { val: 0, growth: 0 },
            rtd: { val: 0, growth: 0 },
            advances: { val: 0, growth: 0 },
        };

        if (latestFact) {
            const currentDt = latestFact.date;

            // FY calculations (April to March)
            // If month is < 3 (Jan-Mar), FY started previous year. Mar 31 is the opening date.
            const month = currentDt.getUTCMonth(); // 0-based
            const startYear = month < 3 ? currentDt.getUTCFullYear() - 1 : currentDt.getUTCFullYear();
            const fyStartDt = new Date(Date.UTC(startYear, 2, 31)); // Mar 31

            // Aggregations
            const currAggs = await prisma.fact.groupBy({
                by: ['metric'],
                _sum: { value: true },
                where: { date: currentDt }
            });

            // Need to get FY Start values, but there's a chance they fall exactly on 31st or 1st or nearest.
            // But we can just use the query for that exact date as BusinessSnapshotService does.
            const fyStartAggs = await prisma.fact.groupBy({
                by: ['metric'],
                _sum: { value: true },
                where: { date: fyStartDt }
            });

            const getVal = (aggs: any[], m: string) => aggs.find(a => a.metric === m)?._sum?.value || 0;

            const currTotalDep = getVal(currAggs, 'Total Dep');
            const currCasa = getVal(currAggs, 'CASA');
            const currTd = getVal(currAggs, 'TD');
            const currAdv = getVal(currAggs, 'Adv');
            const currBus = getVal(currAggs, 'Bus');

            const startTotalDep = getVal(fyStartAggs, 'Total Dep');
            const startCasa = getVal(fyStartAggs, 'CASA');
            const startTd = getVal(fyStartAggs, 'TD');
            const startAdv = getVal(fyStartAggs, 'Adv');
            const startBus = getVal(fyStartAggs, 'Bus');

            businessMetrics.deposits = { val: currTotalDep, growth: currTotalDep - startTotalDep };
            businessMetrics.casa = { val: currCasa, growth: currCasa - startCasa };
            businessMetrics.rtd = { val: currTd, growth: currTd - startTd };
            businessMetrics.advances = { val: currAdv, growth: currAdv - startAdv };
            businessMetrics.business = { val: currBus, growth: currBus - startBus };
        }

        // 1. Leadership (Region Head & Second Line)
        const leadership = await prisma.user.findMany({
            where: {
                OR: [
                    { isRegionHead: true },
                    { isSecondLine: true }
                ]
            },
            select: {
                id: true,
                fullNameEn: true,
                role: true,
                designation: { select: { nameEn: true } },
                isRegionHead: true,
                isSecondLine: true
            },
            orderBy: {
                isRegionHead: 'desc'
            }
        });

        // 2. Events (Upcoming Holidays)
        const today = new Date();
        const upcomingEvents = await prisma.holiday.findMany({
            where: {
                date: { gte: today }
            },
            orderBy: { date: 'asc' },
            take: 5
        });

        // 3. Achievements (Recent Notices marked as ACHIEVEMENT or similar, fallback to latest general notices for now)
        const achievements = await prisma.notice.findMany({
            where: {
                category: { in: ['ACHIEVEMENT', 'GENERAL'] },
            },
            include: {
                photo: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        res.json({
            success: true,
            setup: {
                branches: branchesCount,
                atms: atmsCount,
                regionalOffices: roCount,
                staff: staffCount,
                ...businessMetrics,
                leadership: leadership.map(l => ({
                    name: l.fullNameEn,
                    designation: l.designation?.nameEn || l.role,
                    isHead: l.isRegionHead
                })),
                events: upcomingEvents.map(e => ({
                    date: e.date,
                    name: e.nameEn,
                    type: e.type,
                    venue: e.venue
                })),
                achievements: achievements.map(a => ({
                    title: a.titleEn,
                    description: a.contentEn,
                    date: a.createdAt,
                    category: a.category,
                    photoUrl: a.photo?.photoUrl
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching public setup data:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch setup data' });
    }
});

export default router;
