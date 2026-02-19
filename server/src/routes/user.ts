import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get current user profile
router.get('/me', authenticateToken, async (req: any, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { photo: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { passwordHash, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update profile (Trilingual support)
router.put('/profile', authenticateToken, async (req: any, res) => {
    const { fullNameEn, fullNameTa, fullNameHi } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { fullNameEn, fullNameTa, fullNameHi }
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

// Upload Portrait Photo (4:5 Aspect Ratio)
router.post('/photo', authenticateToken, async (req: any, res) => {
    const { data } = req.body; // Base64 data
    try {
        const photo = await prisma.photo.create({
            data: {
                data,
                aspectRatio: '4:5'
            }
        });

        await prisma.user.update({
            where: { id: req.user.id },
            data: { photoId: photo.id }
        });

        res.json(photo);
    } catch (error) {
        res.status(400).json({ error: 'Photo upload failed' });
    }
});

export default router;
