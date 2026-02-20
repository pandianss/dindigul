import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all designations
router.get('/', async (req, res) => {
    try {
        const designations = await (prisma as any).designation.findMany({
            orderBy: { workId: 'asc' }
        });
        res.json(designations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch designations' });
    }
});

// Create new designation
router.post('/', async (req, res) => {
    const { code, nameEn, nameTa, nameHi, workId } = req.body;
    try {
        const designation = await (prisma as any).designation.create({
            data: {
                code,
                nameEn,
                nameTa,
                nameHi,
                workId: parseInt(workId) || 999
            }
        });
        res.json(designation);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create designation' });
    }
});

// Update designation
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { code, nameEn, nameTa, nameHi, workId } = req.body;
    try {
        const designation = await (prisma as any).designation.update({
            where: { id },
            data: {
                code,
                nameEn,
                nameTa,
                nameHi,
                workId: parseInt(workId) || 999
            }
        });
        res.json(designation);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

// Delete designation
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await (prisma as any).designation.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

export default router;
