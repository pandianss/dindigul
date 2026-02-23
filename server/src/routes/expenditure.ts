import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all budgets for the current financial year
router.get('/budgets', async (req, res) => {
    try {
        const budgets = await (prisma as any).budget.findMany({
            include: {
                _count: {
                    select: { sanctions: true }
                }
            }
        });
        res.json(budgets);
    } catch (error) {
        console.error('Error fetching budgets:', error);
        res.status(500).json({ error: 'Failed to fetch budgets' });
    }
});

// Get all sanctions with optional filters
router.get('/sanctions', async (req, res) => {
    const { section, status } = req.query;
    try {
        const filters: any = {};
        if (section) filters.section = section;
        if (status) filters.status = status;

        const sanctions = await (prisma as any).expenseSanction.findMany({
            where: filters,
            include: {
                budget: true
            },
            orderBy: { sanctionDate: 'desc' }
        });
        res.json(sanctions);
    } catch (error) {
        console.error('Error fetching sanctions:', error);
        res.status(500).json({ error: 'Failed to fetch sanctions' });
    }
});

// Create new sanction and update budget spent amount
router.post('/sanctions', async (req, res) => {
    const { title, sanctionDate, amount, section, vendorName, billNo, status, type, budgetId } = req.body;
    try {
        const result = await (prisma as any).$transaction(async (tx: any) => {
            // 1. Create the sanction
            const sanction = await tx.expenseSanction.create({
                data: {
                    title,
                    sanctionDate: sanctionDate ? new Date(sanctionDate) : new Date(),
                    amount,
                    section,
                    vendorName,
                    billNo,
                    status,
                    type,
                    budgetId
                }
            });

            // 2. Update the budget spent amount
            await tx.budget.update({
                where: { id: budgetId },
                data: {
                    spentAmount: {
                        increment: amount
                    }
                }
            });

            return sanction;
        });
        res.json(result);
    } catch (error) {
        console.error('Error creating sanction:', error);
        res.status(500).json({ error: 'Failed to create sanction' });
    }
});

export default router;
