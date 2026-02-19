import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get stock levels
router.get('/stock', async (req, res) => {
    try {
        const items = await (prisma as any).stationeryItem.findMany({
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
        res.json(items);
    } catch (error) {
        console.error('Error fetching stock:', error);
        res.status(500).json({ error: 'Failed to fetch stock levels' });
    }
});

// Record movement and update stock
router.post('/movement', async (req, res) => {
    const { itemId, branchId, quantity, type, remarks } = req.body;
    try {
        // Use a transaction to ensure atomic update
        const result = await (prisma as any).$transaction(async (tx: any) => {
            const movement = await tx.stationeryMovement.create({
                data: {
                    itemId,
                    branchId,
                    quantity,
                    type,
                    remarks,
                    date: new Date()
                }
            });

            const stockChange = type === 'RECEIPT' ? quantity : -quantity;

            await tx.stationeryItem.update({
                where: { id: itemId },
                data: {
                    stockLevel: {
                        increment: stockChange
                    }
                }
            });

            return movement;
        });
        res.json(result);
    } catch (error) {
        console.error('Error recording movement:', error);
        res.status(500).json({ error: 'Failed to record logistics movement' });
    }
});

export default router;
