import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// List all decks (most recent first)
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        const decks = await prisma.presentationDeck.findMany({
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { fullNameEn: true, username: true } } }
        });
        res.json(decks);
    } catch { res.status(500).json({ error: 'Failed to fetch presentations' }); }
});

// Get a single deck with full slides JSON
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const deck = await prisma.presentationDeck.findUnique({
            where: { id: String(req.params.id) },
            include: { createdBy: { select: { fullNameEn: true, username: true } } }
        });
        if (!deck) return res.status(404).json({ error: 'Deck not found' });
        res.json(deck);
    } catch { res.status(500).json({ error: 'Failed to fetch deck' }); }
});

// Save a new deck
router.post('/', authenticateToken, async (req: any, res) => {
    const { name, description, dataDate, period, slides } = req.body;
    if (!name || !dataDate || !slides) return res.status(400).json({ error: 'name, dataDate, slides required' });
    try {
        const deck = await prisma.presentationDeck.create({
            data: {
                name,
                description: description || null,
                dataDate: new Date(dataDate),
                period: period || '',
                slides,
                createdById: req.user.id
            }
        });
        res.status(201).json(deck);
    } catch { res.status(500).json({ error: 'Failed to save deck' }); }
});

// Update (overwrite slides, rename)
router.put('/:id', authenticateToken, async (req: any, res) => {
    try {
        const deck = await prisma.presentationDeck.update({
            where: { id: String(req.params.id) },
            data: {
                name: req.body.name || undefined,
                description: req.body.description || undefined,
                slides: req.body.slides || undefined,
            }
        });
        res.json(deck);
    } catch { res.status(500).json({ error: 'Failed to update deck' }); }
});

// Delete
router.delete('/:id', authenticateToken, async (req: any, res) => {
    try {
        await prisma.presentationDeck.delete({ where: { id: String(req.params.id) } });
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Failed to delete deck' }); }
});

export default router;
