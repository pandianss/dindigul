import prisma from '../lib/prisma';
import { toUTCDate } from '../utils/businessUtils';
import { logger } from '../utils/logger';

/**
 * Infrastructure Layer: Data access for Snapshots (legacy MIS snapshots).
 */
export class SnapshotRepository {
    
    static async getByDate(date: string) {
        const businessDate = toUTCDate(date);
        return await prisma.misSnapshot.findMany({
            where: { businessDate },
            include: {
                branch: true,
                panelData: { include: { registry: true } },
                exceptions: true
            }
        });
    }

    static async getSnapshot(branchCode: string, date: string) {
        const businessDate = toUTCDate(date);
        logger.info('FETCH_SNAPSHOT_QUERY', { branchCode, businessDate: businessDate.toISOString() });
        const dayStart = businessDate;
        const dayEnd = new Date(dayStart.getTime() + 86400000);

        return await prisma.misSnapshot.findFirst({
            where: {
                branch: { code: branchCode },
                businessDate: {
                    gte: dayStart,
                    lt: dayEnd
                }
            },
            include: {
                branch: true,
                panelData: { include: { registry: true } },
                exceptions: true
            }
        });
    }

    static async freeze(snapshotId: string) {
        return await prisma.misSnapshot.update({
            where: { id: snapshotId },
            data: { status: 'FROZEN' }
        });
    }

    static async deleteByImportId(importId: string) {
        // Delete the import log record itself
        await prisma.misImportLog.delete({
            where: { id: importId }
        });
        return { success: true };
    }
}

