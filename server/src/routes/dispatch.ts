import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all dispatch records
router.get('/', async (req, res) => {
    try {
        const records = await (prisma as any).dispatchRecord.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(records);
    } catch (error) {
        console.error('Error fetching dispatch records:', error);
        res.status(500).json({ error: 'Failed to fetch dispatch records' });
    }
});

// Create new dispatch entry
router.post('/', async (req, res) => {
    const { type, subject, sender, recipient, referenceNo, consignmentNo, date } = req.body;
    try {
        const record = await (prisma as any).dispatchRecord.create({
            data: {
                type,
                subject,
                sender,
                recipient,
                referenceNo,
                consignmentNo,
                date: date ? new Date(date) : new Date(),
                status: type === 'INWARD' ? 'RECEIVED' : 'PENDING'
            }
        });
        res.json(record);
    } catch (error) {
        console.error('Error creating dispatch record:', error);
        res.status(500).json({ error: 'Failed to create dispatch record' });
    }
});

// Update dispatch status/consignment
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { status, consignmentNo } = req.body;
    try {
        const record = await (prisma as any).dispatchRecord.update({
            where: { id },
            data: { status, consignmentNo }
        });
        res.json(record);
    } catch (error) {
        console.error('Error updating dispatch record:', error);
        res.status(500).json({ error: 'Failed to update dispatch record' });
    }
});

export default router;
