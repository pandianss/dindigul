import xlsx from 'xlsx';
import prisma from '../lib/prisma';
import { toUTCDate, formatSolId } from '../utils/businessUtils';
import { logger } from '../utils/logger';
import { MetricMapper } from './MetricMapper';
import { SnapshotBuilder } from '../services/SnapshotBuilder';

/**
 * Infrastructure Layer: Logic for processing MIS Excel files and ingesting into Fact table.
 */
export class MISIngester {
    private static parseVal(v: any): number {
        if (typeof v === 'number') return v;
        if (!v) return 0;
        // Remove commas and other non-numeric symbols but keep decimals and signs
        const cleaned = String(v).replace(/[^\d.-]/g, '');
        return Number(cleaned) || 0;
    }

    public static async ingestData(filePath: string, importId: string, originalFilename: string = 'MIS_EXPORT') {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        logger.info('INGEST_START', { rows: data.length, importId });

        const foundDates = new Set<string>();
        let processedCount = 0;
        let skippedCount = 0;

        // Cache branches for performance
        const branches = await prisma.branch.findMany();
        const branchMap = new Map(branches.map(b => [b.code, b]));

        await prisma.$transaction(async (tx) => {
            for (const row of data as any[]) {
                // Find keys (case-insensitive and trimmed)
                const solKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'sol');
                const dateKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'date');
                
                if (!solKey || !dateKey) {
                    skippedCount++;
                    continue;
                }

                const branchCode = formatSolId(row[solKey]);
                const branch = branchMap.get(branchCode);
                
                if (!branch) {
                    logger.warn('INGEST_BRANCH_MISSING', { sol: branchCode });
                    skippedCount++;
                    continue;
                }

                const businessDate = toUTCDate(row[dateKey]);
                foundDates.add(businessDate.toISOString().split('T')[0]);

                const facts: any[] = [];
                const factMap: Record<string, number> = {};

                // 1. Map raw keys to normalized metric codes
                Object.entries(row).forEach(([k, v]) => {
                    if (k === solKey || k === dateKey) return;
                    
                    const metricCode = MetricMapper.map(k);
                    if (metricCode === null) return;
                    
                    const val = this.parseVal(v);
                    if (val !== 0) factMap[metricCode] = val;
                });

                // 2. Inject calculated metrics (SSOT)
                const calculated = MetricMapper.getCalculatedMetrics(factMap);
                Object.entries(calculated).forEach(([m, v]) => {
                    if (v !== 0) factMap[m] = v;
                });

                // 3. Persist to Fact table
                Object.entries(factMap).forEach(([metric, value]) => {
                    facts.push({
                        unitId: branch.id,
                        date: businessDate,
                        metric,
                        value,
                        ingestionId: importId
                    });
                });

                if (facts.length > 0) {
                    // 4. Create per-unit IngestionLog (Child of MisImportLog)
                    const ingestion = await tx.ingestionLog.create({
                        data: {
                            unitId: branch.id,
                            status: 'SUCCESS',
                            filename: originalFilename,
                            importLogId: importId
                        }
                    });

                    // 5. Link facts to this specific ingestion and persist
                    const factsWithIngestion = facts.map(f => ({
                        unitId: f.unitId,
                        date: f.date,
                        metric: f.metric,
                        value: f.value,
                        ingestionId: ingestion.id
                    }));

                    // Clean previous attempts for this branch/date to ensure idempotent ingestion
                    await tx.fact.deleteMany({
                        where: { unitId: branch.id, date: businessDate }
                    });
                    await tx.fact.createMany({ data: factsWithIngestion });
                    processedCount++;
                }
            }
        }, { timeout: 30000 }); // Increase timeout for large files

        // Trigger Auto-Snapshot Generation to ensure dashboards are updated immediately
        for (const dateStr of foundDates) {
            try {
                await SnapshotBuilder.generateDailySnapshots(dateStr);
            } catch (err) {
                logger.error('AUTO_SNAPSHOT_FAILURE', err, { dateStr });
            }
        }

        return { 
            processedUnits: processedCount, 
            skippedUnits: skippedCount, 
            datesFound: Array.from(foundDates) 
        };
    }
}
