import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all legal cases
router.get('/cases', async (req, res) => {
    try {
        const cases = await (prisma as any).legalCase.findMany({
            orderBy: { nextHearingDate: 'asc' }
        });
        res.json(cases);
    } catch (error) {
        console.error('Error fetching legal cases:', error);
        res.status(500).json({ error: 'Failed to fetch legal cases' });
    }
});

// Add new court case
router.post('/cases', async (req, res) => {
    const { caseNo, courtName, parties, nextHearingDate, advocateName, status, category, hearingHistory } = req.body;
    try {
        const newCase = await (prisma as any).legalCase.create({
            data: {
                caseNo,
                courtName,
                parties,
                nextHearingDate: nextHearingDate ? new Date(nextHearingDate) : null,
                advocateName,
                status,
                category,
                hearingHistory
            }
        });
        res.json(newCase);
    } catch (error) {
        console.error('Error creating legal case:', error);
        res.status(500).json({ error: 'Failed to create legal case' });
    }
});

// Get all recovery actions
router.get('/recovery', async (req, res) => {
    try {
        const recoveryActions = await (prisma as any).recoveryAction.findMany({
            include: {
                branch: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(recoveryActions);
    } catch (error) {
        console.error('Error fetching recovery actions:', error);
        res.status(500).json({ error: 'Failed to fetch recovery actions' });
    }
});

// Record new recovery action
router.post('/recovery', async (req, res) => {
    const { accountName, amountInvolved, type, status, branchId, remarks } = req.body;
    try {
        const newAction = await (prisma as any).recoveryAction.create({
            data: {
                accountName,
                amountInvolved,
                type,
                status,
                branchId,
                remarks
            }
        });
        res.json(newAction);
    } catch (error) {
        console.error('Error recording recovery action:', error);
        res.status(500).json({ error: 'Failed to record recovery action' });
    }
});

export default router;
