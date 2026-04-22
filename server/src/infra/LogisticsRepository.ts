import prisma from '../lib/prisma';

/**
 * Infrastructure Layer: Data access for Logistics (Stationery and movements).
 */
export class LogisticsRepository {
    
    static async getStock() {
        return await prisma.stationeryItem.findMany({
            include: {
                movements: {
                    orderBy: { date: 'desc' },
                    take: 5,
                    include: {
                        branch: { select: { nameEn: true } }
                    }
                }
            }
        });
    }

    /**
     * Records a movement and updates stock atomically.
     */
    static async recordMovement(data: any) {
        return await prisma.$transaction(async (tx: any) => {
            const movement = await tx.stationeryMovement.create({
                data: {
                    itemId: data.itemId,
                    branchId: data.branchId,
                    quantity: data.quantity,
                    type: data.type,
                    remarks: data.remarks,
                    date: new Date()
                }
            });

            const stockChange = data.type === 'RECEIPT' ? data.quantity : -data.quantity;

            await tx.stationeryItem.update({
                where: { id: data.itemId },
                data: {
                    stockLevel: {
                        increment: stockChange
                    }
                }
            });

            return movement;
        });
    }
}
