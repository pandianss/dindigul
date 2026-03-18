import { Router } from 'express';
import { BudgetService } from '../services/budgetService';
import prisma from '../lib/prisma';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/budget/upload
 * Handles Budget CSV upload with versioning.
 */
router.post('/upload', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const { csvContent, fileName } = req.body;

        if (!csvContent) {
            return res.status(400).json({ error: 'No CSV content provided' });
        }

        const filename = fileName || 'unknown.csv';

        // Use authenticated user ID if available
        const uploaderId = req.user?.id || 'anonymous';

        const results = await BudgetService.processBudgets(csvContent, uploaderId, filename);

        res.json({
            message: 'Budget upload processed successfully',
            results
        });
    } catch (error) {
        console.error('Budget upload error:', error);
        res.status(500).json({ error: 'Failed to process budget upload' });
    }
});

/**
 * GET /api/budget/logs
 * Retrieves history of budget uploads.
 */
router.get('/logs', authenticateToken, async (req, res) => {
    try {
        const logs = await prisma.budgetImportLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch import logs' });
    }
});

/**
 * GET /api/budget/master
 * Fetches current active budget records with filters.
 */
router.get('/master', authenticateToken, async (req, res) => {
    try {
        const { solId, parameterName, periodKey } = req.query;
        const where: any = { isActive: true };

        if (solId) where.solId = String(solId);
        if (parameterName) where.parameterName = String(parameterName);
        if (periodKey) where.periodKey = String(periodKey);

        const budgets = await prisma.budgetMaster.findMany({
            where,
            orderBy: [
                { solId: 'asc' },
                { parameterName: 'asc' },
                { effectiveDate: 'asc' }
            ],
            take: 1000
        });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch budget master data' });
    }
});

/**
 * PUT /api/budget/master/:id
 * Updates a budget record and archives history.
 */
router.put('/master/:id', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { targetValue } = req.body;

    try {
        const existing = await prisma.budgetMaster.findUnique({ where: { id: String(id) } });
        if (!existing) return res.status(404).json({ error: 'Budget record not found' });

        const newVal = typeof targetValue === 'string' ? parseFloat(targetValue.replace(/,/g, '')) : targetValue;

        await prisma.$transaction([
            prisma.budgetHistory.create({
                data: {
                    parameterName: existing.parameterName,
                    solId: existing.solId,
                    periodKey: existing.periodKey,
                    effectiveDate: existing.effectiveDate,
                    targetValue: existing.targetValue,
                    versionNo: existing.versionNo,
                    sourceBatchId: existing.sourceBatchId,
                    changeType: 'UPDATE'
                }
            }),
            prisma.budgetMaster.update({
                where: { id },
                data: {
                    targetValue: newVal,
                    versionNo: existing.versionNo + 1,
                    updatedAt: new Date()
                }
            })
        ]);

        res.json({ message: 'Budget updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update budget' });
    }
});

/**
 * DELETE /api/budget/master/:id
 * Deletes a budget record and archives as DELETE.
 */
router.delete('/master/:id', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

    const { id } = req.params;

    try {
        const existing = await prisma.budgetMaster.findUnique({ where: { id: String(id) } });
        if (!existing) return res.status(404).json({ error: 'Budget record not found' });

        await prisma.$transaction([
            prisma.budgetHistory.create({
                data: {
                    parameterName: existing.parameterName,
                    solId: existing.solId,
                    periodKey: existing.periodKey,
                    effectiveDate: existing.effectiveDate,
                    targetValue: existing.targetValue,
                    versionNo: existing.versionNo,
                    sourceBatchId: existing.sourceBatchId,
                    changeType: 'DELETE'
                }
            }),
            prisma.budgetMaster.delete({ where: { id } })
        ]);

        res.json({ message: 'Budget deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete budget' });
    }
});

/**
 * GET /api/budget/parameters
 * Retrieves unique parameter names from active master.
 */
router.get('/parameters', authenticateToken, async (req, res) => {
    try {
        const parameters = await prisma.budgetMaster.findMany({
            where: { isActive: true },
            select: { parameterName: true },
            distinct: ['parameterName'],
            orderBy: { parameterName: 'asc' }
        });
        res.json(parameters.map(p => p.parameterName));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch parameters' });
    }
});

export default router;
