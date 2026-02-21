import { Router } from 'express';
import prisma from '../lib/prisma';
import { parseCSV } from '../utils/csv';

const router = Router();

// Get all designations
router.get('/', async (req, res) => {
    try {
        const designations = await prisma.designation.findMany({
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
        const designation = await prisma.designation.create({
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
        const designation = await prisma.designation.update({
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
        await prisma.designation.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

// Bulk upload designations
router.post('/bulk', async (req, res) => {
    const { csvContent, jsonData } = req.body;
    try {
        let items = jsonData;
        if (csvContent) {
            items = parseCSV(csvContent);
        }

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        const results = await Promise.all(items.map(async (item: any) => {
            const { code, nameEn, nameTa, nameHi, workId } = item;
            if (!code || !nameEn) return null;

            return prisma.designation.upsert({
                where: { code },
                update: { nameEn, nameTa, nameHi, workId: parseInt(workId) || undefined },
                create: { code, nameEn, nameTa, nameHi, workId: parseInt(workId) || 999 }
            });
        }));

        res.json({ message: `Processed ${results.filter(r => r !== null).length} designations` });
    } catch (error) {
        console.error('Bulk designation error:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
