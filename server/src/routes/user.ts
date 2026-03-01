import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { parseCSV } from '../utils/csv';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper to save base64 to disk (GAP 06)
const saveBase64Image = (base64Data: string): string => {
    // Basic validation: ensure this looks like an image data URL or plain base64
    if (!base64Data || typeof base64Data !== 'string') {
        throw new Error('Invalid image data');
    }

    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB safety cap

    const fileName = `${uuidv4()}.jpg`;
    const photosDir = path.join(process.cwd(), 'uploads', 'photos');
    if (!fs.existsSync(photosDir)) {
        fs.mkdirSync(photosDir, { recursive: true });
    }
    const filePath = path.join(photosDir, fileName);
    const data = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(data, 'base64');

    if (buffer.length > MAX_BYTES) {
        throw new Error('Image too large');
    }

    fs.writeFileSync(filePath, buffer);
    return `/uploads/photos/${fileName}`;
};

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

// Upload Portrait Photo (4:5 Aspect Ratio) - Now saves to disk (GAP 06)
router.post('/photo', authenticateToken, async (req: any, res) => {
    const { data } = req.body; // Base64 data
    try {
        const photoUrl = saveBase64Image(data);
        const photo = await prisma.photo.create({
            data: {
                photoUrl,
                aspectRatio: '4:5'
            }
        });

        await prisma.user.update({
            where: { id: req.user.id },
            data: { photoId: photo.id }
        });

        res.json(photo);
    } catch (error) {
        console.error('Photo upload error:', error);
        res.status(400).json({ error: 'Photo upload failed' });
    }
});

// Get all users
router.get('/', authenticateToken, async (req: any, res) => {
    // Permission: ADMIN or RO_USER or 'admin' bypass
    const canView = req.user?.role === 'ADMIN' ||
        req.user?.role === 'RO_USER' ||
        req.user?.role === 'RO_MANAGER' || // Temporary backward compatibility
        req.user?.username === 'admin';

    if (!canView) {
        return res.status(403).json({ error: 'Permission denied' });
    }
    try {
        const users = await prisma.user.findMany({
            include: {
                photo: true,
                branch: true,
                department: true,
                departments: true,
                managedDepartments: true,
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
router.post('/', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.username !== 'admin') {
        return res.status(403).json({ error: 'Only ADMIN can create users' });
    }
    const {
        username, fullNameEn, fullNameTa, fullNameHi, grade, role,
        departmentId, departmentIds, managedDepartmentIds,
        designationId, branchId, photoData, isUnitHead
    } = req.body;

    try {
        let photoId = null;
        if (photoData) {
            const photoUrl = saveBase64Image(photoData);
            const photo = await prisma.photo.create({
                data: { photoUrl, aspectRatio: '4:5' }
            });
            photoId = photo.id;
        }

        const user = await prisma.user.create({
            data: {
                username,
                passwordHash: await bcrypt.hash('Bank@123', 10), // Default password
                fullNameEn,
                fullNameTa,
                fullNameHi,
                grade,
                role,
                departmentId,
                departments: departmentIds ? {
                    connect: departmentIds.map((id: string) => ({ id }))
                } : undefined,
                managedDepartments: managedDepartmentIds ? {
                    connect: managedDepartmentIds.map((id: string) => ({ id }))
                } : undefined,
                designationId,
                branchId,
                photoId: photoId || undefined
            }
        });

        // If marked as unit head, update the branch/LPC record
        if (isUnitHead && branchId) {
            await prisma.branch.update({
                where: { id: branchId },
                data: { headUserId: user.id }
            });
        }

        res.json(user);
    } catch (error) {
        console.error('User creation error:', error);
        res.status(400).json({ error: 'Creation failed' });
    }
});

// Update user
router.put('/:id', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.username !== 'admin') {
        return res.status(403).json({ error: 'Only ADMIN can update users' });
    }
    const id = req.params.id as string;
    const {
        fullNameEn, fullNameTa, fullNameHi, grade, role,
        departmentId, departmentIds, managedDepartmentIds,
        designationId, branchId, photoData, isUnitHead
    } = req.body;

    try {
        let photoId = undefined;
        if (photoData) {
            const photoUrl = saveBase64Image(photoData);
            const photo = await prisma.photo.create({
                data: { photoUrl, aspectRatio: '4:5' }
            });
            photoId = photo.id;
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                fullNameEn,
                fullNameTa,
                fullNameHi,
                grade,
                role,
                departmentId,
                departments: departmentIds ? {
                    set: departmentIds.map((id: string) => ({ id }))
                } : undefined,
                managedDepartments: managedDepartmentIds ? {
                    set: managedDepartmentIds.map((id: string) => ({ id }))
                } : undefined,
                designationId,
                branchId,
                ...(photoId ? { photoId } : {})
            }
        });

        // Handle Unit Head logic
        if (branchId) {
            if (isUnitHead) {
                // Set as head
                await prisma.branch.update({
                    where: { id: branchId },
                    data: { headUserId: user.id }
                });
            } else {
                // If they were head, unset (only if it was still them)
                const branch = await prisma.branch.findUnique({ where: { id: branchId } });
                if (branch?.headUserId === user.id) {
                    await prisma.branch.update({
                        where: { id: branchId },
                        data: { headUserId: null }
                    });
                }
            }
        }

        res.json(user);
    } catch (error) {
        console.error('Update failed:', error);
        res.status(400).json({ error: 'Update failed' });
    }
});

// Delete user
router.delete('/:id', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.username !== 'admin') {
        return res.status(403).json({ error: 'Only ADMIN can delete users' });
    }
    const id = req.params.id as string;
    try {
        await prisma.user.delete({ where: { id } });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

// Bulk upload users
router.post('/bulk', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.username !== 'admin') {
        return res.status(403).json({ error: 'Only ADMIN can bulk import users' });
    }
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
            // Support both standard keys and Staff.csv keys
            const username = item.username || item.Roll || item['Roll No'];
            const fullNameEn = item.fullNameEn || item.Name;
            const designationName = item.designationName || item.Designation;
            const branchCode = item.branchCode || item['br code'];

            if (!username || !fullNameEn) return null;

            // 1. Resolve or Create Designation
            let designationId = item.designationId;
            if (!designationId && designationName) {
                const desig = await prisma.designation.upsert({
                    where: { code: designationName.toUpperCase().replace(/\s+/g, '_') },
                    update: { nameEn: designationName },
                    create: {
                        code: designationName.toUpperCase().replace(/\s+/g, '_'),
                        nameEn: designationName,
                        workId: 999
                    }
                });
                designationId = desig.id;
            }

            // 2. Resolve or Create Branch
            let branchId = item.branchId;
            if (!branchId && branchCode) {
                const branch = await prisma.branch.upsert({
                    where: { code: branchCode.toString() },
                    update: {},
                    create: {
                        code: branchCode.toString(),
                        nameEn: `Branch ${branchCode}`,
                        officeId: parseInt(branchCode) || 9999,
                        type: 'BRANCH'
                    }
                });
                branchId = branch.id;
            }

            return prisma.user.upsert({
                where: { username: username.toString() },
                update: {
                    fullNameEn,
                    grade: item.Grade || item.grade,
                    designationId,
                    branchId,
                    role: item.role || 'BRANCH_USER'
                },
                create: {
                    username: username.toString(),
                    passwordHash: '$2a$10$vN3XnCj7XW6Q8.r.vB1rU.z5G8wRj7v9Z1vN3XnCj7XW6Q8.r.vB1rU', // 'password'
                    fullNameEn,
                    grade: item.Grade || item.grade,
                    designationId,
                    branchId,
                    role: item.role || 'BRANCH_USER'
                }
            });
        }));

        res.json({ message: `Processed ${results.filter(r => r !== null).length} users` });
    } catch (error) {
        console.error('Bulk user error:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

// Transfer User (GAP 18)
router.post('/:id/transfer', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.username !== 'admin') {
        return res.status(403).json({ error: 'Only ADMIN can transfer users' });
    }

    const { id } = req.params;
    const { branchId, designationId, remarks } = req.body;

    if (!branchId) {
        return res.status(400).json({ error: 'Target branchId is required' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Close current posting
            await tx.postingHistory.updateMany({
                where: { userId: id, isCurrent: true },
                data: { isCurrent: false, endDate: new Date() }
            });

            // 2. Create new posting
            const newPosting = await tx.postingHistory.create({
                data: {
                    userId: id,
                    branchId: branchId,
                    designationId: designationId || undefined,
                    remarks: remarks || 'Transferred by Admin',
                    isCurrent: true,
                    startDate: new Date()
                }
            });

            // 3. Update User's branchId and designationId
            const updatedUser = await tx.user.update({
                where: { id },
                data: {
                    branchId,
                    ...(designationId ? { designationId } : {})
                }
            });

            return { updatedUser, newPosting };
        });

        res.json(result);
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ error: 'Transfer failed' });
    }
});

export default router;
