
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MisExceptionService {
    private readonly logger = new Logger(MisExceptionService.name);

    constructor(private prisma: PrismaService) { }

    async getExceptions(unitId?: string, status?: string) {
        return this.prisma.misException.findMany({
            where: {
                ...(unitId && { unitId }),
                ...(status && { status })
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
    }

    async acknowledgeException(id: string, userId: string) {
        const exception = await this.prisma.misException.findUnique({ where: { id } });
        if (!exception) throw new NotFoundException('Exception not found');

        return this.prisma.misException.update({
            where: { id },
            data: {
                status: 'ACKNOWLEDGED'
            }
        });
    }

    async resolveException(id: string, userId: string, resolutionNote: string) {
        const exception = await this.prisma.misException.findUnique({ where: { id } });
        if (!exception) throw new NotFoundException('Exception not found');

        // Here we could also link to a Kernel Task if required
        return this.prisma.misException.update({
            where: { id },
            data: {
                status: 'RESOLVED',
                // message: `${exception.message} | Resolution: ${resolutionNote}` // Optional: append to message or use a dedicated field if added to schema
            }
        });
    }
}
