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
    private static readonly SOL_HEADER_ALIASES = new Set([
        'sol', 'sol id', 'solid', 'branch code', 'branchcode', 'branch'
    ]);
    private static readonly DATE_HEADER_ALIASES = new Set([
        'date', 'business date', 'businessdate', 'as on', 'ason'
    ]);

    private static parseVal(v: any): number {
        if (typeof v === 'number') return v;
        if (!v) return 0;
        // Remove commas and other non-numeric symbols but keep decimals and signs
        const cleaned = String(v).replace(/[^\d.-]/g, '');
        return Number(cleaned) || 0;
    }

    private static parseBusinessDate(raw: any): Date {
        if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
            return toUTCDate(raw);
        }

        if (typeof raw === 'number' && Number.isFinite(raw)) {
            // Excel serial date (days since 1899-12-30)
            const parsed = (xlsx as any).SSF?.parse_date_code?.(raw);
            if (parsed && parsed.y && parsed.m && parsed.d) {
                return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
            }
            return toUTCDate(new Date(Math.round((raw - 25569) * 86400 * 1000)));
        }

        const str = String(raw || '').trim();
        if (/^\d{8}$/.test(str)) {
            const y = Number(str.slice(0, 4));
            const m = Number(str.slice(4, 6));
            const d = Number(str.slice(6, 8));
            return new Date(Date.UTC(y, m - 1, d));
        }

        return toUTCDate(str);
    }

    private static findKey(row: Record<string, any>, aliases: Set<string>): string | undefined {
        return Object.keys(row).find((k) => aliases.has(k.trim().toLowerCase()));
    }

    private static getGroupKey(unitId: string, businessDate: Date): string {
        return `${unitId}::${businessDate.toISOString().split('T')[0]}`;
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

        const groupedFacts = new Map<string, { unitId: string; date: Date; factMap: Record<string, number> }>();
        for (const row of data as any[]) {
            const solKey = this.findKey(row, this.SOL_HEADER_ALIASES);
            const dateKey = this.findKey(row, this.DATE_HEADER_ALIASES);
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

            const businessDate = this.parseBusinessDate(row[dateKey]);
            if (Number.isNaN(businessDate.getTime())) {
                logger.warn('INGEST_INVALID_DATE', { rawDate: row[dateKey], sol: branchCode });
                skippedCount++;
                continue;
            }
            foundDates.add(businessDate.toISOString().split('T')[0]);

            const rowFacts: Record<string, number> = {};
            Object.entries(row).forEach(([k, v]) => {
                if (k === solKey || k === dateKey) return;
                const metricCode = MetricMapper.map(k);
                if (metricCode === null) return;
                const val = this.parseVal(v);
                if (val !== 0) rowFacts[metricCode] = val;
            });

            const groupKey = this.getGroupKey(branch.id, businessDate);
            const grouped = groupedFacts.get(groupKey) || { unitId: branch.id, date: businessDate, factMap: {} };
            for (const [metric, value] of Object.entries(rowFacts)) {
                grouped.factMap[metric] = (grouped.factMap[metric] || 0) + value;
            }
            groupedFacts.set(groupKey, grouped);
        }

        await prisma.$transaction(async (tx) => {
            for (const grouped of groupedFacts.values()) {
                const factMap = { ...grouped.factMap };
                const calculated = MetricMapper.getCalculatedMetrics(factMap);
                Object.entries(calculated).forEach(([m, v]) => {
                    if (v !== 0) factMap[m] = v;
                });

                const facts = Object.entries(factMap).map(([metric, value]) => ({
                    unitId: grouped.unitId,
                    date: grouped.date,
                    metric,
                    value,
                    ingestionId: importId
                }));

                if (facts.length === 0) {
                    skippedCount++;
                    continue;
                }

                const ingestion = await tx.ingestionLog.create({
                    data: {
                        unitId: grouped.unitId,
                        status: 'SUCCESS',
                        filename: originalFilename,
                        importLogId: importId
                    }
                });

                const factsWithIngestion = facts.map((f) => ({
                    ...f,
                    ingestionId: ingestion.id
                }));

                await tx.fact.deleteMany({
                    where: { unitId: grouped.unitId, date: grouped.date }
                });
                await tx.fact.createMany({ data: factsWithIngestion });
                processedCount++;
            }
        }, { timeout: 120000 }); // Larger window for heavy MIS batches

        // Trigger Auto-Snapshot Generation to ensure dashboards are updated immediately
        for (const dateStr of foundDates) {
            try {
                await SnapshotBuilder.generateDailySnapshots(dateStr);
            } catch (err: any) {
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
