import xlsx from 'xlsx';
import prisma from '../lib/prisma';
import { toUTCDate } from '../utils/businessUtils';
import { logger } from '../utils/logger';
import { MetricMapper } from './MetricMapper';

/**
 * Infrastructure Layer: Logic for processing MIS Excel files and ingesting into Fact table.
 */
export class MISIngester {
    public static async ingestData(filePath: string, importId: string) {
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

                const branchCode = String(row[solKey]).trim();
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
                    const val = Number(v) || 0;
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
                        importId
                    });
                });

                if (facts.length > 0) {
                    // Clean previous attempts for this branch/date to ensure idempotent ingestion
                    await tx.fact.deleteMany({
                        where: { unitId: branch.id, date: businessDate }
                    });
                    await tx.fact.createMany({ data: facts });
                    processedCount++;
                }
            }
        }, { timeout: 30000 }); // Increase timeout for large files

        return { processedCount, skippedCount, uniqueDates: Array.from(foundDates) };
    }
}
