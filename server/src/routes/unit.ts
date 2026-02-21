import { Router } from 'express';
import prisma from '../lib/prisma';
import { parseCSV } from '../utils/csv';

const router = Router();

// Get all units (branches, RO, LPC)
router.get('/', async (req, res) => {
    try {
        const units = await prisma.branch.findMany({
            orderBy: { officeId: 'asc' }
        });
        res.json(units);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch units' });
    }
});

// Create new unit
router.post('/', async (req, res) => {
    const { code, officeId, nameEn, nameTa, nameHi, type, ifsc, address, populationGroup, specialStatus, riskCategory, riskEffectiveDate } = req.body;
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
                address
            }
        });
        res.json(unit);
    } catch (error) {
        console.error("Create unit error:", error);
        res.status(400).json({ error: 'Failed to create unit' });
    }
});

// Update unit
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { code, officeId, nameEn, nameTa, nameHi, type, ifsc, address, populationGroup, specialStatus, riskCategory, riskEffectiveDate } = req.body;

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
                address
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

// Delete unit
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.branch.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

// Bulk upload units
router.post('/bulk', async (req, res) => {
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
            const { code, officeId, nameEn, nameTa, nameHi, type, populationGroup, specialStatus, riskCategory, riskEffectiveDate, ifsc, address } = item;
            if (!code || !nameEn) return null;

            return prisma.branch.upsert({
                where: { code },
                update: {
                    officeId: parseInt(officeId) || undefined,
                    nameEn, nameTa, nameHi, type, populationGroup,
                    specialStatus: typeof specialStatus === 'object' ? JSON.stringify(specialStatus) : specialStatus,
                    riskCategory,
                    riskEffectiveDate: riskEffectiveDate ? new Date(riskEffectiveDate) : undefined,
                    ifsc, address
                },
                create: {
                    code,
                    officeId: parseInt(officeId) || 9999,
                    nameEn, nameTa, nameHi, type, populationGroup,
                    specialStatus: typeof specialStatus === 'object' ? JSON.stringify(specialStatus) : specialStatus,
                    riskCategory,
                    riskEffectiveDate: riskEffectiveDate ? new Date(riskEffectiveDate) : null,
                    ifsc, address
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
