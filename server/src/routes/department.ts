import { Router } from 'express';
import prisma from '../lib/prisma';
import { parseCSV } from '../utils/csv';

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

// Bulk upload departments
router.post('/bulk', async (req, res) => {
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
