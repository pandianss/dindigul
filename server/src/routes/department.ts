import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all departments
router.get('/', async (req, res) => {
    try {
        const departments = await (prisma as any).department.findMany({
            orderBy: { code: 'asc' }
        });
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Create new department
router.post('/', async (req, res) => {
    const { code, nameEn, nameTa, nameHi } = req.body;
    try {
        const department = await (prisma as any).department.create({
            data: { code, nameEn, nameTa, nameHi }
        });
        res.json(department);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create department' });
    }
});

// Update department
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { code, nameEn, nameTa, nameHi } = req.body;
    try {
        const department = await (prisma as any).department.update({
            where: { id },
            data: { code, nameEn, nameTa, nameHi }
        });
        res.json(department);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

// Delete department
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await (prisma as any).department.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

export default router;
