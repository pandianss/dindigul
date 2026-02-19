import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all office notes
router.get('/', async (req, res) => {
    try {
        const { preparerId, status } = req.query;
        const notes = await (prisma as any).officeNote.findMany({
            where: {
                ...(preparerId ? { preparerId: String(preparerId) } : {}),
                ...(status ? { status: String(status) } : {})
            },
            orderBy: { createdAt: 'desc' },
            include: {
                preparer: true,
                approver: true
            }
        });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching office notes:', error);
        res.status(500).json({ error: 'Failed to fetch office notes' });
    }
});

// Create a new office note
router.post('/', async (req, res) => {
    const { type, titleEn, contentJson, preparerId, approverId } = req.body;
    try {
        const note = await (prisma as any).officeNote.create({
            data: {
                type,
                titleEn,
                contentJson: JSON.stringify(contentJson),
                preparerId,
                approverId,
                status: 'PENDING'
            }
        });
        res.json(note);
    } catch (error) {
        console.error('Error creating office note:', error);
        res.status(500).json({ error: 'Failed to create office note' });
    }
});

// Update office note status (Approve/Reject)
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, approverId } = req.body;
    try {
        const note = await (prisma as any).officeNote.update({
            where: { id },
            data: {
                status,
                ...(approverId ? { approverId } : {})
            }
        });
        res.json(note);
    } catch (error) {
        console.error('Error updating office note status:', error);
        res.status(500).json({ error: 'Failed to update office note status' });
    }
});

export default router;
