import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { parseCSV } from '../utils/csv';
import { saveBase64Image } from '../utils/image';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { validate } from '../lib/validate';
import { parsePagination } from '../utils/pagination';
import { userService } from '../services/userService';

const router = Router();

// Helper to save base64 to disk (GAP 06) - DEPRECATED: see utils/image.ts
// const saveBase64Image = (base64Data: string): string => { ... };

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
        req.user?.role === 'RO_MANAGER'; // Temporary backward compatibility

    if (!canView) {
        return res.status(403).json({ error: 'Permission denied' });
    }
    try {
        const { skip, take, page, limit } = parsePagination(req);
        const paginatedResponse = await userService.getUsers(skip, take, page, limit);
        res.json(paginatedResponse);
    } catch (error) {
        console.error("Fetch users error:", error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create new user (Admin)
router.post('/', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only ADMIN can create users' });
    }
    const {
        username, fullNameEn, fullNameTa, fullNameHi, grade, role, gender,
        departmentId, departmentIds, managedDepartmentIds,
        designationId, branchId, photoData, isUnitHead
    } = req.body;

    try {
        const user = await userService.createUser(req.body);
        res.json(user);
    } catch (error) {
        console.error('User creation error:', error);
        res.status(400).json({ error: 'Creation failed' });
    }
});

// Update user
router.put('/:id', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only ADMIN can update users' });
    }
    const id = req.params.id as string;
    const {
        fullNameEn, fullNameTa, fullNameHi, grade, role, gender,
        departmentId, departmentIds, managedDepartmentIds,
        designationId, branchId, photoData, isUnitHead
    } = req.body;

    try {
        const user = await userService.updateUser(id, req.body);
        res.json(user);
    } catch (error) {
        console.error('Update failed:', error);
        res.status(400).json({ error: 'Update failed' });
    }
});

// Delete user
router.delete('/:id', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only ADMIN can delete users' });
    }
    const id = req.params.id as string;
    try {
        await userService.deleteUser(id);
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

// Bulk upload users
router.post('/bulk', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN') {
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
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only ADMIN can transfer users' });
    }

    const { id } = req.params;
    const { branchId, designationId, remarks } = req.body;

    if (!branchId) {
        return res.status(400).json({ error: 'Target branchId is required' });
    }

    try {
        const result = await userService.transferUser(id, branchId, designationId, remarks);
        res.json(result);
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ error: 'Transfer failed' });
    }
});

export default router;
