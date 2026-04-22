import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { saveBase64Image } from '../utils/image';
import { getPaginatedResponse } from '../utils/pagination';

/**
 * Infrastructure Layer: Low-level data access for User entities.
 */
export class UserRepository {
    static async ensureAdminUser() {
        const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
        if (!admin) {
            const bootstrapPassword = process.env.INITIAL_ADMIN_PASSWORD;
            if (!bootstrapPassword) return;
            
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
        }
    }

    static async getUsers(skip: number, take: number, page: number, limit: number, role?: string | string[]) {
        const where: any = {};
        if (role) {
            where.role = Array.isArray(role) ? { in: role } : role;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                include: { photo: true, branch: true, department: true, designation: true },
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
    }

    static async createUser(data: any) {
        let photoId = null;
        if (data.photoData) {
            const photoUrl = saveBase64Image(data.photoData);
            const photo = await prisma.photo.create({ data: { photoUrl, aspectRatio: '4:5' } });
            photoId = photo.id;
        }

        return await prisma.user.create({
            data: {
                username: data.username,
                passwordHash: await bcrypt.hash('Bank@123', 10),
                fullNameEn: data.fullNameEn,
                role: data.role,
                branchId: data.branchId,
                photoId: photoId || undefined
            }
        });
    }
    static async updateUser(id: string, data: any) {
        let photoId = undefined;
        if (data.photoData) {
            const photoUrl = saveBase64Image(data.photoData);
            const photo = await prisma.photo.create({ data: { photoUrl, aspectRatio: '4:5' } });
            photoId = photo.id;
        }

        return await prisma.user.update({
            where: { id },
            data: {
                fullNameEn: data.fullNameEn,
                fullNameTa: data.fullNameTa,
                fullNameHi: data.fullNameHi,
                grade: data.grade,
                role: data.role,
                branchId: data.branchId,
                designationId: data.designationId,
                photoId: photoId || undefined
            }
        });
    }

    static async deleteUser(id: string) {
        return await prisma.user.delete({ where: { id } });
    }

    static async transferUser(id: string, branchId: string, designationId?: string, remarks?: string) {
        return await prisma.user.update({
            where: { id },
            data: {
                branchId,
                designationId: designationId || undefined
            }
        });
    }
}
