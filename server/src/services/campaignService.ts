import prisma from '../lib/prisma';
import { differenceInDays, isSunday, addDays, format, startOfDay } from 'date-fns';

export async function createCampaign(data: {
    title: string;
    tagline?: string;
    logoUrl?: string;
    startDate: Date;
    endDate: Date;
    type: string;
    metric: string;
    targetValue: number;
    targets: { branchId: string; targetValue: number }[];
}) {
    return await prisma.campaign.create({
        data: {
            title: data.title,
            tagline: data.tagline,
            logoUrl: data.logoUrl,
            startDate: data.startDate,
            endDate: data.endDate,
            type: data.type,
            metric: data.metric,
            targetValue: data.targetValue,
            status: 'ACTIVE',
            targets: {
                create: data.targets
            }
        },
        include: {
            targets: true
        }
    });
}

export async function getCampaigns() {
    return await prisma.campaign.findMany({
        orderBy: { startDate: 'desc' },
        include: {
            _count: {
                select: { dailyData: true, targets: true }
            }
        }
    });
}

export async function getCampaignById(id: string) {
    const campaign = await prisma.campaign.findUnique({
        where: { id },
        include: {
            targets: {
                include: {
                    branch: true
                }
            },
            dailyData: {
                include: {
                    branch: true
                },
                orderBy: { date: 'asc' }
            }
        }
    });

    if (!campaign) return null;

    // Calculate working days (excluding Sundays)
    let workingDays = 0;
    let curr = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    while (curr <= end) {
        if (!isSunday(curr)) workingDays++;
        curr = addDays(curr, 1);
    }

    return {
        ...campaign,
        totalWorkingDays: workingDays || 1
    };
}

export async function updateCampaignDailyData(campaignId: string, branchId: string, date: Date, value: number) {
    const resetDate = startOfDay(new Date(date));
    return await prisma.campaignDailyData.upsert({
        where: {
            campaignId_branchId_date: {
                campaignId,
                branchId,
                date: resetDate
            }
        },
        update: { value },
        create: {
            campaignId,
            branchId,
            date: resetDate,
            value
        }
    });
}

export async function getCampaignRankings(campaignId: string, date?: Date) {
    const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
            targets: true,
            dailyData: true
        }
    });

    if (!campaign) return null;

    const targetsMap = new Map(campaign.targets.map(t => [t.branchId, t.targetValue]));
    const filterDate = date ? startOfDay(new Date(date)).getTime() : null;

    // Calculate qualification deadline (80% working days mark)
    let totalWorkingDays = 0;
    let curr = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);
    const workingDaysList: Date[] = [];
    while (curr <= end) {
        if (!isSunday(curr)) {
            totalWorkingDays++;
            workingDaysList.push(new Date(curr));
        }
        curr = addDays(curr, 1);
    }
    const qualificationIndex = Math.floor(totalWorkingDays * 0.8) - 1;
    const qualificationDate = workingDaysList[Math.max(0, qualificationIndex)] || end;

    // Aggregate branch performance and track arrival dates
    const performanceMap = new Map<string, { branchId: string, total: number, daily: number, arrivalDate?: Date }>();
    
    // Sort all daily data by date to find arrival dates accurately
    const sortedData = [...campaign.dailyData].sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const d of sortedData) {
        const stats = performanceMap.get(d.branchId) || { branchId: d.branchId, total: 0, daily: 0 };
        const target = targetsMap.get(d.branchId) || 0;
        
        const previousTotal = stats.total;
        stats.total += d.value;
        
        if (filterDate && d.date.getTime() === filterDate) {
            stats.daily = d.value;
        }

        // Mark qualification date if target reached for the first time
        if (target > 0 && previousTotal < target && stats.total >= target) {
            stats.arrivalDate = d.date;
        }

        performanceMap.set(d.branchId, stats);
    }

    const branches = await prisma.branch.findMany({
        where: { id: { in: Array.from(performanceMap.keys()) } }
    });
    const branchesMap = new Map(branches.map(b => [b.id, b]));

    const rankings = Array.from(performanceMap.values()).map(p => {
        const target = targetsMap.get(p.branchId) || 1;
        const branch = branchesMap.get(p.branchId);
        const isQualified = !!p.arrivalDate && p.arrivalDate.getTime() <= qualificationDate.getTime();

        return {
            branchId: p.branchId,
            branchCode: branch?.code,
            branchName: branch?.nameEn,
            totalAchievement: p.total,
            dailyAchievement: p.daily,
            target: target,
            percentage: target > 0 ? (p.total / target) * 100 : 0,
            arrivalDate: p.arrivalDate,
            isQualified
        };
    }).sort((a, b) => b.percentage - a.percentage);

    return {
        overall: rankings,
        top3: rankings.slice(0, 3),
        bottom3: rankings.slice(-3).reverse(),
        qualificationDate
    };
}

export async function updateCampaign(id: string, data: {
    title?: string;
    tagline?: string;
    logoUrl?: string;
    startDate?: Date;
    endDate?: Date;
    type?: string;
    metric?: string;
    targetValue?: number;
    targets?: { branchId: string; targetValue: number }[];
}) {
    return await prisma.$transaction(async (tx) => {
        // Update basic info
        const campaign = await tx.campaign.update({
            where: { id },
            data: {
                title: data.title,
                tagline: data.tagline,
                logoUrl: data.logoUrl,
                startDate: data.startDate,
                endDate: data.endDate,
                type: data.type,
                metric: data.metric,
                targetValue: data.targetValue,
            }
        });

        // Update targets if provided
        if (data.targets) {
            await tx.campaignTarget.deleteMany({ where: { campaignId: id } });
            await tx.campaignTarget.createMany({
                data: data.targets.map(t => ({
                    campaignId: id,
                    branchId: t.branchId,
                    targetValue: t.targetValue
                }))
            });
        }

        return campaign;
    });
}

export async function deleteCampaign(id: string) {
    return await prisma.campaign.delete({
        where: { id }
    });
}

export async function deleteCampaignDailyData(id: string) {
    return await prisma.campaignDailyData.delete({
        where: { id }
    });
}
