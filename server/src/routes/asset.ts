import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all regional assets with filters
router.get('/', async (req, res) => {
    const { branchId, category, condition } = req.query;
    try {
        const where: any = {};
        if (branchId) where.branchId = branchId;
        if (category) where.category = category;
        if (condition) where.condition = condition;

        const assets = await (prisma as any).regionalAsset.findMany({
            where,
            include: {
                branch: true,
                maintenanceRecords: {
                    orderBy: { serviceDate: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(assets);
    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

// Register a new regional asset
router.post('/', async (req, res) => {
    const { assetCode, category, description, purchaseDate, purchaseValue, condition, amcExpiry, branchId } = req.body;
    try {
        const newAsset = await (prisma as any).regionalAsset.create({
            data: {
                assetCode,
                category,
                description,
                purchaseDate: new Date(purchaseDate),
                purchaseValue: parseFloat(purchaseValue),
                condition,
                amcExpiry: amcExpiry ? new Date(amcExpiry) : null,
                branchId
            }
        });
        res.json(newAsset);
    } catch (error) {
        console.error('Error creating asset:', error);
        res.status(500).json({ error: 'Failed to create asset' });
    }
});

// Get maintenance history for an asset
router.get('/:id/maintenance', async (req, res) => {
    const { id } = req.params;
    try {
        const records = await (prisma as any).maintenanceRecord.findMany({
            where: { assetId: id },
            orderBy: { serviceDate: 'desc' }
        });
        res.json(records);
    } catch (error) {
        console.error('Error fetching maintenance records:', error);
        res.status(500).json({ error: 'Failed to fetch maintenance history' });
    }
});

// Record a new service/AMC action
router.post('/maintenance', async (req, res) => {
    const { assetId, serviceDate, serviceProvider, cost, remarks, nextServiceDue } = req.body;
    try {
        const record = await (prisma as any).maintenanceRecord.create({
            data: {
                assetId,
                serviceDate: new Date(serviceDate),
                serviceProvider,
                cost: parseFloat(cost),
                remarks,
                nextServiceDue: new Date(nextServiceDue)
            }
        });
        res.json(record);
    } catch (error) {
        console.error('Error recording maintenance:', error);
        res.status(500).json({ error: 'Failed to record maintenance' });
    }
});

// Get assets requiring attention (AMC expiring soon)
router.get('/alerts', async (req, res) => {
    try {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringAMC = await (prisma as any).regionalAsset.findMany({
            where: {
                amcExpiry: {
                    lte: thirtyDaysFromNow,
                    gte: new Date()
                }
            },
            include: { branch: true }
        });
        res.json(expiringAMC);
    } catch (error) {
        console.error('Error fetching asset alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

export default router;
