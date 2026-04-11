import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { saveBase64Image } from '../utils/image';
import { getPaginatedResponse } from '../utils/pagination';

export const userService = {
    async ensureAdminUser() {
        const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
        if (!admin) {
            const bootstrapPassword = process.env.INITIAL_ADMIN_PASSWORD;
            const allowBootstrap = process.env.ALLOW_ADMIN_BOOTSTRAP === 'true';

            if (!allowBootstrap || !bootstrapPassword) {
                console.warn('[System] Admin user not found. Skipping automatic bootstrap because ALLOW_ADMIN_BOOTSTRAP/INITIAL_ADMIN_PASSWORD is not configured.');
                return;
            }

            console.warn('[System] Admin user not found. Creating bootstrap admin user from environment configuration.');
            const passwordHash = await bcrypt.hash(bootstrapPassword, 10);
            await prisma.user.create({
                data: {
                    username: 'admin',
                    passwordHash,
                    fullNameEn: 'System Administrator',
                    role: 'ADMIN',
                    section: 'IT'
                }
            });
            console.warn('[System] Bootstrap admin user created. Rotate INITIAL_ADMIN_PASSWORD and disable ALLOW_ADMIN_BOOTSTRAP after first use.');
        }
    },
    async getUsers(skip: number, take: number, page: number, limit: number, role?: string | string[]) {
        const where: any = {};
        if (role) {
            if (Array.isArray(role)) {
                where.role = { in: role };
            } else {
                where.role = role;
            }
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: {
                    photo: true,
                    branch: true,
                    department: true,
                    departments: true,
                    managedDepartments: true,
                    designation: true
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.user.count({ where })
        ]);
        const safeUsers = users.map(u => {
            const { passwordHash, ...safe } = u;
            return safe;
        });
        return getPaginatedResponse(safeUsers, total, page, limit);
    },

    async createUser(data: any) {
        let photoId = null;
        if (data.photoData) {
            const photoUrl = saveBase64Image(data.photoData);
            const photo = await prisma.photo.create({
                data: { photoUrl, aspectRatio: '4:5' }
            });
            photoId = photo.id;
        }

        const user = await prisma.user.create({
            data: {
                username: data.username,
                passwordHash: await bcrypt.hash('Bank@123', 10), // Default password
                fullNameEn: data.fullNameEn,
                fullNameTa: data.fullNameTa,
                fullNameHi: data.fullNameHi,
                grade: data.grade,
                designationEn: data.designationEn,
                designationTa: data.designationTa,
                designationHi: data.designationHi,
                role: data.role,
                gender: data.gender,
                departmentId: data.departmentId,
                designationId: data.designationId,
                branchId: data.branchId,
                isSecondLine: data.isSecondLine || false,
                photoId: photoId || undefined
            }
        });

        if (data.isUnitHead && data.branchId) {
            await prisma.branch.update({
                where: { id: data.branchId },
                data: { headUserId: user.id }
            });
        }

        if (data.isSecondLine && data.branchId) {
            await prisma.branch.update({
                where: { id: data.branchId },
                data: { secondLineUserId: user.id }
            });
        }

        return user;
    },

    async updateUser(id: string, data: any) {
        let photoId = undefined;
        if (data.photoData) {
            const photoUrl = saveBase64Image(data.photoData);
            const photo = await prisma.photo.create({
                data: { photoUrl, aspectRatio: '4:5' }
            });
            photoId = photo.id;
        }

        const user = await prisma.user.update({
            where: { id },
            data: {
                fullNameEn: data.fullNameEn,
                fullNameTa: data.fullNameTa,
                fullNameHi: data.fullNameHi,
                grade: data.grade,
                designationEn: data.designationEn,
                designationTa: data.designationTa,
                designationHi: data.designationHi,
                role: data.role,
                gender: data.gender,
                departmentId: data.departmentId,
                designationId: data.designationId,
                branchId: data.branchId,
                isSecondLine: data.isSecondLine || false,
                ...(photoId ? { photoId } : {})
            }
        });

        if (data.branchId) {
            // Handle Head of Unit
            if (data.isUnitHead) {
                await prisma.branch.update({
                    where: { id: data.branchId },
                    data: { headUserId: user.id }
                });
            } else {
                const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
                if (branch?.headUserId === user.id) {
                    await prisma.branch.update({
                        where: { id: data.branchId },
                        data: { headUserId: null }
                    });
                }
            }

            // Handle 2nd Line
            if (data.isSecondLine) {
                await prisma.branch.update({
                    where: { id: data.branchId },
                    data: { secondLineUserId: user.id }
                });
            } else {
                const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
                if (branch?.secondLineUserId === user.id) {
                    await prisma.branch.update({
                        where: { id: data.branchId },
                        data: { secondLineUserId: null }
                    });
                }
            }
        }

        return user;
    },

    async deleteUser(id: string) {
        return await prisma.user.delete({ where: { id } });
    },

    async transferUser(id: string, branchId: string, designationId?: string, remarks?: string) {
        return await prisma.$transaction(async (tx) => {
            await tx.postingHistory.updateMany({
                where: { userId: id, isCurrent: true },
                data: { isCurrent: false, endDate: new Date() }
            });

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

            const updatedUser = await tx.user.update({
                where: { id },
                data: {
                    branchId,
                    ...(designationId ? { designationId } : {})
                }
            });

            return { updatedUser, newPosting };
        });
    }
};
