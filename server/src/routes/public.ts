import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

router.get('/setup', async (req, res) => {
    try {
        const branchesCount = await prisma.branch.count({
            where: { type: 'Branch' }
        });

        const atmsCount = await prisma.atm.count();

        const roCount = await prisma.branch.count({
            where: { type: 'RO' }
        });

        const staffCount = await prisma.user.count();

        // Target SOL 3933 (Regional Office) for aggregate performance metrics
        // This avoids double-counting by summing individual branches PLUS the RO aggregate
        const roUnit = await prisma.branch.findUnique({ where: { code: '3933' } });
        const latestFact = await prisma.fact.findFirst({ 
            where: roUnit ? { unitId: roUnit.id } : {},
            orderBy: { date: 'desc' } 
        });

        const businessMetrics: any = {
            sb: { val: 0, growth: 0 },
            cd: { val: 0, growth: 0 },
            td: { val: 0, growth: 0 },
            advances: { val: 0, growth: 0 },
            business: { val: 0, growth: 0 },
            asOnDate: null as Date | null
        };

        if (latestFact && roUnit) {
            const currentDt = latestFact.date;

            // FY calculations (April to March)
            const month = currentDt.getUTCMonth();
            const startYear = month < 3 ? currentDt.getUTCFullYear() - 1 : currentDt.getUTCFullYear();
            const fyStartDt = new Date(Date.UTC(startYear, 2, 31));

            // Fetch metrics specifically for RO (3933)
            const currAggs = await prisma.fact.findMany({
                where: { unitId: roUnit.id, date: currentDt }
            });

            const fyStartAggs = await prisma.fact.findMany({
                where: { unitId: roUnit.id, date: fyStartDt }
            });

            const getVal = (aggs: any[], m: string) => Number(aggs.find(a => a.metric === m)?.value || 0);

            const currSb = getVal(currAggs, 'SB');
            const currCd = getVal(currAggs, 'CD');
            const currTd = getVal(currAggs, 'TD');
            const currAdv = getVal(currAggs, 'Adv');
            const currBus = getVal(currAggs, 'Bus');

            const startSb = getVal(fyStartAggs, 'SB');
            const startCd = getVal(fyStartAggs, 'CD');
            const startTd = getVal(fyStartAggs, 'TD');
            const startAdv = getVal(fyStartAggs, 'Adv');
            const startBus = getVal(fyStartAggs, 'Bus');

            businessMetrics.sb = { val: currSb, growth: currSb - startSb };
            businessMetrics.cd = { val: currCd, growth: currCd - startCd };
            businessMetrics.td = { val: currTd, growth: currTd - startTd };
            businessMetrics.advances = { val: currAdv, growth: currAdv - startAdv };
            businessMetrics.business = { val: currBus, growth: currBus - startBus };
            businessMetrics.asOnDate = currentDt;
        }

        // 1. Leadership (Region Head & Second Line)
        const leadershipData = await prisma.user.findMany({
            where: {
                OR: [
                    { isRegionHead: true },
                    { isSecondLine: true },
                    { grade: { in: ['SM V', 'SM IV', 'TEG VI', 'TEG VII'] } }
                ],
                role: { not: 'BRANCH_USER' }
            },
            select: {
                id: true,
                fullNameEn: true,
                fullNameTa: true,
                fullNameHi: true,
                role: true,
                grade: true,
                designation: { select: { nameEn: true, nameTa: true, nameHi: true } },
                designationEn: true,
                designationTa: true,
                designationHi: true,
                isRegionHead: true,
                isSecondLine: true,
                photo: { select: { photoUrl: true } }
            }
        });

        // Sort leadership: SM V (Head) first, then SM IV (Second line)
        // User request: Annamalai should come first, then Niraj
        const leadership = leadershipData.map(l => {
            const isHead = l.isRegionHead || (l.grade && ['SM V', 'TEG VI', 'TEG VII'].includes(l.grade));
            return {
                ...l,
                isHead
            };
        }).sort((a, b) => {
            if (a.isHead && !b.isHead) return -1;
            if (!a.isHead && b.isHead) return 1;
            
            // If both second line (SM IV), handle Annamalai vs Niraj
            if (a.fullNameEn.includes('ANNAMALAI')) return -1;
            if (b.fullNameEn.includes('ANNAMALAI')) return 1;
            
            return 0;
        });

        // 2. Org Structure Data (Branches with Business)
        const allBranches = await prisma.branch.findMany({
            where: { type: 'Branch' },
            select: { 
                id: true, 
                code: true, 
                nameEn: true, 
                district: true,
                headUser: {
                    select: {
                        fullNameEn: true,
                        designationEn: true,
                        photo: { select: { photoUrl: true } }
                    }
                },
                secondLineUser: {
                    select: {
                        fullNameEn: true,
                        designationEn: true,
                        photo: { select: { photoUrl: true } }
                    }
                }
            }
        });

        // Get latest business for all branches
        const latestFacts = await prisma.fact.findMany({
            where: {
                metric: 'Bus',
                unitId: { in: allBranches.map(b => b.id) }
            },
            orderBy: { date: 'desc' },
            select: { unitId: true, value: true, date: true }
        });

        // Group facts by unitId and pick latest date
        const branchMetricsMap: Record<string, { value: number, date: string }> = {};
        latestFacts.forEach(f => {
            if (!branchMetricsMap[f.unitId]) {
                branchMetricsMap[f.unitId] = { 
                    value: Number(f.value), 
                    date: f.date.toISOString() 
                };
            }
        });

        const branchesWithMetrics = allBranches.map(b => {
            const metrics = branchMetricsMap[b.id];
            return {
                id: b.id,
                code: b.code,
                nameEn: b.nameEn,
                district: b.district,
                headName: b.headUser?.fullNameEn || '',
                headDesignation: b.headUser?.designationEn || '',
                headPhotoUrl: b.headUser?.photo?.photoUrl || null,
                secondLineName: b.secondLineUser?.fullNameEn || '',
                secondLineDesignation: b.secondLineUser?.designationEn || '',
                secondLinePhotoUrl: b.secondLineUser?.photo?.photoUrl || null,
                business: metrics?.value || 0,
                asOnDate: metrics?.date
            };
        }).sort((a, b) => b.business - a.business);

        // 3. Events (Upcoming Holidays)
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
                    nameTa: l.fullNameTa,
                    nameHi: l.fullNameHi,
                    designation: l.designationEn || l.designation?.nameEn || l.role,
                    designationTa: l.designationTa || l.designation?.nameTa,
                    designationHi: l.designationHi || l.designation?.nameHi,
                    isHead: l.isHead,
                    isSecondLine: l.isSecondLine,
                    photoUrl: l.photo?.photoUrl
                })),
                branchList: branchesWithMetrics,
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
