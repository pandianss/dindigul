import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { parseCSV } from '../utils/csv';

const router = Router();

// Get all units (branches, RO, LPC)
router.get('/', authenticateToken, async (req: any, res) => {
    // Permission: Only ADMIN or Planning Section (RO level) can modify
    const isPlanningRole = req.user.role === 'RO_USER' && req.user.section === 'Planning';
    const canManage = req.user.role === 'ADMIN' || isPlanningRole || req.user?.role === 'RO_USER';
    if (!canManage) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    try {
        const units = await prisma.branch.findMany({
            orderBy: { officeId: 'asc' }
        });
        res.json(units);
    } catch (error) {
        console.error('Failed to fetch units:', error);
        res.status(500).json({ error: 'Failed to fetch units' });
    }
});

// Create new unit
router.post('/', authenticateToken, async (req, res) => {
    const { code, officeId, nameEn, nameTa, nameHi, type, ifsc, address, addressTa, addressHi, phone, email, populationGroup, specialStatus, riskCategory, riskEffectiveDate } = req.body;
    try {
        const unit = await prisma.branch.create({
            data: {
                code,
                officeId: parseInt(officeId) || 9999,
                nameEn,
                nameTa,
                nameHi,
                type,
                populationGroup,
                specialStatus: typeof specialStatus === 'object' ? JSON.stringify(specialStatus) : specialStatus,
                riskCategory,
                riskEffectiveDate: riskEffectiveDate ? new Date(riskEffectiveDate) : null,
                ifsc,
                address,
                addressTa,
                addressHi,
                phone,
                email
            }
        });
        res.json(unit);
    } catch (error) {
        console.error("Create unit error:", error);
        res.status(400).json({ error: 'Failed to create unit' });
    }
});

// Update unit
router.put('/:id', authenticateToken, async (req, res) => {
    const id = req.params.id as string;
    const { code, officeId, nameEn, nameTa, nameHi, type, ifsc, address, addressTa, addressHi, phone, email, populationGroup, specialStatus, riskCategory, riskEffectiveDate } = req.body;

    try {
        const oldUnit = await prisma.branch.findUnique({ where: { id } });

        const unit = await prisma.branch.update({
            where: { id },
            data: {
                code,
                officeId: parseInt(officeId) || 9999,
                nameEn,
                nameTa,
                nameHi,
                type,
                populationGroup,
                specialStatus: typeof specialStatus === 'object' ? JSON.stringify(specialStatus) : specialStatus,
                riskCategory,
                riskEffectiveDate: riskEffectiveDate ? new Date(riskEffectiveDate) : undefined,
                ifsc,
                address,
                addressTa,
                addressHi,
                phone,
                email
            }
        });

        // History Tracking
        const historyData = [];
        if (oldUnit) {
            if (oldUnit.riskCategory !== riskCategory && riskCategory) {
                historyData.push({
                    branchId: id,
                    fieldChanged: 'riskCategory',
                    oldValue: oldUnit.riskCategory,
                    newValue: riskCategory,
                    changedBy: 'System'
                });
            }
            if (oldUnit.populationGroup !== populationGroup && populationGroup) {
                historyData.push({
                    branchId: id,
                    fieldChanged: 'populationGroup',
                    oldValue: oldUnit.populationGroup,
                    newValue: populationGroup,
                    changedBy: 'System'
                });
            }

            if (historyData.length > 0) {
                await prisma.branchHistory.createMany({ data: historyData });
            }
        }

        res.json(unit);
    } catch (error) {
        console.error("Update unit error:", error);
        res.status(400).json({ error: 'Update failed' });
    }
});

// Mass Purge Isolated Units
router.delete('/purge', authenticateToken, async (req: any, res) => {
    // Permission constraint: Only full Admins
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only administrators can perform a mass purge.' });
    }

    try {
        const allBranches = await prisma.branch.findMany({ select: { id: true, code: true } });
        let deletedCount = 0;
        let blockedCount = 0;

        for (const branch of allBranches) {
            try {
                await prisma.branch.delete({ where: { id: branch.id } });
                deletedCount++;
            } catch (error: any) {
                if (error.code === 'P2003') {
                    blockedCount++; // Skip dependent units gracefully
                } else {
                    console.error(`Failed deleting branch ${branch.code}:`, error);
                }
            }
        }

        res.json({ message: `Purge Complete. Deleted ${deletedCount} isolated units. Skipped ${blockedCount} units due to active dependencies.` });
    } catch (error) {
        console.error('Purge error:', error);
        res.status(500).json({ error: 'Purge process failed' });
    }
});

// Delete individual unit
router.delete('/:id', authenticateToken, async (req: any, res) => {
    const id = req.params.id as string;

    // Safety Guard: Prevent users from deleting the unit they are currently assigned to
    if (req.user?.branchId === id) {
        return res.status(400).json({
            error: 'Security Violation: You cannot delete the unit you are currently assigned to. Please transfer yourself to another unit first.'
        });
    }

    try {
        await prisma.branch.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error: any) {
        console.error(`Delete unit ${id} error:`, error);

        // P2003 is Prisma's code for foreign key constraint violation
        if (error.code === 'P2003' || (error.message && error.message.includes('violates RESTRICT setting'))) {
            return res.status(400).json({
                error: 'Cannot delete this unit. It has active dependencies such as staff members, ingestion logs, historical records, or documents assigned to it. Please reassign or remove these records first.'
            });
        }

        res.status(400).json({ error: error.message || 'Delete failed' });
    }
});

// Bulk upload units
router.post('/bulk', authenticateToken, async (req, res) => {
    const { csvContent, jsonData } = req.body;
    try {
        let items = jsonData;
        if (csvContent) {
            items = parseCSV(csvContent);
        }

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid format' });
        }

        const results = await Promise.all(items.map(async (item: any) => {
            const { code, officeId, nameEn, nameTa, nameHi, type, populationGroup, specialStatus, riskCategory, riskEffectiveDate, ifsc, address, addressTa, addressHi } = item;
            if (!code || !nameEn) return null;

            return prisma.branch.upsert({
                where: { code },
                update: {
                    officeId: parseInt(officeId) || undefined,
                    nameEn, nameTa, nameHi, type, populationGroup,
                    specialStatus: typeof specialStatus === 'object' ? JSON.stringify(specialStatus) : specialStatus,
                    riskCategory,
                    riskEffectiveDate: riskEffectiveDate ? new Date(riskEffectiveDate) : undefined,
                    ifsc, address, addressTa, addressHi
                },
                create: {
                    code,
                    officeId: parseInt(officeId) || 9999,
                    nameEn, nameTa, nameHi, type, populationGroup,
                    specialStatus: typeof specialStatus === 'object' ? JSON.stringify(specialStatus) : specialStatus,
                    riskCategory,
                    riskEffectiveDate: riskEffectiveDate ? new Date(riskEffectiveDate) : null,
                    ifsc, address, addressTa, addressHi
                }
            });
        }));

        res.json({ message: `Processed ${results.filter(r => r !== null).length} units` });
    } catch (error) {
        console.error('Bulk unit error:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
