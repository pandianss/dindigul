import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { parseCSV } from '../utils/csv';

const router = Router();

// Get all departments
router.get('/', authenticateToken, async (req: any, res) => {
    // Permission: ADMIN, RO_USER, or 'admin' bypass
    const canView = req.user?.role === 'ADMIN' || req.user?.role === 'RO_USER';
    if (!canView) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const departments = await prisma.department.findMany({
            orderBy: { code: 'asc' }
        });
        res.json(departments);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// Create new department
router.post('/', authenticateToken, async (req, res) => {
    const { code, nameEn, nameTa, nameHi } = req.body;
    try {
        const department = await prisma.department.create({
            data: { code, nameEn, nameTa, nameHi }
        });
        res.json(department);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create department' });
    }
});

// Update department
router.put('/:id', authenticateToken, async (req, res) => {
    const id = req.params.id as string;
    const { code, nameEn, nameTa, nameHi } = req.body;
    try {
        const department = await prisma.department.update({
            where: { id },
            data: { code, nameEn, nameTa, nameHi }
        });
        res.json(department);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

// Delete department
router.delete('/:id', authenticateToken, async (req, res) => {
    const id = req.params.id as string;
    try {
        await prisma.department.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

// Bulk upload departments
router.post('/bulk', authenticateToken, async (req, res) => {
    const { csvContent, jsonData } = req.body;
    try {
        let items = jsonData;
        if (csvContent) {
            items = parseCSV(csvContent);
        }

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid data format. Expected CSV or JSON array.' });
        }

        const results = await Promise.all(items.map(async (item: any) => {
            const { code, nameEn, nameTa, nameHi } = item;
            if (!code || !nameEn) return null;

            return prisma.department.upsert({
                where: { code },
                update: { nameEn, nameTa, nameHi },
                create: { code, nameEn, nameTa, nameHi }
            });
        }));

        res.json({ message: `Processed ${results.filter(r => r !== null).length} departments` });
    } catch (error) {
        console.error('Bulk department error:', error);
        res.status(500).json({ error: 'Failed to process bulk upload' });
    }
});

export default router;
