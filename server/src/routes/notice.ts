import { Router } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import { saveBase64Image } from '../utils/image';

const router = Router();

// Get all notices
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        const notices = await prisma.notice.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                branch: true,
                photo: true,
                acknowledgements: {
                    where: { userId: req.user.id }
                }
            }
        });

        const noticesWithStatus = notices.map((n: any) => ({
            ...n,
            hasAcknowledged: n.acknowledgements.length > 0
        }));

        res.json(noticesWithStatus);
    } catch (error) {
        console.error('Error fetching notices:', error);
        res.status(500).json({ error: 'Failed to fetch notices' });
    }
});

// Create a notice
router.post('/', authenticateToken, async (req: any, res) => {
    const { titleEn, titleTa, contentEn, contentTa, category, priority, isPinned, branchId, targetRole, requiresAck, photoData } = req.body;

    try {
        let photoId = undefined;
        if (photoData) {
            const photoUrl = saveBase64Image(photoData);
            const photo = await prisma.photo.create({
                data: { photoUrl, aspectRatio: '16:9' } // Use 16:9 for announcements
            });
            photoId = photo.id;
        }

        const notice = await prisma.notice.create({
            data: {
                titleEn,
                titleTa,
                contentEn,
                contentTa,
                category,
                priority: priority || 'NORMAL',
                isPinned: isPinned || false,
                branchId,
                targetRole,
                requiresAck: requiresAck || false,
                photoId
            },
            include: { photo: true }
        });
        res.json(notice);
    } catch (error) {
        console.error('Error creating notice:', error);
        res.status(500).json({ error: 'Failed to create notice' });
    }
});

// Update a notice
router.put('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { titleEn, titleTa, contentEn, contentTa, category, priority, isPinned, branchId, targetRole, requiresAck, photoData } = req.body;

    try {
        let photoId = undefined;
        if (photoData && photoData.startsWith('data:image')) {
            const photoUrl = saveBase64Image(photoData);
            const photo = await prisma.photo.create({
                data: { photoUrl, aspectRatio: '16:9' }
            });
            photoId = photo.id;
        }

        const notice = await prisma.notice.update({
            where: { id },
            data: {
                titleEn,
                titleTa,
                contentEn,
                contentTa,
                category,
                priority,
                isPinned,
                branchId,
                targetRole,
                requiresAck,
                ...(photoId ? { photoId } : {})
            },
            include: { photo: true }
        });
        res.json(notice);
    } catch (error) {
        console.error('Error updating notice:', error);
        res.status(500).json({ error: 'Failed to update notice' });
    }
});

// Delete a notice
router.delete('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        await prisma.notice.delete({ where: { id } });
        res.json({ message: 'Bulletin deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete bulletin' });
    }
});

// GAP 13: Acknowledge a notice
router.post('/:id/ack', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const notice = await prisma.notice.findUnique({ where: { id } });
        if (!notice) return res.status(404).json({ error: 'Notice not found' });
        if (!notice.requiresAck) return res.status(400).json({ error: 'Acknowledgement not required' });

        const ack = await prisma.noticeAck.upsert({
            where: {
                noticeId_userId: {
                    noticeId: id,
                    userId: req.user.id
                }
            },
            update: {},
            create: {
                noticeId: id,
                userId: req.user.id,
                branchId: req.user.branchId || ''
            }
        });
        res.json(ack);
    } catch (error) {
        console.error('Ack error:', error);
        res.status(500).json({ error: 'Acknowledgement failed' });
    }
});

// GAP 13: Get acknowledgement status (Admin/RO only)
router.get('/:id/ack-status', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    if (!['ADMIN', 'RO_USER'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    try {
        const acks = await prisma.noticeAck.findMany({
            where: { noticeId: id },
            include: {
                user: { select: { fullNameEn: true, username: true } },
                branch: { select: { nameEn: true, code: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(acks);
    } catch (error) {
        res.status(500).json({ error: 'Status fetch failed' });
    }
});

export default router;
