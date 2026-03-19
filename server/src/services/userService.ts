import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { saveBase64Image } from '../utils/image';
import { getPaginatedResponse } from '../utils/pagination';

export const userService = {
    async getUsers(skip: number, take: number, page: number, limit: number) {
        const [users, total] = await Promise.all([
            prisma.user.findMany({
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
            prisma.user.count()
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
                photoId: photoId || undefined
            }
        });

        if (data.isUnitHead && data.branchId) {
            await prisma.branch.update({
                where: { id: data.branchId },
                data: { headUserId: user.id }
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
                ...(photoId ? { photoId } : {})
            }
        });

        if (data.branchId) {
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
