import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all audit observations with filters
router.get('/observations', async (req, res) => {
    const { branchId, auditType, status, riskLevel } = req.query;
    try {
        const where: any = {};
        if (branchId) where.branchId = branchId;
        if (auditType) where.auditType = auditType;
        if (status) where.status = status;
        if (riskLevel) where.riskLevel = riskLevel;

        const observations = await (prisma as any).auditObservation.findMany({
            where,
            include: { branch: true },
            orderBy: { targetDate: 'asc' }
        });
        res.json(observations);
    } catch (error) {
        console.error('Error fetching observations:', error);
        res.status(500).json({ error: 'Failed to fetch observations' });
    }
});

// Record new audit observation
router.post('/observations', async (req, res) => {
    const { auditType, observation, riskLevel, targetDate, branchId, auditDate } = req.body;
    try {
        const newObs = await (prisma as any).auditObservation.create({
            data: {
                auditType,
                observation,
                riskLevel,
                targetDate: new Date(targetDate),
                branchId,
                auditDate: auditDate ? new Date(auditDate) : new Date()
            }
        });
        res.json(newObs);
    } catch (error) {
        console.error('Error creating observation:', error);
        res.status(500).json({ error: 'Failed to create observation' });
    }
});

// Update rectification status
router.patch('/observations/:id', async (req, res) => {
    const { id } = req.params;
    const { status, rectificationDetails } = req.body;
    try {
        const updated = await (prisma as any).auditObservation.update({
            where: { id },
            data: { status, rectificationDetails }
        });
        res.json(updated);
    } catch (error) {
        console.error('Error updating observation:', error);
        res.status(500).json({ error: 'Failed to update observation' });
    }
});

// Get compliance stats
router.get('/stats', async (req, res) => {
    try {
        const total = await (prisma as any).auditObservation.count();
        const pending = await (prisma as any).auditObservation.count({ where: { status: 'PENDING' } });
        const rectified = await (prisma as any).auditObservation.count({ where: { status: 'RECTIFIED' } });
        const highRisk = await (prisma as any).auditObservation.count({
            where: { status: 'PENDING', riskLevel: 'HIGH' }
        });

        res.json({ total, pending, rectified, highRisk });
    } catch (error) {
        console.error('Error fetching audit stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

export default router;
