import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// GET ALL
router.get('/', authenticateToken, async (req, res) => {
    try {
        const lockers = await prisma.locker.findMany({
            include: {
                branch: { select: { nameEn: true } }
            },
            orderBy: { lockerNo: 'asc' }
        });
        res.json(lockers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lockers' });
    }
});

// CREATE
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { lockerNo, type, category, status, branchId } = req.body;
        const locker = await prisma.locker.create({
            data: { lockerNo, type, category, status: status || 'AVAILABLE', branchId }
        });
        res.json(locker);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create locker' });
    }
});

// UPDATE
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        const { lockerNo, type, category, status, branchId } = req.body;
        const locker = await prisma.locker.update({
            where: { id },
            data: { lockerNo, type, category, status, branchId }
        });
        res.json(locker);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update locker' });
    }
});

// DELETE
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        await prisma.locker.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete locker' });
    }
});

// BULK
router.post('/bulk', authenticateToken, async (req, res) => {
    const { jsonData } = req.body;
    try {
        let count = 0;
        for (const item of jsonData) {
            const branchCode = item['SOL'] || item['branchId'];
            if (!branchCode || !item.lockerNo) continue;

            await prisma.locker.upsert({
                where: { branchId_lockerNo: { branchId: branchCode, lockerNo: String(item.lockerNo) } },
                update: {
                    type: item.type,
                    category: item.category,
                    status: item.status || 'AVAILABLE'
                },
                create: {
                    lockerNo: String(item.lockerNo),
                    type: item.type,
                    category: item.category,
                    status: item.status || 'AVAILABLE',
                    branchId: branchCode
                }
            });
            count++;
        }
        res.json({ success: true, count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Bulk upload failed' });
    }
});

export default router;
