import prisma from '../lib/prisma';
import { parseCSV } from '../utils/csv';
import * as crypto from 'crypto';



export interface BudgetCSVRow {
    SOL: string;
    PARAMETER: string;
    [key: string]: string | undefined;
}

export class BudgetService {
    private static paramCache: Set<string> = new Set();

    /**
     * Processes Budget CSV data with version control and audit history.
     */
    static async processBudgets(csvContent: string, uploaderId?: string, filename?: string) {
        const records = parseCSV<BudgetCSVRow>(csvContent);
        if (records.length === 0) return { total: 0, processed: 0, errors: 0 };

        const checksum = crypto.createHash('md5').update(csvContent).digest('hex');
        const batchId = crypto.randomUUID();

        // 1. Create Import Log
        await prisma.budgetImportLog.create({
            data: {
                id: batchId,
                filename: filename || 'unknown.csv',
                checksum,
                uploaderId,
                totalRows: records.length,
                validRows: 0,
                errorRows: 0,
                status: 'PROCESSING'
            }
        });

        // 2. Identify Month Columns
        const headers = Object.keys(records[0]);
        const monthColumns = headers.filter(h =>
            h !== 'SOL' &&
            h !== 'PARAMETER' &&
            !h.startsWith('_') &&
            h.trim().length > 0
        );

        const results = { total: records.length, processed: 0, errors: 0 };

        // 3. Process in batches for performance
        const rowBatchSize = 25; // Balanced batch size
        for (let i = 0; i < records.length; i += rowBatchSize) {
            const batch = records.slice(i, i + rowBatchSize);

            await Promise.all(batch.map(async (row) => {
                try {
                    let solId = row.SOL?.trim();
                    const paramName = row.PARAMETER?.trim();

                    if (!solId || !paramName) {
                        results.errors++;
                        return;
                    }

                    solId = this.padSolId(solId);

                    // Optimized: Only upsert registry if not in local cache
                    if (!this.paramCache.has(paramName)) {
                        await prisma.misParameterRegistry.upsert({
                            where: { parameterName: paramName },
                            update: {},
                            create: {
                                parameterName: paramName,
                                displayName: paramName.replace(/_/g, ' '),
                                category: 'BUDGET',
                                isEnabled: true,
                                createdFromBudgetFlag: true
                            }
                        });
                        this.paramCache.add(paramName);
                    }

                    // Process all months for this row in parallel
                    await Promise.all(monthColumns.map(async (period) => {
                        const rawValue = row[period] || '0';
                        const targetValue = this.normalizeValue(rawValue);
                        const effectiveDate = this.parsePeriod(period);

                        const existing = await prisma.budgetMaster.findUnique({
                            where: {
                                parameterName_solId_periodKey: {
                                    parameterName: paramName,
                                    solId,
                                    periodKey: period
                                }
                            }
                        });

                        if (existing) {
                            if (!existing.targetValue.equals(targetValue)) {
                                await prisma.$transaction([
                                    prisma.budgetHistory.create({
                                        data: {
                                            parameterName: existing.parameterName,
                                            solId: existing.solId,
                                            periodKey: existing.periodKey,
                                            effectiveDate,
                                            targetValue: existing.targetValue,
                                            versionNo: existing.versionNo,
                                            sourceBatchId: existing.sourceBatchId,
                                            changeType: 'UPDATE'
                                        }
                                    }),
                                    prisma.budgetMaster.update({
                                        where: { id: existing.id },
                                        data: {
                                            targetValue,
                                            effectiveDate,
                                            versionNo: existing.versionNo + 1,
                                            sourceBatchId: batchId,
                                            isActive: true
                                        }
                                    })
                                ]);
                            }
                        } else {
                            await prisma.$transaction([
                                prisma.budgetMaster.create({
                                    data: {
                                        parameterName: paramName,
                                        solId,
                                        periodKey: period,
                                        effectiveDate,
                                        targetValue,
                                        versionNo: 1,
                                        sourceBatchId: batchId,
                                        isActive: true
                                    }
                                }),
                                prisma.budgetHistory.create({
                                    data: {
                                        parameterName: paramName,
                                        solId,
                                        periodKey: period,
                                        effectiveDate,
                                        targetValue,
                                        versionNo: 1,
                                        sourceBatchId: batchId,
                                        changeType: 'INSERT'
                                    }
                                })
                            ]);
                        }
                    }));

                    results.processed++;
                } catch (err) {
                    console.error('Error processing budget row:', err);
                    results.errors++;
                }
            }));
        }

        // Update import log with final stats
        await prisma.budgetImportLog.update({
            where: { id: batchId },
            data: {
                validRows: results.processed,
                errorRows: results.errors,
                status: 'SUCCESS'
            }
        });

        return results;
    }

    private static normalizeValue(val: string): number {
        if (!val) return 0;
        const clean = val.replace(/,/g, '').replace(/-/g, '0').trim();
        return parseFloat(clean) || 0;
    }

    private static padSolId(sol: string | number): string {
        if (sol === null || sol === undefined) return '';
        return sol.toString().padStart(4, '0');
    }

    private static parsePeriod(period: string): Date {
        const [mmm, yy] = period.toUpperCase().split('-');
        const months: { [key: string]: number } = {
            'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
            'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
        };
        const year = 2000 + parseInt(yy);
        const month = months[mmm] !== undefined ? months[mmm] : 0;
        return new Date(year, month, 1);
    }
}
