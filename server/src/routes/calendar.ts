import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

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

// Seed some holidays if empty
router.post('/seed', async (req, res) => {
    try {
        const count = await prisma.holiday.count();
        if (count > 0) return res.json({ message: 'Holidays already exist' });

        const holidays = await prisma.holiday.createMany({
            data: [
                { date: new Date('2025-08-15'), nameEn: 'Independence Day', type: 'PUBLIC_HOLIDAY' },
                { date: new Date('2025-08-16'), nameEn: 'De-jury Transfer Day', type: 'STATE_HOLIDAY' },
                { date: new Date('2025-10-02'), nameEn: 'Gandhi Jayanti', type: 'PUBLIC_HOLIDAY' },
                { date: new Date('2025-12-25'), nameEn: 'Christmas', type: 'PUBLIC_HOLIDAY' },
                { date: new Date('2026-01-26'), nameEn: 'Republic Day', type: 'PUBLIC_HOLIDAY' },
            ]
        });
        res.json({ message: 'Holidays seeded', count: holidays.count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to seed holidays' });
    }
});

export default router;
