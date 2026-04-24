import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// GET ALL
router.get('/', authenticateToken, async (req, res) => {
    try {
        const assets = await prisma.regionalAsset.findMany({
            include: {
                branch: { select: { nameEn: true } }
            },
            orderBy: { category: 'asc' }
        });
        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

// CREATE
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { assetCode, category, description, purchaseDate, purchaseValue, condition, amcExpiry, branchId } = req.body;
        const asset = await prisma.regionalAsset.create({
            data: { 
                assetCode, category, description, 
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
                purchaseValue: parseFloat(purchaseValue) || 0,
                condition: condition || 'GOOD',
                amcExpiry: amcExpiry ? new Date(amcExpiry) : null,
                branchId 
            }
        });
        res.json(asset);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create asset' });
    }
});

// UPDATE
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        const { assetCode, category, description, purchaseDate, purchaseValue, condition, amcExpiry, branchId } = req.body;
        const asset = await prisma.regionalAsset.update({
            where: { id },
            data: { 
                assetCode, category, description, 
                purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
                purchaseValue: parseFloat(purchaseValue) || 0,
                condition,
                amcExpiry: amcExpiry ? new Date(amcExpiry) : null,
                branchId 
            }
        });
        res.json(asset);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update asset' });
    }
});

// DELETE
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        await prisma.regionalAsset.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});

export default router;
