import prisma from '../lib/prisma';

/**
 * Infrastructure Layer: Data access for Campaigns.
 */
export class CampaignRepository {
    
    static async getAll() {
        return await prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    static async getById(id: string) {
        return await prisma.campaign.findUnique({
            where: { id },
            include: { dailyData: { include: { branch: true } } }
        });
    }

    static async create(data: any) {
        return await prisma.campaign.create({
            data: {
                title: data.name || data.title,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                type: data.type || 'GENERAL',
                metric: data.metric || 'VOLUME',
                targetValue: data.targetValue,
                status: 'ACTIVE'
            }
        });
    }

    static async update(id: string, data: any) {
        return await prisma.campaign.update({
            where: { id },
            data: {
                title: data.name || data.title,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
                status: data.isActive ? 'ACTIVE' : 'DRAFT'
            }
        });
    }

    static async delete(id: string) {
        return await prisma.campaign.delete({ where: { id } });
    }

    static async updateDailyData(campaignId: string, branchId: string, date: Date, value: number) {
        return await prisma.campaignDailyData.upsert({
            where: {
                campaignId_branchId_date: { campaignId, branchId, date }
            },
            update: { value },
            create: { campaignId, branchId, date, value }
        });
    }

    static async deleteDailyData(entryId: string) {
        return await prisma.campaignDailyData.delete({ where: { id: entryId } });
    }
}
