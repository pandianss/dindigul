import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// GET ALL
router.get('/', authenticateToken, async (req, res) => {
    try {
        const partners = await prisma.servicePartner.findMany({
            include: {
                branch: { select: { nameEn: true } }
            },
            orderBy: { nameEn: 'asc' }
        });
        res.json(partners);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// CREATE
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { type, nameEn, nameTa, nameHi, registrationNo, phone, email, branchId, status } = req.body;
        const partner = await prisma.servicePartner.create({
            data: { 
                type: type || 'JEWEL_APPRAISER',
                nameEn, nameTa, nameHi, 
                registrationNo, phone, email, 
                branchId, 
                status: status || 'ACTIVE' 
            }
        });
        res.json(partner);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create partner' });
    }
});

// UPDATE
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        const { type, nameEn, nameTa, nameHi, registrationNo, phone, email, branchId, status } = req.body;
        const partner = await prisma.servicePartner.update({
            where: { id },
            data: { type, nameEn, nameTa, nameHi, registrationNo, phone, email, branchId, status }
        });
        res.json(partner);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update partner' });
    }
});

// DELETE
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        await prisma.servicePartner.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete partner' });
    }
});

// BULK
router.post('/bulk', authenticateToken, async (req, res) => {
    const { jsonData } = req.body;
    try {
        let count = 0;
        for (const item of jsonData) {
            const branchCode = item['SOL'] || item['branchId'];
            if (!branchCode || !item.nameEn) continue;

            await prisma.servicePartner.upsert({
                where: { registrationNo: item.registrationNo || 'AUTO_' + Math.random() },
                update: {
                    type: item.type,
                    nameEn: item.nameEn,
                    nameTa: item.nameTa,
                    nameHi: item.nameHi,
                    phone: item.phone,
                    email: item.email,
                    branchId: branchCode,
                    status: item.status || 'ACTIVE'
                },
                create: {
                    type: item.type,
                    nameEn: item.nameEn,
                    nameTa: item.nameTa,
                    nameHi: item.nameHi,
                    registrationNo: item.registrationNo,
                    phone: item.phone,
                    email: item.email,
                    branchId: branchCode,
                    status: item.status || 'ACTIVE'
                }
            });
            count++;
        }
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ error: 'Bulk upload failed' });
    }
});

export default router;
