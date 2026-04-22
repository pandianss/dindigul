import prisma from '../lib/prisma';
import { getPaginatedResponse } from '../utils/pagination';

/**
 * Infrastructure Layer: Low-level data access for Letter entities and templates.
 */
export class LetterRepository {
    static async getLetters(user: any, branchId?: string, type?: string, skip: number = 0, take: number = 25, page: number = 1, limit: number = 25) {
        const where: any = {};
        if (type) where.type = type;
        if (branchId) where.branchId = branchId;
        
        // Branch-level isolation
        if (user.role === 'BRANCH_USER') {
            where.branchId = user.branchId;
        }

        const [items, total] = await Promise.all([
            prisma.letter.findMany({
                where,
                include: { branch: true, signatory: true },
                orderBy: { createdAt: 'desc' },
                skip,
                take
            }),
            prisma.letter.count({ where })
        ]);

        return getPaginatedResponse(items, total, page, limit);
    }

    static async getById(id: string) {
        return await prisma.letter.findUnique({
            where: { id },
            include: { branch: true, signatory: true, author: true }
        });
    }

    static async updateStatus(id: string, status: string) {
        return await prisma.letter.update({
            where: { id },
            data: { status }
        });
    }

    static async getTemplates(category?: string) {
        return await prisma.letterTemplate.findMany({
            where: category ? { category } : {}
        });
    }

    static async createTemplate(data: any) {
        return await prisma.letterTemplate.create({ data });
    }
}
