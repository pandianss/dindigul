import xlsx from 'xlsx';
import { BusinessSnapshotService } from './BusinessSnapshotService';
import { MisStatus } from '../types/mis';
import { RuleEngine } from './RuleEngine';
import prisma from '../lib/prisma';

const CRITERIA_PARAM_MAP: Record<string, string> = {
    'Total Dep': 'TOTAL_DEPOSITS',
    'Adv': 'TOTAL_ADVANCES',
    'CASA': 'CASA',
    'NPA': 'GROSS_NPA'
};

const MAPPING: Record<string, string> = {
    // Advance sub-portfolios
    'MUDRA': 'Mudra',
    'AGRI JL': 'Agri_JL',
    'RETAIL JL': 'Ret-Gold',       // Gold loan advances
    'GOLD': 'Gold',            // Gold loan balance (stock)
    'HOUSING': 'HL',
    'VEHICLE': 'VL',
    'PERSONAL': 'PersonalLoan',    // FIXED: was 'PL' — caused naming collision
    'Personal Loan': 'PersonalLoan', // Alternative header
    'MORTGAGE': 'Mort',
    'EDUCATION': 'EL',
    'LIQUIRENT': 'Liq',
    'OTHER RETAIL': 'OthRet',
    'TOTAL RETAIL': 'Tot_Retail',      // NEW: bank's own combined retail+gold total

    // Priority / Schematic
    'MSME': 'MSME',
    'SHG': 'SHG',
    'KCC': 'KCC',
    'Govt Spon': 'Gov',
    'Oth Schematic': 'OthSch',
    'CORE AGRI': 'Core_Agri',

    // Risk
    'NPA': 'NPA',

    // Deposits
    'SB': 'SB',
    'CD': 'CD',
    'TD': 'TD',

    // Advances total
    'ADV': 'Adv',

    // Cash management (NEW — populated in Mar-2026 files onward; null in older files)
    'Cash on Hand': 'Cash_Hand',
    'ATM Cash': 'Cash_ATM',
    'BC Cash': 'Cash_BC',
    'BNA Cash': 'Cash_BNA',
    'Total Cash': 'Cash_Total',
    'CRL': 'Cash_CRL',        // Cash Required Level (ATM authorized limit)
    'Excess': 'Cash_Excess',     // = Total Cash − CRL

    // Other
    'Bulk Dep': 'Bulk_Dep',        // NEW — Bulk Deposits
    'PL': 'Branch_PL',            // Profit and Loss
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
                    let sb = 0, cd = 0, td = 0, adv = 0, npaVal = 0;

                    for (const [rawHeader, rawValue] of Object.entries(row)) {
                        const paramName = MAPPING[rawHeader.trim()];
                        if (paramName) {
                            // Regional Office data is already in Crores. regular Branch data is in Lakhs.
                            let val = Number(rawValue || 0);
                            if (branch.type === 'BRANCH' || branch.type === 'Branch') {
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
                            if (paramName === 'Adv') adv = val;
                            if (paramName === 'NPA') npaVal = val;
                        }
                    }

                    const casa = sb + cd;
                    const totalDep = casa + td;
                    const casaPct = totalDep > 0 ? (casa / totalDep) * 100 : 0;

                    factsToCreate.push(
                        { unitId: branch.id, date: businessDate, metric: 'Core Ret', value: coreRetSum, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'CASA', value: casa, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'Total Dep', value: totalDep, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'CASA%', value: casaPct, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'CD_Ratio', value: totalDep > 0 ? (adv / totalDep) * 100 : 0, ingestionId: log.id },
                        { unitId: branch.id, date: businessDate, metric: 'Bus', value: totalDep + adv, ingestionId: log.id }
                    );

                    // 3. Modern Snapshot Header
                    const snap = await tx.misSnapshot.upsert({
                        where: { unitId_businessDate_version: { unitId: branch.id, businessDate, version: 1 } },
                        create: { unitId: branch.id, businessDate, status: MisStatus.PROVISIONAL, version: 1 },
                        update: { status: MisStatus.PROVISIONAL }
                    });
                    snapshotsToPopulate.push({ id: snap.id, unitId: branch.id });

                    // 4. Legacy Snapshots (for letter criteria)
                    const subFacts = {
                        'Total Dep': totalDep,
                        'Adv': adv,
                        'CASA': casa,
                        'NPA': npaVal
                    };

                    for (const [factMetric, val] of Object.entries(subFacts)) {
                        const paramCode = CRITERIA_PARAM_MAP[factMetric];
                        const param = parameterMap[paramCode || ''];
                        if (!param) continue;

                        const budget = await tx.budgetMaster.findFirst({
                            where: { solId: branch.code, parameterName: factMetric, periodKey, isActive: true }
                        });
                        const budVal = budget ? Number(budget.targetValue) : null;
                        const status = budVal ? (factMetric === 'NPA' ? (val <= budVal ? 'POSITIVE' : 'NEGATIVE') : (val >= budVal ? 'POSITIVE' : 'NEGATIVE')) : 'NEUTRAL';

                        // Use findFirst + update/create since schema doesn't have the explicit unique constraint for shorthand upsert
                        const existingSnap = await tx.snapshot.findFirst({
                            where: { branchId: branch.id, parameterId: param.id, date: businessDate }
                        });

                        if (existingSnap) {
                            await tx.snapshot.update({
                                where: { id: existingSnap.id },
                                data: { value: val, budget: budVal, status }
                            });
                        } else {
                            await tx.snapshot.create({
                                data: { branchId: branch.id, parameterId: param.id, date: businessDate, value: val, budget: budVal, status }
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
