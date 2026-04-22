import prisma from '../lib/prisma';

/**
 * Infrastructure Layer: Low-level data access for Internal Notes.
 */
export class InternalNoteRepository {
    static async create(data: any) {
        return await prisma.internalNote.create({
            data: {
                refNo: data.refNo,
                department: data.department,
                departmentTa: data.departmentTa || '',
                departmentHi: data.departmentHi || '',
                subject: data.subject,
                classification: data.classification,
                createdBy: data.createdBy,
                bodyHtml: data.bodyHtml,
                fileUrl: data.fileUrl || ''
            }
        });
    }

    static async findById(id: string) {
        return await prisma.internalNote.findUnique({ where: { id } });
    }

    static async findAll() {
        return await prisma.internalNote.findMany({ orderBy: { createdAt: 'desc' } });
    }

    static async updateFileUrl(id: string, fileUrl: string) {
        return await prisma.internalNote.update({
            where: { id },
            data: { fileUrl }
        });
    }
}
