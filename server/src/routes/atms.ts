import express from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();


router.get('/', authenticateToken, async (req, res) => {
    try {
        const userRole = (req as any).user?.role || 'BRANCH_USER';

        let atms;

        if (['ADMIN', 'RO_USER'].includes(userRole)) {
            // Return ALL ATMs for RO / Admin / Section level, sorted by lowest balance first
            atms = await prisma.atm.findMany({
                include: {
                    branch: {
                        select: { code: true, nameEn: true }
                    }
                },
                orderBy: { balance: 'asc' }
            });
        } else {
            // Find the actual branch ID for the logged in user
            const userId = (req as any).user?.id;
            const fullUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { branchId: true }
            });

            const userBranchId = fullUser?.branchId;

            // Return ONLY ATMs assigned to the user's branch
            if (!userBranchId) {
                return res.json({ success: true, atms: [] });
            }
            atms = await prisma.atm.findMany({
                where: { branchId: userBranchId },
                include: {
                    branch: {
                        select: { code: true, nameEn: true }
                    }
                },
                orderBy: { balance: 'asc' }
            });
        }

        res.json(atms);
    } catch (error) {
        console.error('Error fetching ATMs:', error);
        res.status(500).json({ error: 'Failed to fetch ATM data' });
    }
});

// CREATE
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { atmId, branchId, lastTxnTime, balance } = req.body;
        const atm = await prisma.atm.create({
            data: { atmId, branchId, lastTxnTime, balance: parseFloat(balance) || 0 }
        });
        res.json(atm);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create ATM' });
    }
});

// UPDATE
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        const { atmId, branchId, lastTxnTime, balance } = req.body;
        const atm = await prisma.atm.update({
            where: { id },
            data: { atmId, branchId, lastTxnTime, balance: parseFloat(balance) || 0 }
        });
        res.json(atm);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update ATM' });
    }
});

// DELETE
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id as string;
        await prisma.atm.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete ATM' });
    }
});

// BULK UPLOAD (CSV)
router.post('/bulk', authenticateToken, async (req, res) => {
    const { csvContent } = req.body;
    if (!csvContent) return res.status(400).json({ error: 'No CSV content provided' });

    try {
        const { parse } = require('csv-parse/sync');
        const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

        let count = 0;
        for (const record of records) {
            const branchCode = record['BR CODE'] as string;
            const atmId = (record['ATM ID'] || record['atmId']) as string;
            const lastTxnTime = (record['LAST TXT DT'] || record['lastTxnTime'] || '') as string;
            const balanceStr = (record['TOTAL CASH AVAILABLE'] || record['balance']) as string;
            const balance = parseFloat(balanceStr) || 0;

            if (!branchCode || !atmId) continue;

            const branch = await prisma.branch.findUnique({ where: { code: branchCode } });
            if (!branch) continue;

            await prisma.atm.upsert({
                where: { atmId },
                update: { branchId: branch.id, lastTxnTime, balance },
                create: { atmId, branchId: branch.id, lastTxnTime, balance }
            });
            count++;
        }
        res.json({ success: true, count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process bulk upload' });
    }
});

export default router;
