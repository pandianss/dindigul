import xlsx from 'xlsx';
import { BusinessSnapshotService, MisStatus } from './BusinessSnapshotService';
import { RuleEngine } from './RuleEngine';
import prisma from '../lib/prisma';

const MAPPING: Record<string, string> = {
    // Advance sub-portfolios
    'MUDRA': 'Mudra',
    'AGRI JL': 'Agri_JL',
    'RETAIL JL': 'Ret-Gold',       // Gold loan advances
    'GOLD': 'Gold',            // Gold loan balance (stock)
    'HOUSING': 'HL',
    'VEHICLE': 'VL',
    'PERSONAL': 'PersonalLoan',    // FIXED: was 'PL' — caused naming collision
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
    'PL': 'Branch_PL',       // NEW — Branch P&L / Priority Lending aggregate
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

        // 1. Create Batch Import Log FIRST
        const importLog = await prisma.misImportLog.create({
            data: {
                filename: originalFilename,
                status: 'PROCESSING',
                processedUnits: 0,
                failedUnits: 0,
                uniqueDates: []
            }
        });

        for (const row of data) {
            try {
                const solRaw = String(row['SOL'] || '');
                const sol = solRaw.padStart(4, '0');
                const dateRaw = String(row['DATE'] || '');

                if (!sol || !dateRaw || sol === '0000') continue;

                // Parse date YYYYMMDD as UTC 00:00
                const year = parseInt(dateRaw.substring(0, 4));
                const month = parseInt(dateRaw.substring(4, 6)) - 1;
                const day = parseInt(dateRaw.substring(6, 8));
                const businessDate = new Date(Date.UTC(year, month, day));

                const branch = await prisma.branch.findUnique({ where: { code: sol } });
                if (!branch) {
                    console.warn(`Branch not found for SOL: ${sol}`);
                    results.failed++;
                    continue;
                }

                await prisma.$transaction(async (tx) => {
                    // 2. Create Ingestion Log linked to Batch
                    const log = await tx.ingestionLog.create({
                        data: {
                            unitId: branch.id,
                            status: 'PROCESSED',
                            filename: originalFilename,
                            importLogId: importLog.id,
                            meta: { source: 'MIS_EXCEL_UPLOAD' }
                        }
                    });

                    // 3. Clear/Create Facts
                    await tx.fact.deleteMany({ where: { unitId: branch.id, date: businessDate } });

                    const factsData = [];
                    let coreRetSum = 0;
                    const coreRetConstituents = ['EL', 'VL', 'OthRet', 'Mort', 'Liq', 'HL', 'PersonalLoan'];
                    let sb = 0, cd = 0, td = 0, adv = 0;

                    const rowHeaders = Object.keys(row);
                    for (const rawHeader of rowHeaders) {
                        const trimmedHeader = rawHeader.trim();
                        const paramName = MAPPING[trimmedHeader];
                        if (paramName) {
                            const val = Number(row[rawHeader] || 0);
                            factsData.push({
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
                        }
                    }

                    // 4. Add Derived Facts
                    const casa = sb + cd;
                    const totalDep = casa + td;
                    const casaPct = totalDep > 0 ? (casa / totalDep) * 100 : 0;

                    factsData.push({ unitId: branch.id, date: businessDate, metric: 'Core Ret', value: coreRetSum, ingestionId: log.id });
                    factsData.push({ unitId: branch.id, date: businessDate, metric: 'CASA', value: casa, ingestionId: log.id });
                    factsData.push({ unitId: branch.id, date: businessDate, metric: 'Total Dep', value: totalDep, ingestionId: log.id });
                    factsData.push({ unitId: branch.id, date: businessDate, metric: 'CASA%', value: casaPct, ingestionId: log.id });
                    factsData.push({ unitId: branch.id, date: businessDate, metric: 'CD_Ratio', value: totalDep > 0 ? (adv / totalDep) * 100 : 0, ingestionId: log.id });
                    factsData.push({ unitId: branch.id, date: businessDate, metric: 'Bus', value: totalDep + adv, ingestionId: log.id });

                    if (factsData.length > 0) {
                        await tx.fact.createMany({ data: factsData });
                    }

                    // 4. Upsert Snapshot Header
                    const snapshot = await tx.misSnapshot.upsert({
                        where: { unitId_businessDate_version: { unitId: branch.id, businessDate, version: 1 } },
                        create: {
                            unitId: branch.id,
                            businessDate,
                            status: MisStatus.PROVISIONAL,
                            version: 1
                        },
                        update: {
                            status: MisStatus.PROVISIONAL
                        }
                    });

                    // 5. Populate Panel
                    await (BusinessSnapshotService as any).populatePanelInternal(tx, snapshot.id, branch.id, businessDate);

                    // 6. Auto-evaluate Exceptions
                    await RuleEngine.evaluate(snapshot.id);
                });

                results.processed++;
                results.units.add(sol);
                results.dates.add(businessDate.toISOString().split('T')[0]);

            } catch (err) {
                console.error(`Row processing failed for SOL ${row['SOL']}:`, err);
                results.failed++;
            }
        }

        // 6. Update Batch Import Log status
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

        await prisma.$transaction(async (tx) => {
            if (importLog && importLog.uniqueDates.length > 0) {
                const dates = importLog.uniqueDates.map(d => new Date(d));
                const unitIds = logs.map(l => l.unitId);

                // 2. Identify and delete snapshots and their dependents
                const snapshots = await tx.misSnapshot.findMany({
                    where: {
                        unitId: { in: unitIds },
                        businessDate: { in: dates }
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
