import xlsx from 'xlsx';
import { BusinessSnapshotService } from './BusinessSnapshotService';
import { MisStatus } from '../types/mis';
import { RuleEngine } from './RuleEngine';
import prisma from '../lib/prisma';
import { getFYRange } from '../utils/fyUtils';



const CRITERIA_PARAM_MAP: Record<string, string> = {
    'Total Dep': 'TOTAL_DEPOSITS',
    'Adv': 'TOTAL_ADVANCES',
    'Business': 'TOTAL_BUSINESS',
    'Recovery': 'TOTAL_RECOVERY',
    'CASA': 'CASA',
    'NPA': 'GROSS_NPA',
    'SB': 'SB_DEPOSITS',
    'CD': 'CD_DEPOSITS',
    'TD': 'TD_DEPOSITS',
    'Core Ret': 'CORE_RETAIL',
    'Mudra': 'MUDRA',
    'MSME': 'MSME',
    'Core Agri': 'CORE_AGRI',
    'Ret_TD': 'RET_TD',
    'Cash_Total': 'CASH_TOTAL',
    'Cash_CRL': 'CASH_CRL',
    'Cash_Excess': 'CASH_EXCESS'
};

/**
 * Greedy header normalization for resilient mapping.
 * Removes all whitespace, special characters, and converts to uppercase.
 * e.g., "Total Cash" -> "TOTALCASH", "Cash on hand" -> "CASHONHAND"
 */
function normalizeHeader(h: string): string {
    return (h || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

const MAPPING: Record<string, string> = {
    'MUDRA': 'Mudra',
    'AGRIJL': 'Agri_JL',
    'RETAILJL': 'Ret-Gold',
    'GOLD': 'Gold',
    'HOUSING': 'HL',
    'VEHICLE': 'VL',
    'PERSONALLOAN': 'PersonalLoan',
    'MORTGAGE': 'Mort',
    'EDUCATION': 'EL',
    'LIQUIRENT': 'Liq',
    'OTHERRETAIL': 'OthRet',
    'TOTALRETAIL': 'Tot_Retail',
    'MSME': 'MSME',
    'SHG': 'SHG',
    'KCC': 'KCC',
    'GOVTSPON': 'Gov',
    'OTHSCHEMATIC': 'OthSch',
    'COREAGRI': 'Core Agri',
    'CORERETAIL': 'Core Ret',
    'CORERET': 'Core Ret',
    'NPA': 'NPA',
    'SB': 'SB',
    'CD': 'CD',
    'TD': 'TD',
    'ADV': 'Adv',
    'CASHONHAND': 'Cash_Total',
    'CASHONH': 'Cash_Total',
    'ATMCASH': 'Cash_ATM',
    'BCCASH': 'Cash_BC',
    'BNACASH': 'Cash_BNA',
    'TOTALCASH': 'Cash_Total',
    'CASHPOS': 'Cash_Total',
    'POSSESSION': 'Cash_Total',
    'CASHPOSSESSION': 'Cash_Total',
    'CASH': 'Cash_Total',
    'CASHBALANCE': 'Cash_Total',
    'CDRATIO': 'CD_Ratio',
    'CRL': 'Cash_CRL',
    'CASHRETENTIONLIMIT': 'Cash_CRL',
    'RETENTIONLIMIT': 'Cash_CRL',
    'CASHREQUIREDLEVEL': 'Cash_CRL',
    'AUTHORIZEDCASH': 'Cash_CRL',
    'RETENTION': 'Cash_CRL',
    'EXCESS': 'Cash_Excess',
    'EXCESSCASH': 'Cash_Excess',
    'CASHEXCESS': 'Cash_Excess',
    'BULKDEP': 'Bulk_Dep',
    'RETTD': 'Ret_TD',
    'RTDS': 'Ret_TD',
    'RTD': 'Ret_TD',
    'PL': 'Branch_PL',
    'RECQ1': 'Rec_Q1',
    'RECQ2': 'Rec_Q2',
    'RECQ3': 'Rec_Q3',
    'RECQ4': 'Rec_Q4'
};


export class MISIngestionService {
    static async processExcel(filePath: string, originalFilename: string) {
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet) as any[];

        const results = {
            processed: 0,
            failed: 0,
            units: new Set<string>(),
            dates: new Set<string>()
        };

        // 1. Pre-fetch Metadata
        const branches = await prisma.branch.findMany();
        const branchMap = Object.fromEntries(branches.map(b => [b.code, b]));
        const parameters = await prisma.parameter.findMany();
        const parameterMap = Object.fromEntries(parameters.map(p => [p.code, p]));

        // 2. Create Batch Import Log
        const importLog = await prisma.misImportLog.create({
            data: {
                filename: originalFilename,
                status: 'PROCESSING',
                processedUnits: 0,
                failedUnits: 0,
                uniqueDates: []
            }
        });

        // 3. Group rows by Business Date
        const dataByDate: Record<string, any[]> = {};
        for (const row of data) {
            const dateRaw = String(row['DATE'] || '');
            if (!dateRaw) continue;
            if (!dataByDate[dateRaw]) dataByDate[dateRaw] = [];
            dataByDate[dateRaw].push(row);
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const getPeriodKey = (d: Date) => `${months[d.getUTCMonth()]}-${d.getUTCFullYear().toString().slice(-2)}`;

        for (const [dateRaw, rows] of Object.entries(dataByDate)) {
            const year = parseInt(dateRaw.substring(0, 4));
            const month = parseInt(dateRaw.substring(4, 6)) - 1;
            const day = parseInt(dateRaw.substring(6, 8));
            const businessDate = new Date(Date.UTC(year, month, day));
            results.dates.add(businessDate.toISOString().split('T')[0]);

            const periodKey = getPeriodKey(businessDate);
            const snapshotsToPopulate: { id: string, unitId: string }[] = [];

            await prisma.$transaction(async (tx) => {
                const logsToCreate = [];
                const factsToCreate = [];
                const affectedUnitIds = new Set<string>();

                for (const row of rows) {
                    const solRaw = String(row['SOL'] || '');
                    const sol = solRaw.padStart(4, '0');
                    if (!sol || sol === '0000') continue;

                    const branch = branchMap[sol];
                    if (!branch) {
                        results.failed++;
                        continue;
                    }

                    affectedUnitIds.add(branch.id);

                    // 1. Log entry for this unit/date
                    const log = await tx.ingestionLog.create({
                        data: {
                            unitId: branch.id,
                            status: 'PROCESSED',
                            filename: originalFilename,
                            importLogId: importLog.id,
                            meta: { source: 'MIS_BATCH_OPTIMIZED' }
                        }
                    });

                    // 2. Parse Metric Data
                    let coreRetSum = 0;
                    const coreRetConstituents = ['EL', 'VL', 'OthRet', 'Mort', 'Liq', 'HL', 'PersonalLoan'];
                    let sb = 0, cd = 0, td = 0, adv = 0, npaVal = 0, bulkDep = 0, retTd = 0;

                    const recQ1 = Number(row['Rec Q1'] || 0);
                    const recQ2 = Number(row['Rec Q2'] || 0);
                    const recQ3 = Number(row['Rec Q3'] || 0);
                    const recQ4 = Number(row['Rec Q4'] || 0);
                    const rawTotalRec = recQ1 + recQ2 + recQ3 + recQ4;

                    const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(branch.type?.toUpperCase() || '') || branch.code === '3933';
                    const scaledTotalRec = isRegional ? rawTotalRec : rawTotalRec / 100;

                    // DEEP-TRACE LOGGING: Print exact headers found to detect hidden characters/spaces
                    const currentHeaders = Object.keys(row);
                    console.log(`\n[DEEP-TRACE] Unit: ${branch.code} | Date: ${dateRaw}`);
                    console.log(`[DEEP-TRACE] Found ${currentHeaders.length} headers:`, currentHeaders.map(h => `'${h}'`).join(', '));

                    for (const [rawHeader, rawValue] of Object.entries(row)) {
                        const normalizedLabel = normalizeHeader(rawHeader);
                        const paramName = MAPPING[normalizedLabel] || MAPPING[rawHeader.trim()]; // Fallback to trim for safe transition
                        if (paramName) {
                            let val = Number(rawValue || 0);
                            if (!isRegional) {
                                val /= 100;
                            }

                            factsToCreate.push({
                                unitId: branch.id,
                                date: businessDate,
                                metric: paramName,
                                value: val,
                                ingestionId: log.id
                            });

                            if (coreRetConstituents.includes(paramName)) coreRetSum += val;
                            if (paramName === 'SB') sb = val;
                            if (paramName === 'CD') cd = val;
                            if (paramName === 'TD') td = val;
                            if (paramName === 'Ret_TD') retTd = val;
                            if (paramName === 'Bulk_Dep') bulkDep = val;
                            if (paramName === 'Adv') adv = val;
                            if (paramName === 'NPA') npaVal = val;
                        }
                    }

                    // Calculate Ret TD if not provided explicitly but we have TD and Bulk
                    if (retTd === 0 && td > 0 && bulkDep > 0) {
                        retTd = td - bulkDep;
                    }

                    const casa = sb + cd;
                    const totalDep = casa + td;
                    const casaPct = totalDep > 0 ? (casa / totalDep) * 100 : 0;

                    factsToCreate.push(
                        { unitId: branch.id, date: businessDate, metric: 'Core Ret', value: coreRetSum, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'CASA', value: casa, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'Total Dep', value: totalDep, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'Ret_TD', value: retTd, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'CASA%', value: casaPct, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'CD_Ratio', value: totalDep > 0 ? (adv / totalDep) * 100 : 0, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'Bus', value: totalDep + adv, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'Recovery', value: scaledTotalRec, ingestionId: log.id }
                    );

                    // Auto-register All Parameters to ensure visibility in Business Snapshots
                    const metricsToRegister = [...new Set(factsToCreate.map(f => f.metric))];
                    for (const metricName of metricsToRegister) {
                        const isCash = metricName.startsWith('Cash_');
                        const isCore = ['Core Ret', 'MSME', 'Core Agri', 'Gold', 'Core Adv', 'Core_Adv'].includes(metricName);
                        
                        await tx.misParameterRegistry.upsert({
                            where: { parameterName: metricName },
                            update: {},
                            create: {
                                parameterName: metricName,
                                displayName: metricName.replace(/_/g, ' '),
                                category: isCash ? 'CASH' : (isCore ? 'CORE_ADVANCES' : 'GENERAL'),
                                isEnabled: true,
                                orderIndex: isCash ? 300 : (isCore ? 100 : 500)
                            }
                        });
                    }

                    // 3. Modern Snapshot Header
                    const snap = await tx.misSnapshot.upsert({
                        where: { unitId_businessDate_version: { unitId: branch.id, businessDate, version: 1 } },
                        create: { unitId: branch.id, businessDate, status: MisStatus.PROVISIONAL, version: 1 },
                        update: { status: MisStatus.PROVISIONAL }
                    });
                    snapshotsToPopulate.push({ id: snap.id, unitId: branch.id });

                    // 4. Legacy Snapshots (for letter criteria) 
                    // Automatically generate legacy snapshots for ALL metrics that have a defined Parameter
                    // If Parameter is missing, we auto-create it to ensure letter generation coverage
                    for (const [metricName, val] of Object.entries(factsToCreate.reduce((acc, f) => ({ ...acc, [f.metric]: f.value }), {}))) {
                        // FILTER: Only generate snapshots for primary performance letters
                        // We skip quarterly recovery figures and branch P&L to keep lists clean
                        if (['Rec_Q1', 'Rec_Q2', 'Rec_Q3', 'Rec_Q4', 'Branch_PL'].includes(metricName as string)) {
                            continue;
                        }

                        const paramCode = CRITERIA_PARAM_MAP[metricName as string] || (metricName as string).toUpperCase().replace(/ /g, '_').replace(/%/g, '_PCT').replace(/-/g, '_');
                        
                        let param = parameterMap[paramCode];
                        if (!param) {
                            param = await tx.parameter.upsert({
                                where: { code: paramCode },
                                update: {},
                                create: {
                                    code: paramCode,
                                    nameEn: (metricName as string).replace(/_/g, ' '),
                                    category: (metricName as string).includes('Rec') ? 'RECOVERY' : 
                                              (['SB', 'CD', 'TD', 'Total Dep', 'CASA', 'Ret_TD', 'RET_TD', 'Bulk_Dep', 'RTD'].includes(metricName as string) ? 'DEPOSITS' : 'ADVANCES'),
                                    unit: (metricName as string).includes('%') || (metricName as string).includes('Ratio') ? '%' : 'Cr'
                                }
                            });
                            parameterMap[paramCode] = param; // Cache it
                        }

                        const budget = await tx.budgetMaster.findFirst({
                            where: { solId: branch.code, parameterName: metricName as string, periodKey, isActive: true }
                        });
                        const budVal = budget ? Number(budget.targetValue) : null;

                        const { start: fyStart } = getFYRange(businessDate);
                        const baselineDate = new Date(fyStart.getTime() - 86400000);
                        const baseline = await tx.snapshot.findFirst({
                            where: { branchId: branch.id, parameterId: param.id, date: baselineDate }
                        });
                        const baselineVal = baseline ? baseline.value : 0;

                        let status = 'NEUTRAL';
                        if (budVal !== null && (val as number) > budVal) status = 'SURPASSED';
                        else if ((val as number) > Number(baselineVal)) status = 'POSITIVE';
                        else if ((val as number) < Number(baselineVal)) status = 'NEGATIVE';

                        const existingSnap = await tx.snapshot.findFirst({
                            where: { branchId: branch.id, parameterId: param.id, date: businessDate }
                        });

                        if (existingSnap) {
                            await tx.snapshot.update({
                                where: { id: existingSnap.id },
                                data: { value: val as number, budget: budVal, status }
                            });
                        } else {
                            await tx.snapshot.create({
                                data: { branchId: branch.id, parameterId: param.id, date: businessDate, value: val as number, budget: budVal, status }
                            });
                        }
                    }

                    results.processed++;
                    results.units.add(sol);
                }

                // Bulk Fact Ingestion
                if (factsToCreate.length > 0) {
                    await tx.fact.deleteMany({ where: { unitId: { in: Array.from(affectedUnitIds) }, date: businessDate } });
                    await tx.fact.createMany({ data: factsToCreate });
                }

                // Batch Population
                await BusinessSnapshotService.populatePanelsBatch(tx, snapshotsToPopulate, businessDate);
            }, { timeout: 60000 }); // Increase timeout for massive batches

            // Once Panels are fully committed to database, we evaluate the rules
            if (snapshotsToPopulate.length > 0) {
                await RuleEngine.evaluateBatch(snapshotsToPopulate.map(s => s.id));
            }
        }

        // Finalize Import Log
        await prisma.misImportLog.update({
            where: { id: importLog.id },
            data: {
                status: 'SUCCESS',
                processedUnits: results.processed,
                failedUnits: results.failed,
                uniqueDates: Array.from(results.dates)
            }
        });

        return {
            success: true,
            importId: importLog.id,
            processedCount: results.processed,
            failedCount: results.failed,
            uniqueUnits: results.units.size,
            uniqueDates: Array.from(results.dates)
        };
    }

    static async deleteImport(importId: string) {
        // 1. Find all ingestion logs for this import to get units and dates
        const logs = await prisma.ingestionLog.findMany({
            where: { importLogId: importId },
            include: { branch: true }
        });

        const importLog = await prisma.misImportLog.findUnique({
            where: { id: importId }
        });

        const logIds = logs.map(l => l.id);
        const logFacts = await prisma.fact.findMany({
            where: { ingestionId: { in: logIds } },
            select: { date: true },
            distinct: ['date']
        });

        await prisma.$transaction(async (tx) => {
            const logDates = logFacts.map(f => f.date.toISOString());
            const importDates = importLog?.uniqueDates.map(d => new Date(d).toISOString()) || [];
            const allDates = [...new Set([...logDates, ...importDates])].map(d => new Date(d));
            const unitIds = logs.map(l => l.unitId);

            if (unitIds.length > 0 && allDates.length > 0) {
                // 2. Identify and delete snapshots and their dependents
                const snapshots = await tx.misSnapshot.findMany({
                    where: {
                        unitId: { in: unitIds },
                        businessDate: { in: allDates }
                    },
                    select: { id: true }
                });
                const snapshotIds = snapshots.map(s => s.id);

                if (snapshotIds.length > 0) {
                    await tx.misInformationPanel.deleteMany({
                        where: { snapshotId: { in: snapshotIds } }
                    });

                    await tx.misException.deleteMany({
                        where: { snapshotId: { in: snapshotIds } }
                    });

                    await tx.misSnapshot.deleteMany({
                        where: { id: { in: snapshotIds } }
                    });
                }
            }

            // 3. Delete facts and logs
            const logIds = logs.map(l => l.id);
            if (logIds.length > 0) {
                await tx.fact.deleteMany({
                    where: { ingestionId: { in: logIds } }
                });

                await tx.ingestionLog.deleteMany({
                    where: { id: { in: logIds } }
                });
            }

            // 4. Delete the import log itself
            await tx.misImportLog.delete({
                where: { id: importId }
            });
        });

        return { success: true };
    }
}
