import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();


// Get all holidays
router.get('/holidays', async (req, res) => {
    try {
        const holidays = await prisma.holiday.findMany({
            orderBy: { date: 'asc' }
        });
        res.json(holidays);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch holidays' });
    }
});

// Create or Update holiday
router.post('/', async (req, res) => {
    try {
        const { date, nameEn, type, id, venue } = req.body;

        if (id) {
            // Update
            const updated = await prisma.holiday.update({
                where: { id },
                data: {
                    date: new Date(date),
                    nameEn,
                    type,
                    venue
                }
            });
            return res.json(updated);
        }

        // Create
        const created = await prisma.holiday.create({
            data: {
                date: new Date(date),
                nameEn,
                type,
                venue
            }
        });
        res.json(created);
    } catch (error) {
        console.error('Error saving event:', error);
        res.status(500).json({ error: 'Failed to save event' });
    }
});

// Delete holiday
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.holiday.delete({
            where: { id }
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

export default router;
