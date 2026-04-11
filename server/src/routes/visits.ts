import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get all visits
router.get('/', authenticateToken, async (req, res) => {
    try {
        const visits = await prisma.branchVisit.findMany({
            include: {
                branch: { select: { nameEn: true, code: true } },
                visitor: { select: { fullNameEn: true, role: true } }
            },
            orderBy: { visitDate: 'desc' }
        });
        res.json(visits);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create a visit
router.post('/', authenticateToken, async (req, res) => {
    const { branchId, visitorId, visitDate, purpose, observations, visitorCategory } = req.body;
    try {
        const visit = await prisma.branchVisit.create({
            data: {
                branchId,
                visitorId,
                visitDate: new Date(visitDate),
                purpose,
                observations,
                visitorCategory: visitorCategory || 'SECOND_LINE'
            }
        });
        res.status(201).json(visit);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a visit
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await prisma.branchVisit.delete({
            where: { id: req.params.id }
        });
        res.sendStatus(204);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
