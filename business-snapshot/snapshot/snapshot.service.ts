import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MisFrequency, DataQualityStatus } from '../../prisma/enums';

@Injectable()
export class SnapshotService {
    private readonly logger = new Logger(SnapshotService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Create a point-in-time snapshot of the current facts
     */
    async createSnapshot(businessDate: Date, frequency: MisFrequency) {
        this.logger.log(`Creating ${frequency} Snapshot for ${businessDate.toISOString()}`);

        const dateOnly = new Date(businessDate.toISOString().split('T')[0]);

        // 1. Determine Version (Auto-increment)
        const lastSnapshot = await this.prisma.snapshotVersion.findFirst({
            where: { businessDate: dateOnly, frequency },
            orderBy: { version: 'desc' }
        });

        const nextVersion = (lastSnapshot?.version || 0) + 1;

        // 2. Fetch all "Current" facts for this date
        const currentFacts = await this.prisma.factTable.findMany({
            where: {
                date: dateOnly,
                isCurrent: true
            }
        });

        if (currentFacts.length === 0) {
            this.logger.warn(`No current facts found for ${dateOnly.toISOString()}. Snapshot aborted.`);
            return null;
        }

        // 3. Persist Snapshot (Atomic)
        return this.prisma.$transaction(async (tx) => {
            const snapshot = await tx.snapshotVersion.create({
                data: {
                    businessDate: dateOnly,
                    frequency,
                    version: nextVersion,
                    status: DataQualityStatus.VALIDATED,
                    snapshotMeta: { factCount: currentFacts.length }
                }
            });

            // Bulk Copy to FactSnapshot
            await tx.factSnapshot.createMany({
                data: currentFacts.map(f => ({
                    snapshotId: snapshot.id,
                    unitId: f.unitId,
                    type: f.type,
                    measures: f.measures as any
                }))
            });

            this.logger.log(`Snapshot ${snapshot.id} created with ${currentFacts.length} facts.`);
            return snapshot;
        });
    }

    /**
     * Retrieve facts from a specific snapshot version
     */
    async getSnapshotFacts(snapshotId: string) {
        return this.prisma.factSnapshot.findMany({
            where: { snapshotId },
            include: { unit: { select: { code: true, name: true } } }
        });
    }

    /**
     * Get latest snapshot version for a date
     */
    async getLatestSnapshot(date: Date, frequency: MisFrequency) {
        const dateOnly = new Date(date.toISOString().split('T')[0]);
        return this.prisma.snapshotVersion.findFirst({
            where: { businessDate: dateOnly, frequency },
            orderBy: { version: 'desc' },
            include: { _count: { select: { facts: true } } }
        });
    }
}
