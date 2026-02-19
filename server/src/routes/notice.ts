import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all notices
router.get('/', async (req, res) => {
    try {
        const notices = await (prisma as any).notice.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                branch: true
            }
        });
        res.json(notices);
    } catch (error) {
        console.error('Error fetching notices:', error);
        res.status(500).json({ error: 'Failed to fetch notices' });
    }
});

// Create a notice
router.post('/', async (req, res) => {
    const { titleEn, titleTa, contentEn, contentTa, category, priority, isPinned, branchId, targetRole } = req.body;

    try {
        const notice = await (prisma as any).notice.create({
            data: {
                titleEn,
                titleTa,
                contentEn,
                contentTa,
                category,
                priority: priority || 'NORMAL',
                isPinned: isPinned || false,
                branchId,
                targetRole
            }
        });
        res.json(notice);
    } catch (error) {
        console.error('Error creating notice:', error);
        res.status(500).json({ error: 'Failed to create notice' });
    }
});

export default router;
