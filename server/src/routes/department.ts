import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdminOrPlanning } from '../middleware/auth';
import { parseCSV } from '../utils/csv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Multer config for departmental seals
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(process.cwd(), '..', 'public', 'assets');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `seal-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.svg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only images (JPG, PNG, SVG) are allowed'));
        }
    }
});

// Get all departments
router.get('/', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user?.role === 'RO_USER' && req.user?.section === 'Planning';
    const canView = req.user?.role === 'ADMIN' || req.user?.role === 'RO_USER' || isPlanning;
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
router.post('/', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const { code, nameEn, nameTa, nameHi, sealPath } = req.body;
    try {
        const department = await prisma.department.create({
            data: { code, nameEn, nameTa, nameHi, sealPath }
        });
        res.json(department);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create department' });
    }
});

// Update department
router.put('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const id = req.params.id as string;
    const { code, nameEn, nameTa, nameHi, sealPath } = req.body;
    try {
        const department = await prisma.department.update({
            where: { id },
            data: { code, nameEn, nameTa, nameHi, sealPath }
        });
        res.json(department);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

// Upload department seal
router.post('/upload-seal', authenticateToken, requireAdminOrPlanning, upload.single('seal'), (req: any, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const sealPath = `assets/${req.file.filename}`;
    res.json({ sealPath });
});

// Delete department
router.delete('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const id = req.params.id as string;
    try {
        await prisma.department.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

// Bulk upload departments
router.post('/bulk', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
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
            const { code, nameEn, nameTa, nameHi, sealPath } = item;
            if (!code || !nameEn) return null;

            return prisma.department.upsert({
                where: { code },
                update: { nameEn, nameTa, nameHi, sealPath },
                create: { code, nameEn, nameTa, nameHi, sealPath }
            });
        }));

        res.json({ message: `Processed ${results.filter(r => r !== null).length} departments` });
    } catch (error) {
        console.error('Bulk department error:', error);
        res.status(500).json({ error: 'Failed to process bulk upload' });
    }
});

export default router;
