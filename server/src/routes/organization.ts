import { Router } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Default values to seed if empty
const DEFAULT_CONFIG = {
    id: 'singleton',
    bankNameEn: "Indian Overseas Bank",
    bankNameTa: "இந்தியன் ஓவர்சீஸ் வங்கி",
    bankNameHi: "इंडियन ओवरसीज बैंक",
    phone: "+91 451 2420000",
    email: "ro.dindigul@bank.com",
    signingAuthEn: "Regional Manager",
    signingAuthTa: "மண்டல மேலாளர்",
    signingAuthHi: "क्षेत्रीय प्रबंधक",
    signatoryName: "CHANDRA KUMAR P"
};

// Get organization config merged with RO branch details
router.get('/', authenticateToken, async (req, res) => {
    try {
        let config = await prisma.organizationConfig.findUnique({
            where: { id: 'singleton' }
        });

        if (!config) {
            config = await prisma.organizationConfig.create({
                data: DEFAULT_CONFIG
            });
        }

        // Fetch the Regional Office branch details
        const roBranch = await prisma.branch.findFirst({
            where: { type: 'RO' }
        });

        // Merge branch details into the config response
        const mergedConfig = {
            ...config,
            officeNameEn: roBranch?.nameEn || "Dindigul Regional Office",
            officeNameTa: roBranch?.nameTa || "திண்டுக்கல் மண்டல அலுவலகம்",
            officeNameHi: roBranch?.nameHi || "डिंडिगुल क्षेत्रीय कार्यालय",
            address: roBranch?.address || roBranch?.addressTa || roBranch?.addressHi || "",
            phone: roBranch?.phone || "+91 451 2420000",
            email: roBranch?.email || "ro.dindigul@bank.com"
        };

        res.json(mergedConfig);
    } catch (error) {
        console.error('Error fetching organization config:', error);
        res.status(500).json({ error: 'Failed to fetch organization configuration' });
    }
});

// Update organization config (Admin only)
router.post('/', authenticateToken, async (req: any, res) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only admins can update organization configuration' });
    }

    try {
        const {
            bankNameEn, bankNameTa, bankNameHi,
            phone, email,
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
