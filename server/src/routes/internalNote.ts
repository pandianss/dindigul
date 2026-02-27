import { Router } from 'express';
import { createInternalNote, getInternalNoteById } from '../services/internalNoteService';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const internalNoteSchema = z.object({
    refNo: z.string(),
    department: z.string(),
    departmentTa: z.string().optional(),
    departmentHi: z.string().optional(),
    subject: z.string(),
    classification: z.string(),
    bodyHtml: z.string()
});

router.post('/', authenticateToken, async (req: any, res) => {
    try {
        const validatedData = internalNoteSchema.parse(req.body);
        console.log('[InternalNoteRoute] User in request:', req.user);
        const { note } = await createInternalNote({
            ...validatedData,
            createdBy: req.user.fullNameEn || req.user.username || 'System User',
            creatorBranchId: req.user.branchId
        });

        res.json(note);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }
        console.error('CRITICAL: Error in POST /api/internal-notes:', error);
        res.status(500).json({ error: 'Failed to create internal note', details: error.message });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const note = await getInternalNoteById(req.params.id as string);
        if (!note) return res.status(404).json({ error: 'Note not found' });
        res.json(note);
    } catch (error) {
        console.error('Error fetching internal note:', error);
        res.status(500).json({ error: 'Failed to fetch internal note' });
    }
});

import path from 'path';

// Route for streaming technical preview or direct download
router.get('/:id/pdf', authenticateToken, async (req, res) => {
    try {
        console.log('[InternalNoteRoute] PDF Requested for ID:', req.params.id);
        const note = await getInternalNoteById(req.params.id as string);
        if (!note || !note.fileUrl) {
            console.warn('[InternalNoteRoute] Note or fileUrl not found for ID:', req.params.id);
            return res.status(404).json({ error: 'PDF not found' });
        }

        const absolutePath = path.join(process.cwd(), note.fileUrl);
        console.log('[InternalNoteRoute] Sending file from:', absolutePath);
        res.sendFile(absolutePath);
    } catch (error) {
        console.error('Error fetching PDF:', error);
        res.status(500).json({ error: 'Failed to fetch PDF' });
    }
});

export default router;
