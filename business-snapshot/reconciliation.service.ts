import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ReconciliationReport {
    targetId: string;
    targetType: 'BATCH' | 'RUN' | 'SNAPSHOT';
    sourceCount: number;
    destinationCount: number;
    discrepancy: number;
    isBalanced: boolean;
    timestamp: Date;
}

@Injectable()
export class ReconciliationService {
    private readonly logger = new Logger(ReconciliationService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Reconcile an Ingestion Batch (IngestionRow vs FactTable)
     */
    async reconcileBatch(batchId: string): Promise<ReconciliationReport> {
        const batch = await this.prisma.ingestionBatch.findFirst({
            where: { id: batchId },
            include: { _count: { select: { rows: true } } }
        });

        if (!batch) throw new Error(`Batch ${batchId} not found`);

        // Count promoted facts in FactTable (this is tricky as one row might map to multiple measures or vice versa)
        // For simplicity, we assume 1 IngestionRow = 1 FactTable entry in our current FactLoader impl.
        // If it's multi-measure, we would check JSON properties.
        const promotedCount = await this.prisma.factTable.count({
            // This is actually hard without a direct link, but we can query by Run + Date if needed
            // However, our FactTable doesn't have a batchId.
            // In a real bank-grade system, we'd add batchId to FactTable or use a linking table.

            // For now, let's use the Metadata provided in ingestionRow status
            where: {
                // Placeholder: In a real impl, we'd query by audit metadata or tags
                unitId: (batch as any).run?.unitId,
                date: (batch as any).run?.businessDate
            }
        });

        const report: ReconciliationReport = {
            targetId: batchId,
            targetType: 'BATCH',
            sourceCount: batch._count.rows,
            destinationCount: promotedCount,
            discrepancy: batch._count.rows - promotedCount,
            isBalanced: batch._count.rows === promotedCount,
            timestamp: new Date()
        };

        this.logger.log(`Reconciliation for Batch ${batchId}: Balanced=${report.isBalanced}, Discrepancy=${report.discrepancy}`);
        return report;
    }

    /**
     * Reconcile a Snapshot (FactTable vs FactSnapshot)
     */
    async reconcileSnapshot(snapshotId: string): Promise<ReconciliationReport> {
        const snapshot = await this.prisma.snapshotVersion.findUnique({
            where: { id: snapshotId },
            include: { _count: { select: { facts: true } } }
        });

        if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`);

        // Count Current Live Facts for this date
        const liveCount = await this.prisma.factTable.count({
            where: {
                date: snapshot.businessDate,
                isCurrent: true
            }
        });

        const report: ReconciliationReport = {
            targetId: snapshotId,
            targetType: 'SNAPSHOT',
            sourceCount: liveCount,
            destinationCount: snapshot._count.facts,
            discrepancy: liveCount - snapshot._count.facts,
            isBalanced: liveCount === snapshot._count.facts,
            timestamp: new Date()
        };

        return report;
    }
}
