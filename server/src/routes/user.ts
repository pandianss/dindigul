import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticateToken, requireAdminOrPlanning } from '../middleware/auth';
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
    // Permission: ADMIN or RO_USER or Planning Section (RO level)
    const isPlanningRole = req.user?.role === 'RO_USER' && req.user?.section === 'Planning';
    const canView = req.user?.role === 'ADMIN' ||
        req.user?.role === 'RO_USER' ||
        isPlanningRole ||
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

// Create new user (Admin or Planning)
router.post('/', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
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
router.put('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
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
router.delete('/:id', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {
    const id = req.params.id as string;
    try {
        await userService.deleteUser(id);
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

// Bulk upload users
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

        // Deduplicate by username/roll (keep first occurrence)
        const seen = new Set<string>();
        const uniqueItems = items.filter((item: any) => {
            const key = (item.username || item.Roll || item['Roll No'] || '').toString().trim();
            if (seen.has(key) || !key) return false;
            seen.add(key);
            return true;
        });

        // Cache designation IDs to avoid redundant upserts
        const desigCache: Record<string, string> = {};
        const branchCache: Record<string, string> = {};

        let processed = 0, skipped = 0;
        const errors: string[] = [];

        for (const item of uniqueItems) {
            const username = (item.username || item.Roll || item['Roll No'] || '').toString().trim();
            const fullNameEn = (item.fullNameEn || item.Name || '').toString().trim();
            const designationName = (item.designationName || item.Designation || '').toString().trim();
            const branchCode = (item.branchCode || item['br code'] || '').toString().trim();
            const grade = (item.Grade || item.grade || '').toString().trim();

            if (!username || !fullNameEn) { skipped++; continue; }

            try {
                // 1. Resolve Designation (with cache)
                let designationId = item.designationId;
                if (!designationId && designationName) {
                    const desigCode = designationName.toUpperCase().replace(/\s+/g, '_');
                    if (desigCache[desigCode]) {
                        designationId = desigCache[desigCode];
                    } else {
                        const desig = await prisma.designation.upsert({
                            where: { code: desigCode },
                            update: { nameEn: designationName },
                            create: { code: desigCode, nameEn: designationName, workId: 999 }
                        });
                        desigCache[desigCode] = desig.id;
                        designationId = desig.id;
                    }
                }

                // 2. Resolve Branch (with cache)
                // Try multiple code formats (e.g. '174', '0174', '00174') and prefer
                // properly-named branches over phantom "Branch XXXX" entries.
                let branchId = item.branchId;
                if (!branchId && branchCode) {
                    if (branchCache[branchCode]) {
                        branchId = branchCache[branchCode];
                    } else {
                        const numericCode = parseInt(branchCode);
                        const codeVariants = [
                            branchCode,
                            String(numericCode).padStart(4, '0'),
                            String(numericCode).padStart(5, '0'),
                        ].filter((v, i, a) => a.indexOf(v) === i); // unique only

                        // Fetch all candidates matching any code variant or officeId
                        const candidates = await prisma.branch.findMany({
                            where: {
                                OR: [
                                    { code: { in: codeVariants } },
                                    { officeId: numericCode || undefined }
                                ]
                            }
                        });

                        // Prefer properly-named branch (not "Branch XXXX") over phantom
                        const named = candidates.find(b => !b.nameEn.startsWith('Branch '));
                        let branch = named ?? candidates[0];

                        if (!branch) {
                            // Create a placeholder only if truly missing
                            branch = await prisma.branch.create({
                                data: {
                                    code: branchCode,
                                    nameEn: `Branch ${branchCode}`,
                                    officeId: numericCode || 9999,
                                    type: 'BRANCH'
                                }
                            });
                        }
                        branchCache[branchCode] = branch.id;
                        branchId = branch.id;
                    }
                }

                // Extra safety: If we have branchId but no branch object (from cache), fetch it
                let branchType = '';
                if (branchId) {
                    const b = await prisma.branch.findUnique({ where: { id: branchId }, select: { type: true } });
                    branchType = b?.type || '';
                }

                // 3. Upsert User
                await prisma.user.upsert({
                    where: { username },
                    update: { fullNameEn, grade, designationId, branchId },
                    create: {
                        username,
                        passwordHash: await bcrypt.hash('Bank@123', 10),
                        fullNameEn,
                        grade,
                        designationId,
                        branchId,
                        role: item.role || (branchType === 'REGIONAL OFFICE' ? 'RO_USER' : 'BRANCH_USER')
                    }
                });
                processed++;
            } catch (err: any) {
                errors.push(`Row ${username}: ${err.message}`);
                skipped++;
            }
        }

        res.json({
            message: `Bulk upload complete. Processed: ${processed}, Skipped/Failed: ${skipped}.`,
            errors: errors.length > 0 ? errors.slice(0, 20) : undefined // Return first 20 errors if any
        });
    } catch (error) {
        console.error('Bulk user error:', error);
        res.status(500).json({ error: 'Failed to process bulk upload' });
    }
});

// Transfer User (GAP 18)
router.post('/:id/transfer', authenticateToken, requireAdminOrPlanning, async (req: any, res) => {

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
