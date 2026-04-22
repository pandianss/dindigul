import xlsx from 'xlsx';
import { BusinessSnapshotService } from './BusinessSnapshotService';
import { MisStatus } from '../types/mis';
import { RuleEngine } from './RuleEngine';
import prisma from '../lib/prisma';
import { getFYRange } from '../utils/calendar';
import { formatSolId, toUTCDate, normalizeAmount } from '../utils/businessUtils';

const CRITERIA_PARAM_MAP: Record<string, string> = {
    'Total Dep': 'TOTAL_DEPOSITS',
    'Adv': 'ADV',
    'Advances': 'ADV',
    'Total Adv': 'ADV',
    'Total Advances': 'ADV',
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
    'Cash_Excess': 'CASH_EXCESS',
    'Cash_Hand': 'CASH_HAND',
    'BNA_CASH': 'CASH_BNA',
    'CASH_HOLDING': 'CASH_TOTAL',
    'CASH_RETENTION_LIMIT': 'CASH_CRL'
};

function normalizeHeader(h: string): string {
    return (h || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function normalizeCode(metricName: string): string {
    if (!metricName) return 'UNKNOWN';
    const clean = metricName.trim().toUpperCase()
        .replace(/[^A-Z0-9]/g, '_')
        .replace(/__+/g, '_')
        .replace(/^_+|_+$/g, '');
    return CRITERIA_PARAM_MAP[metricName] || MAPPING[normalizeHeader(metricName)] || clean;
}

const MAPPING: Record<string, string> = {
    'MUDRA': 'MUDRA',
    'AGRIJL': 'AGRI_JL',
    'RETAILJL': 'GOLD_RETAIL',
    'GOLD': 'GOLD',
    'HOUSING': 'HL',
    'VEHICLE': 'VL',
    'PERSONALLOAN': 'PL',
    'MORTGAGE': 'MORT',
    'EDUCATION': 'EL',
    'LIQUIRENT': 'LIQ',
    'OTHERRETAIL': 'OTH_RET',
    'TOTALRETAIL': 'TOT_RETAIL',
    'MSME': 'MSME',
    'SHG': 'SHG',
    'KCC': 'KCC',
    'GOVTSPON': 'GOV',
    'OTHSCHEMATIC': 'OTH_SCH',
    'COREAGRI': 'CORE_AGRI',
    'CORERETAIL': 'CORE_RETAIL',
    'CORERET': 'CORE_RETAIL',
    'NPA': 'NPA',
    'ADV': 'ADV',
    'ADVANCE': 'ADV',
    'ADVANCES': 'ADV',
    'TOTALADVANCES': 'ADV',
    'TOTALADV': 'ADV',
    'TOTALDEPOSITS': 'TOTAL_DEPOSITS',
    'SB': 'SB_DEPOSITS',
    'CD': 'CD_DEPOSITS',
    'TD': 'TD_DEPOSITS',
    'TERM': 'TD_DEPOSITS',
    'TERMDEPOSITS': 'TD_DEPOSITS',
    'RETAILTD': 'RET_TD',
    'RETTD': 'RET_TD',
    'RETD': 'RET_TD',
    'RTD': 'RET_TD',
    'RTDS': 'RET_TD',
    'CASA': 'CASA',
    'CASHONHAND': 'CASH_HAND',
    'CASHONH': 'CASH_HAND',
    'ATMCASH': 'CASH_ATM',
    'BCCASH': 'CASH_BC',
    'BNACASH': 'CASH_BNA',
    'TOTALCASH': 'CASH_TOTAL',
    'CASHPOS': 'CASH_TOTAL',
    'POSSESSION': 'CASH_TOTAL',
    'CASHPOSSESSION': 'CASH_TOTAL',
    'CASH': 'CASH_TOTAL',
    'CASHBALANCE': 'CASH_TOTAL',
    'CDRATIO': 'CD_RATIO',
    'CRL': 'CASH_CRL',
    'CASHRETENTIONLIMIT': 'CASH_CRL',
    'RETENTIONLIMIT': 'CASH_CRL',
    'CASHREQUIREDLEVEL': 'CASH_CRL',
    'AUTHORIZEDCASH': 'CASH_CRL',
    'RETENTION': 'CASH_CRL',
    'EXCESS': 'CASH_EXCESS',
    'EXCESSCASH': 'CASH_EXCESS',
    'CASHEXCESS': 'CASH_EXCESS',
    'BULKDEP': 'BULK_DEP',
    'PL': 'BRANCH_PL',
    'RECQ1': 'REC_Q1',
    'RECQ2': 'REC_Q2',
    'RECQ3': 'REC_Q3',
    'RECQ4': 'REC_Q4'
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

        const branches = await prisma.branch.findMany();
        const branchMap = Object.fromEntries(branches.map(b => [b.code, b]));

        const importLog = await prisma.misImportLog.create({
            data: {
                filename: originalFilename,
                status: 'PROCESSING',
                processedUnits: 0,
                failedUnits: 0,
                uniqueDates: []
            }
        });

        const dataByDate: Record<string, any[]> = {};
        for (const row of data) {
            const dateRaw = String(row['DATE'] || '');
            if (!dateRaw) continue;
            if (!dataByDate[dateRaw]) dataByDate[dateRaw] = [];
            dataByDate[dateRaw].push(row);
        }

        for (const [dateRaw, rows] of Object.entries(dataByDate)) {
            const year = parseInt(dateRaw.substring(0, 4));
            const month = parseInt(dateRaw.substring(4, 6)) - 1;
            const day = parseInt(dateRaw.substring(6, 8));
            const businessDate = toUTCDate(new Date(Date.UTC(year, month, day)));
            results.dates.add(businessDate.toISOString().split('T')[0]);

            const snapshotsToPopulate: { id: string, unitId: string }[] = [];

            await prisma.$transaction(async (tx) => {
                const affectedUnitIds = new Set<string>();
                const factsToCreate = [];

                for (const row of rows) {
                    const sol = formatSolId(row['SOL']);
                    if (!sol || sol === '0000') continue;

                    const branch = branchMap[sol];
                    if (!branch) {
                        results.failed++;
                        continue;
                    }

                    affectedUnitIds.add(branch.id);

                    const log = await tx.ingestionLog.create({
                        data: {
                            unitId: branch.id,
                            status: 'PROCESSED',
                            filename: originalFilename,
                            importLogId: importLog.id,
                            meta: { source: 'MIS_BATCH_OPTIMIZED' }
                        }
                    });

                    let coreRetSum = 0;
                    const coreRetConstituents = ['EL', 'VL', 'OTH_RET', 'MORT', 'LIQ', 'HL', 'PL'];
                    let sb = 0, cd = 0, td = 0, adv = 0, npaVal = 0, bulkDep = 0, retTd = 0;

                    const recQ1 = Number(row['Rec Q1'] || 0);
                    const recQ2 = Number(row['Rec Q2'] || 0);
                    const recQ3 = Number(row['Rec Q3'] || 0);
                    const recQ4 = Number(row['Rec Q4'] || 0);
                    const rawTotalRec = recQ1 + recQ2 + recQ3 + recQ4;

                    const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(branch.type?.toUpperCase() || '') || branch.code === '3933';
                    const scaledTotalRec = normalizeAmount(rawTotalRec, !isRegional);

                    for (const [rawHeader, rawValue] of Object.entries(row)) {
                        const paramName = normalizeCode(rawHeader);
                        const val = normalizeAmount(Number(rawValue || 0), !isRegional);

                        if (paramName === 'ADV') adv = val;

                        const isDerived = ['CASA', 'TOTAL_DEPOSITS', 'BUSINESS_TOTAL', 'CASA%', 'CD_RATIO', 'RET_TD', 'ADV'].includes(paramName);
                        
                        if (paramName && paramName !== 'UNKNOWN' && !isDerived) {
                            factsToCreate.push({
                                unitId: branch.id,
                                date: businessDate,
                                metric: paramName,
                                value: val,
                                ingestionId: log.id
                            });

                            if (coreRetConstituents.includes(paramName)) coreRetSum += val;
                            if (paramName === 'SB_DEPOSITS') sb = val;
                            if (paramName === 'CD_DEPOSITS') cd = val;
                            if (paramName === 'TD_DEPOSITS') td = val;
                            if (paramName === 'BULK_DEP') bulkDep = val;
                            if (paramName === 'NPA') npaVal = val;
                        }
                    }

                    if (retTd === 0 && td > 0) retTd = td - bulkDep;
                    const casa = sb + cd;
                    const totalDep = casa + td;
                    const casaPct = totalDep > 0 ? (casa / totalDep) * 100 : 0;

                    const derivedFacts = [
                        { metric: 'Core Ret', value: coreRetSum },
                        { metric: 'CASA', value: casa },
                        { metric: 'Total Dep', value: totalDep },
                        { metric: 'RET_TD', value: retTd },
                        { metric: 'CASA%', value: casaPct },
                        { metric: 'CD_Ratio', value: totalDep > 0 ? (adv / totalDep) * 100 : 0 },
                        { metric: 'ADV', value: adv },
                        { metric: 'Bus', value: totalDep + adv },
                        { metric: 'Recovery', value: scaledTotalRec }
                    ];

                    derivedFacts.forEach(f => {
                        factsToCreate.push({
                            unitId: branch.id,
                            date: businessDate,
                            metric: f.metric,
                            value: f.value,
                            ingestionId: log.id
                        });
                    });

                    const metricsToRegister = [...new Set(factsToCreate.map(f => f.metric))];
                    const existingParams = await tx.misParameterRegistry.findMany({
                        where: { parameterName: { in: metricsToRegister } }
                    });
                    const existingParamNames = new Set(existingParams.map(p => p.parameterName));

                    for (const metricName of metricsToRegister) {
                        if (!existingParamNames.has(metricName)) {
                            const isCash = metricName.toUpperCase().includes('CASH') || ['CASH_CRL', 'CASH_BNA', 'CASH_TOTAL'].includes(metricName);
                            const isCore = ['CORE_RETAIL', 'MSME', 'CORE_AGRI', 'GOLD', 'CORE_ADVANCES', 'TOTAL_ADVANCES'].includes(metricName);
                            
                            await tx.misParameterRegistry.create({
                                data: {
                                    parameterName: metricName,
                                    displayName: metricName.replace(/_/g, ' '),
                                    category: isCash ? 'CASH' : (isCore ? 'CORE_ADVANCES' : 'GENERAL'),
                                    isEnabled: true,
                                    orderIndex: isCash ? 300 : (isCore ? 100 : 500)
                                }
                            });
                        }
                    }

                    const snap = await tx.misSnapshot.upsert({
                        where: { unitId_businessDate_version: { unitId: branch.id, businessDate, version: 1 } },
                        create: { unitId: branch.id, businessDate, status: MisStatus.PROVISIONAL, version: 1 },
                        update: { status: MisStatus.PROVISIONAL }
                    });
                    snapshotsToPopulate.push({ id: snap.id, unitId: branch.id });

                    results.processed++;
                    results.units.add(sol);
                }

                if (factsToCreate.length > 0) {
                    await tx.fact.deleteMany({ where: { unitId: { in: Array.from(affectedUnitIds) }, date: businessDate } });
                    await tx.fact.createMany({ data: factsToCreate });
                }

                await BusinessSnapshotService.populatePanelsBatch(tx, snapshotsToPopulate, businessDate);
            }, { timeout: 120000 });

            if (snapshotsToPopulate.length > 0) {
                await RuleEngine.evaluateBatch(snapshotsToPopulate.map(s => s.id));
            }
        }

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
            uniqueUnits: results.units.size,
            uniqueDates: Array.from(results.dates)
        };
    }

    static async deleteImport(importId: string) {
        const importLog = await prisma.misImportLog.findUnique({ where: { id: importId } });
        if (!importLog) return { success: false, error: 'Import log not found' };

        const logs = await prisma.ingestionLog.findMany({ where: { importLogId: importId } });
        const unitIds = [...new Set(logs.map(l => l.unitId))];
        const logIds = logs.map(l => l.id);
        const allDates = importLog.uniqueDates.map(d => new Date(d));

        await prisma.$transaction(async (tx) => {
            if (unitIds.length > 0 && allDates.length > 0) {
                const snapshots = await tx.misSnapshot.findMany({
                    where: { unitId: { in: unitIds }, businessDate: { in: allDates } },
                    select: { id: true }
                });
                const snapshotIds = snapshots.map(s => s.id);

                if (snapshotIds.length > 0) {
                    await tx.misInformationPanel.deleteMany({ where: { snapshotId: { in: snapshotIds } } });
                    await tx.misException.deleteMany({ where: { snapshotId: { in: snapshotIds } } });
                    await tx.misSnapshot.deleteMany({ where: { id: { in: snapshotIds } } });
                }
            }

            if (logIds.length > 0) {
                await tx.fact.deleteMany({ where: { ingestionId: { in: logIds } } });
                await tx.ingestionLog.deleteMany({ where: { id: { in: logIds } } });
            }

            await tx.misImportLog.delete({ where: { id: importId } });
        }, { timeout: 60000 });

        return { success: true };
    }
}
