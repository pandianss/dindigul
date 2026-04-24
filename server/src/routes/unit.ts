import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdminOrPlanning } from '../middleware/auth';
import { parseCSV } from '../utils/csv';

const router = Router();

// Get unit by SOL code
router.get('/code/:code', authenticateToken, async (req: any, res) => {
    const { code } = req.params;
    try {
        const unit = await prisma.branch.findUnique({
            where: { code },
            include: {
                headUser: {
                    select: {
                        grade: true,
                        fullNameEn: true
                    }
                }
            }
        });
        if (!unit) return res.status(404).json({ error: 'Unit not found' });
        res.json(unit);
    } catch (error) {
        console.error('Failed to fetch unit details:', error);
        res.status(500).json({ error: 'Failed to fetch unit details' });
    }
});

// Get all units (branches, RO, LPC)
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        const units = await prisma.branch.findMany({
            orderBy: { code: 'asc' }
        });
        
        // Diagnostic Logging
        console.log(`[API/Branches] Found ${units.length} units in database.`);
        if (units.length > 0) {
            console.log(`[API/Branches] Sample Unit: ${units[0].code} - ${units[0].nameEn}`);
        } else {
            console.warn(`[API/Branches] WARNING: Table 'branch' appears empty in this query context.`);
        }

        res.json(units);
    } catch (error) {
        console.error('Failed to fetch units:', error);
        res.status(500).json({ error: 'Failed to fetch units' });
    }
});

// Create new unit
router.post('/', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const { 
        code, nameEn, nameTa, nameHi, type, size, openDate, populationGroup, 
        riskCategory, riskEffectiveDate, prevRiskCategory, ifsc, micr, bsrCode, 
        address1En, address2En, districtEn, address1Ta, address2Ta, districtTa, 
        address1Hi, address2Hi, districtHi, pincode, phone, email, latitude, longitude 
    } = req.body;

    try {
        if (type === 'RO') {
            const existingRO = await prisma.branch.findFirst({ where: { type: 'RO' } });
            if (existingRO) {
                return res.status(400).json({ error: 'Only one Regional Office (RO) can exist in the system.' });
            }
        }

        // Auto-attach to the single RO if this is a branch/LPC
        let parentCodeToSet = undefined;
        if (type !== 'RO') {
            const ro = await prisma.branch.findFirst({ where: { type: 'RO' } });
            if (ro) parentCodeToSet = ro.code;
        }

        const unit = await prisma.branch.create({
            data: {
                code, nameEn, nameTa, nameHi, type: type || 'BRANCH', size, openDate, populationGroup,
                parentCode: parentCodeToSet,
                riskCategory,
                riskEffectiveDate: riskEffectiveDate ? new Date(riskEffectiveDate) : null,
                prevRiskCategory, ifsc, micr, bsrCode,
                address1En, address2En, districtEn,
                address1Ta, address2Ta, districtTa,
                address1Hi, address2Hi, districtHi,
                pincode, phone, email,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null
            }
        });
        res.json(unit);
    } catch (error: any) {
        console.error("Create unit error:", error);
        res.status(400).json({ error: 'Failed to create unit', detail: error.message });
    }
});

// Update unit
router.put('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const code = req.params.id as string;
    const { 
        nameEn, nameTa, nameHi, type, size, openDate, populationGroup, 
        riskCategory, riskEffectiveDate, prevRiskCategory, ifsc, micr, bsrCode, 
        address1En, address2En, districtEn, address1Ta, address2Ta, districtTa, 
        address1Hi, address2Hi, districtHi, pincode, phone, email, latitude, longitude 
    } = req.body;

    try {
        const oldUnit = await prisma.branch.findUnique({ where: { code } });
        
        if (type === 'RO') {
            const existingRO = await prisma.branch.findFirst({ where: { type: 'RO', NOT: { code } } });
            if (existingRO) {
                return res.status(400).json({ error: 'Only one Regional Office (RO) can exist in the system.' });
            }
        }


        // Auto-attach to the single RO if this is a branch/LPC
        let parentCodeToSet = undefined;
        if (type !== 'RO') {
            const ro = await prisma.branch.findFirst({ where: { type: 'RO' } });
            if (ro) parentCodeToSet = ro.code;
        }

        const unit = await prisma.branch.update({
            where: { code },
            data: {
                nameEn, nameTa, nameHi, type, size, openDate, populationGroup,
                parentCode: parentCodeToSet,
                riskCategory,
                riskEffectiveDate: riskEffectiveDate ? new Date(riskEffectiveDate) : undefined,
                prevRiskCategory, ifsc, micr, bsrCode,
                address1En, address2En, districtEn,
                address1Ta, address2Ta, districtTa,
                address1Hi, address2Hi, districtHi,
                pincode, phone, email,
                latitude: latitude ? parseFloat(latitude) : null,
                longitude: longitude ? parseFloat(longitude) : null
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
    } catch (error: any) {
        console.error("Update unit error detail:", {
            message: error.message,
            code: error.code,
            meta: error.meta,
            body: req.body
        });
        res.status(400).json({
            error: 'Update failed',
            detail: error.message,
            code: error.code
        });
    }
});

// Mass Purge Isolated Units
router.delete('/purge', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {

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
router.delete('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const id = req.params.id as string;

    // Safety Guard: Prevent users from deleting the unit they are currently assigned to
    if (req.user?.branchId === id) {
        return res.status(400).json({
            error: 'Security Violation: You cannot delete the unit you are currently assigned to. Please transfer yourself to another unit first.'
        });
    }

    try {
        // Pre-delete Cleanup: Remove transient dependencies that block branch deletion
        // (Draft Letters, Branch History, Campaign Targets, etc.)
        await prisma.letter.deleteMany({ where: { branchId: id, status: 'DRAFT' } });
        await prisma.branchHistory.deleteMany({ where: { branchId: id } });
        await prisma.campaignDailyData.deleteMany({ where: { branchId: id } });
        await prisma.campaignTarget.deleteMany({ where: { branchId: id } });
        
        // Final Deletion
        await prisma.branch.delete({ where: { id } });
        res.json({ message: 'Unit and its associated draft records deleted successfully' });
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
router.post('/bulk', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const { csvContent, jsonData } = req.body;
    try {
        let items = jsonData;
        if (csvContent) {
            items = parseCSV(csvContent);
        }

        if (!Array.isArray(items)) {
            return res.status(400).json({ error: 'Invalid format' });
        }

        const roInBatch = items.find((it: any) => (it['Type'] || it['type']) === 'RO');
        const dbRO = await prisma.branch.findFirst({ where: { type: 'RO' } });
        const roCode = roInBatch ? (roInBatch['SOL'] || roInBatch['code']) : dbRO?.code;

        const results = await Promise.all(items.map(async (item: any) => {
            // Map CSV Headers to Database Fields
            const code = item['SOL'] || item['code'];
            const nameEn = item['English Name'] || item['nameEn'];
            
            if (!code || !nameEn) return null;

            const data = {
                nameEn,
                nameTa: item['Tamil Name'] || item['nameTa'],
                nameHi: item['Hindi Name'] || item['nameHi'],
                type: item['Type'] || item['type'] || 'BRANCH',
                size: item['Size'] || item['size'],
                openDate: item['Open Date'] || item['openDate'],
                populationGroup: item['Population Group'] || item['populationGroup'],
                riskCategory: item['Risk Category'] || item['riskCategory'],
                riskEffectiveDate: (item['Risk Effective Date'] || item['riskEffectiveDate']) ? new Date(item['Risk Effective Date'] || item['riskEffectiveDate']) : null,
                prevRiskCategory: item['Prev Risk Category'] || item['prevRiskCategory'],
                ifsc: item['IFSC'] || item['ifsc'],
                micr: item['MICR'] || item['micr'],
                bsrCode: item['BSR Code'] || item['bsrCode'],
                address1En: item['Add1 English'] || item['address1En'],
                address2En: item['Add 2 English'] || item['address2En'],
                districtEn: item['District English'] || item['districtEn'],
                address1Ta: item['Add1 Tamil'] || item['address1Ta'],
                address2Ta: item['Add 2 Tamil'] || item['address2Ta'],
                districtTa: item['District Tamil'] || item['districtTa'],
                address1Hi: item['Add1 Hindi'] || item['address1Hi'],
                address2Hi: item['Add 2 Hindi'] || item['address2Hi'],
                districtHi: item['District Hindi'] || item['districtHi'],
                pincode: item['Pincode'] || item['pincode'],
                phone: item['Phone'] || item['phone'],
                email: item['email'] || item['email'],
                latitude: parseFloat(item['Latitude'] || item['latitude']) || null,
                longitude: parseFloat(item['Longitude'] || item['longitude']) || null,
                officeId: parseInt(item['officeId']) || undefined,
                parentCode: (item['Type'] || item['type'] || 'BRANCH') !== 'RO' ? roCode : undefined
            };

            return prisma.branch.upsert({
                where: { code: String(code) },
                update: data,
                create: { ...data, code: String(code) }
            });
        }));

        res.json({ message: `Processed ${results.filter(r => r !== null).length} units` });
    } catch (error) {
        console.error('Bulk unit error:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

export default router;
