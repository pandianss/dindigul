import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { getRegionalOfficeData } from '../services/pdfService';

const router = Router();

// Get organization config merged with RO branch details
router.get('/', authenticateToken, async (req, res) => {
    try {
        const RO_DATA = await getRegionalOfficeData();

        let config = await prisma.organizationConfig.findUnique({
            where: { id: 'singleton' }
        });

        if (!config) {
            config = await prisma.organizationConfig.create({
                data: {
                    id: 'singleton',
                    bankNameEn: RO_DATA.bankNameEn,
                    bankNameTa: RO_DATA.bankNameTa,
                    bankNameHi: RO_DATA.bankNameHi,
                    signingAuthEn: RO_DATA.signingAuthEn || "Regional Manager",
                    signingAuthTa: RO_DATA.signingAuthTa || "மண்டல மேலாளர்",
                    signingAuthHi: RO_DATA.signingAuthHi || "क्षेत्रीय प्रबंधक",
                    signatoryName: RO_DATA.signatoryName || "CHANDRA KUMAR P"
                }
            });
        }

        // Merge current RO data into the config response
        const mergedConfig = {
            ...config,
            ...RO_DATA
        };

        res.json(mergedConfig);
    } catch (error) {
        console.error('Error fetching organization config:', error);
        res.status(500).json({ error: 'Failed to fetch organization configuration' });
    }
});

// Update organization config (Admin or Planning only)
router.post('/', authenticateToken, async (req: any, res) => {
    const isPlanningRole = req.user?.role === 'RO_USER' && req.user?.section === 'Planning';
    if (req.user.role !== 'ADMIN' && !isPlanningRole) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
        const {
            bankNameEn, bankNameTa, bankNameHi,
            signingAuthEn, signingAuthTa, signingAuthHi,
            signatoryName
        } = req.body;

        const config = await prisma.organizationConfig.upsert({
            where: { id: 'singleton' },
            update: {
                bankNameEn, bankNameTa, bankNameHi,
                signingAuthEn, signingAuthTa, signingAuthHi,
                signatoryName
            },
            create: {
                id: 'singleton',
                bankNameEn, bankNameTa, bankNameHi,
                signingAuthEn, signingAuthTa, signingAuthHi,
                signatoryName
            }
        });

        res.json(config);
    } catch (error) {
        console.error('Error updating organization config:', error);
        res.status(500).json({ error: 'Failed to update organization configuration' });
    }
});

export default router;
