import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DataQualityStatus } from '../../../prisma/enums';

@Injectable()
export class FactLoaderService {
    private readonly logger = new Logger(FactLoaderService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Load facts for a specific Ingestion Run
     */
    async loadFromRun(runId: string) {
        this.logger.log(`Orchestrating Fact Loading for Ingestion Run: ${runId}`);

        // 1. Fetch all Validated Batches in this Run
        const batches = await this.prisma.ingestionBatch.findMany({
            where: { runId, status: 'VALIDATED' }
        });

        if (batches.length === 0) {
            this.logger.warn(`No VALIDATED batches found for Run ${runId}`);
            return 0;
        }

        let totalPromoted = 0;
        for (const batch of batches) {
            const count = await this.promoteBatchToFactTable(batch.id);
            totalPromoted += count;
        }

        // 2. Update Run Status
        await this.prisma.ingestionRun.update({
            where: { id: runId },
            data: {
                status: totalPromoted > 0 ? DataQualityStatus.CANONICAL : DataQualityStatus.REJECTED,
                endTime: new Date()
            }
        });

        return totalPromoted;
    }

    /**
     * Promotes a structured batch to FactTable with dimensional resolution
     */
    private async promoteBatchToFactTable(batchId: string) {
        const batch = await this.prisma.ingestionBatch.findUnique({
            where: { id: batchId },
            include: { run: true }
        });

        if (!batch) throw new BadRequestException(`Batch ${batchId} not found`);

        const unitId = batch.run.unitId;

        // Fetch Validated Rows
        const rows = await this.prisma.ingestionRow.findMany({
            where: { batchId, status: DataQualityStatus.VALIDATED }
        });

        if (rows.length === 0) return 0;

        // Dimensional Resolution Logic
        const factsToAdd: any[] = [];
        for (const row of rows) {
            const rawData: any = row.rawData;

            // Expected structure: { date: string, type: string, measures: { [metricCode]: value } }
            const date = rawData.date ? new Date(rawData.date) : new Date();
            const type = rawData.type || 'GENERAL';
            const measures = rawData.measures || {};

            // Validate Measures against Registry (Optional/Warning for now)
            // In strict mode, we would throw if metric not in MeasureRegistry

            factsToAdd.push({
                unitId: unitId,
                date: date,
                type: type,
                measures: measures as any,
                version: 1,
                isCurrent: true
            });
        }

        // Transactional Write
        await this.prisma.$transaction(async (tx) => {
            await tx.factTable.createMany({
                data: factsToAdd
            });

            // Mark Batch as COMMITTED
            await tx.ingestionBatch.update({
                where: { id: batchId },
                data: { status: 'COMMITTED' }
            });

            // Mark Rows as CANONICAL
            await tx.ingestionRow.updateMany({
                where: { batchId, status: DataQualityStatus.VALIDATED },
                data: { status: DataQualityStatus.CANONICAL }
            });
        });

        return factsToAdd.length;
    }
}
