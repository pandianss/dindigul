import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();
// const prisma = new PrismaClient();

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

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                photo: true,
                branch: true,
                department: true,
                designation: true
            },
            orderBy: { createdAt: 'desc' }
        });
        const safeUsers = users.map(u => {
            const { passwordHash, ...safe } = u;
            return safe;
        });
        res.json(safeUsers);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create new user (Admin)
router.post('/', async (req, res) => {
    const { username, fullNameEn, fullNameTa, fullNameHi, role, departmentId, designationId, branchId, photoData } = req.body;
    try {
        let photoId = null;
        if (photoData) {
            const photo = await prisma.photo.create({
                data: { data: photoData, aspectRatio: '4:5' }
            });
            photoId = photo.id;
        }

        const user = await prisma.user.create({
            data: {
                username,
                passwordHash: '$2a$10$vN3XnCj7XW6Q8.r.vB1rU.z5G8wRj7v9Z1vN3XnCj7XW6Q8.r.vB1rU', // Default 'password' hash
                fullNameEn,
                fullNameTa,
                fullNameHi,
                role,
                departmentId,
                designationId,
                branchId,
                photoId
            }
        });
        const { passwordHash, ...safeUser } = user;
        res.json(safeUser);
    } catch (error) {
        console.error("User creation error:", error);
        res.status(400).json({ error: 'Failed to create user' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { fullNameEn, fullNameTa, fullNameHi, role, departmentId, designationId, branchId, photoData } = req.body;
    try {
        let photoId = undefined;
        if (photoData) {
            const photo = await prisma.photo.create({
                data: { data: photoData, aspectRatio: '4:5' }
            });
            photoId = photo.id;
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                fullNameEn,
                fullNameTa,
                fullNameHi,
                role,
                departmentId,
                designationId,
                branchId,
                ...(photoId ? { photoId } : {})
            }
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

export default router;
