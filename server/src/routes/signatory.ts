import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get potential signatories
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        const signatories = await prisma.user.findMany({
            where: {
                OR: [
                    { role: 'RO_USER' },
                    { role: 'ADMIN' },
                    { 
                        designationEn: { 
                            contains: 'Manager', 
                            mode: 'insensitive' 
                        } 
                    },
                    { 
                        designationEn: { 
                            contains: 'Head', 
                            mode: 'insensitive' 
                        } 
                    }
                ]
            },
            select: {
                id: true,
                fullNameEn: true,
                fullNameTa: true,
                fullNameHi: true,
                designationEn: true,
                designationTa: true,
                designationHi: true,
                branch: {
                    select: {
                        nameEn: true,
                        code: true
                    }
                }
            },
            orderBy: {
                fullNameEn: 'asc'
            }
        });

        // Filter out some common non-authoritative roles if needed, 
        // but for now, the contains 'Manager' or 'Head' is a good filter.
        
        res.json(signatories);
    } catch (error) {
        console.error('Fetch signatories error:', error);
        res.status(500).json({ error: 'Failed to fetch signatories' });
    }
});

export default router;
