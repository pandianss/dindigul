import { Router } from 'express';
import { getFYMetrics, getFYRange } from '../utils/fyUtils';
import { io } from '../index';
import prisma from '../lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
import { generatePDF, getBrowser, renderTemplate, buildLetterBodyHtml } from '../services/pdfService';
import archiver from 'archiver';

import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { BusinessSnapshotService } from '../services/BusinessSnapshotService';
import { MisStatus, MisParameter } from '../types/mis';
import { RuleEngine } from '../services/RuleEngine';
import { MISIngestionService } from '../services/MISIngestionService';
import { authenticateToken } from '../middleware/auth';
import { misUpload as upload } from '../middleware/upload';
import path from 'path';
import { logger } from '../utils/logger';
import fs from 'fs';
import { z } from 'zod';
import { validate } from '../lib/validate';

// upload configuration moved to centralized middleware

const router = Router();

interface MISRecord {
    BranchCode: string;
    ParameterCode: string;
    Value: string;
    Budget?: string;
}

// Get latest snapshots for dashboard
router.get('/snapshots', authenticateToken, async (req, res) => {
    try {
        const snapshots = await prisma.snapshot.findMany({
            orderBy: { date: 'desc' },
            take: 20,
            include: {
                parameter: true,
                branch: true
            }
        });
        res.json(snapshots);
    } catch (error) {
        logger.error('Error fetching snapshots:', error);
        res.status(500).json({ error: 'Failed to fetch snapshots' });
    }
});

// Get specific branch snapshot for chat command
router.get('/snapshot', authenticateToken, async (req, res) => {
    const { branchCode } = req.query;

    if (!branchCode) {
        return res.status(400).json({ error: 'Missing branchCode' });
    }

    try {
        const branch = await prisma.branch.findUnique({
            where: { code: String(branchCode) }
        });

        if (!branch) {
            return res.status(404).json({ error: 'Branch not found' });
        }

        // Get the latest distinct snapshots for this branch
        const snapshots = await prisma.snapshot.findMany({
            where: { branchId: branch.id },
            orderBy: { date: 'desc' },
            take: 50, // Get enough to likely cover all parameters for the latest date
            include: {
                parameter: true
            }
        });

        if (snapshots.length === 0) {
            return res.json({ branchCode, branchName: branch.nameEn, date: new Date().toISOString().split('T')[0], rows: [] });
        }

        const latestDate = snapshots[0].date;
        const latestSnapshots = snapshots.filter((s: any) => s.date.getTime() === latestDate.getTime());

        const rows = latestSnapshots.map((s: any) => ({
            paramCode: s.parameter.code,
            paramName: s.parameter.name,
            actual: s.value,
            budget: s.budget,
            status: s.status
        }));

        res.json({
            branchCode: branch.code,
            branchName: branch.nameEn,
            date: latestDate.toISOString().split('T')[0],
            rows
        });
    } catch (error) {
        logger.error('Error fetching branch snapshot:', error);
        res.status(500).json({ error: 'Failed to fetch snapshot' });
    }
});

// GET /api/mis/regional-panel?date=YYYY-MM-DD
// Returns all branch snapshots for a given date with their full panelData
router.get('/regional-panel', authenticateToken, async (req: any, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query parameter required (YYYY-MM-DD)' });

    try {
        const [y, m, d] = String(date).split('-').map(Number);
        const businessDate = new Date(Date.UTC(y, m - 1, d));

        // Find all snapshots for this date
        const snapshots = await prisma.misSnapshot.findMany({
            where: { businessDate },
            include: {
                branch: { select: { id: true, code: true, nameEn: true, nameTa: true, type: true } },
                panelData: true,
            },
            orderBy: { branch: { code: 'asc' } }
        });

        if (snapshots.length === 0) {
            return res.status(404).json({ error: `No snapshots found for date ${date}` });
        }

        // Fetch parameter registry for display names
        const registry = await prisma.misParameterRegistry.findMany({
            where: { isEnabled: true },
            orderBy: { orderIndex: 'asc' }
        });
        const regMap = Object.fromEntries(registry.map(r => [r.parameterName, r]));

        // Enrich snapshots: convert Decimal to number, attach metadata
        const enriched = snapshots
            .filter(s => s.branch && s.branch.type !== 'REGIONAL OFFICE') // exclude RO itself
            .map(s => ({
                branchId: s.unitId,
                branchCode: s.branch!.code,
                branchName: s.branch!.nameEn,
                status: s.status,
                panelData: s.panelData.map(p => ({
                    parameter: p.parameter,
                    displayName: regMap[p.parameter]?.displayName || p.parameter,
                    category: regMap[p.parameter]?.category || 'Other',
                    val_current: Number(p.val_current),
                    val_fy_start: Number(p.val_fy_start),
                    val_prev_m_end: Number(p.val_prev_m_end),
                    growth_fy: Number(p.growth_fy),
                    growth_month: Number(p.growth_month),
                    growth_day: Number(p.growth_day),
                    budget_month: Number(p.budget_month),
                    gap_month: Number(p.gap_month),
                    status: p.status,
                }))
            }));

        // Compute regional totals per parameter (for KPI slide)
        const paramTotals: Record<string, {
            displayName: string; category: string;
            total: number; fyStart: number; growthFy: number;
        }> = {};
        for (const snap of enriched) {
            for (const p of snap.panelData) {
                if (!paramTotals[p.parameter]) {
                    paramTotals[p.parameter] = { displayName: p.displayName, category: p.category, total: 0, fyStart: 0, growthFy: 0 };
                }
                paramTotals[p.parameter].total += p.val_current;
                paramTotals[p.parameter].fyStart += p.val_fy_start;
                paramTotals[p.parameter].growthFy += p.growth_fy;
            }
        }

        // Recalculate regional percentages/ratios from the aggregated sums
        if (paramTotals['CASA%'] && paramTotals['Total Dep'] && paramTotals['CASA']) {
            const depTotal = paramTotals['Total Dep'];
            const casaTotal = paramTotals['CASA'];
            
            paramTotals['CASA%'].total = depTotal.total > 0 ? (casaTotal.total / depTotal.total) * 100 : 0;
            paramTotals['CASA%'].fyStart = depTotal.fyStart > 0 ? (casaTotal.fyStart / depTotal.fyStart) * 100 : 0;
            paramTotals['CASA%'].growthFy = paramTotals['CASA%'].total - paramTotals['CASA%'].fyStart;
        }

        if (paramTotals['CD_Ratio'] && paramTotals['Total Dep'] && paramTotals['Adv']) {
            const depTotal = paramTotals['Total Dep'];
            const advTotal = paramTotals['Adv'];
            
            paramTotals['CD_Ratio'].total = depTotal.total > 0 ? (advTotal.total / depTotal.total) * 100 : 0;
            paramTotals['CD_Ratio'].fyStart = depTotal.fyStart > 0 ? (advTotal.fyStart / depTotal.fyStart) * 100 : 0;
            paramTotals['CD_Ratio'].growthFy = paramTotals['CD_Ratio'].total - paramTotals['CD_Ratio'].fyStart;
        }

        res.json({
            date,
            businessDate: businessDate.toISOString(),
            branchCount: enriched.length,
            parameters: registry.map(r => ({ parameterName: r.parameterName, displayName: r.displayName, category: r.category, orderIndex: r.orderIndex })),
            regionalTotals: paramTotals,
            branches: enriched,
        });
    } catch (error: any) {
        logger.error('[regional-panel] Error:', error);
        res.status(500).json({ error: 'Failed to fetch regional panel data' });
    }
});

// Upload MIS Excel (Pivot format)
router.post('/excel-upload', authenticateToken, upload.single('file'), async (req: any, res) => {
    const isPlanning = req.user?.section === 'Planning';
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role) && !isPlanning) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const result = await MISIngestionService.processExcel(req.file.path, req.file.originalname);

        // Cleanup
        fs.unlinkSync(req.file.path);

        res.json(result);
    } catch (error: any) {
        logger.error('Excel processing error:', error);
        res.status(500).json({ error: error.message || 'Failed to process Excel file' });
    }
});

const misUploadSchema = z.object({
    body: z.object({
        csvData: z.string().min(1, 'CSV Data is required'),
        date: z.string().min(1, 'Date is required')
    })
});

// Upload MIS CSV — Admin / RO_USER only (GAP 02)
router.post('/upload', authenticateToken, validate(misUploadSchema), async (req: any, res) => {
    const isPlanning = req.user?.section === 'Planning';
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role) && !isPlanning) {
        return res.status(403).json({ error: 'Forbidden: Only ADMIN, Regional Office users, or Planning section may upload MIS data' });
    }

    const { csvData, date } = req.body;

    try {
        const records: MISRecord[] = parse(csvData, {
            columns: true,
            skip_empty_lines: true
        });

        const uploadDate = new Date(date);
        const { start: fyStart } = getFYRange(uploadDate);
        const baselineDate = new Date(fyStart.getTime() - 86400000);

        // Pre-fetch baselines for this FY end
        const baselines = await prisma.snapshot.findMany({
            where: { date: baselineDate }
        });
        const baselineMap: Record<string, number> = {};
        baselines.forEach(b => {
            if (b.branchId && b.parameterId) {
                baselineMap[`${b.branchId}:${b.parameterId}`] = Number(b.value);
            }
        });


        for (const record of records) {
            const { BranchCode, ParameterCode, Value, Budget } = record;

            // Find branch
            const branch = await prisma.branch.findUnique({
                where: { code: BranchCode }
            });

            if (!branch) {
                logger.warn(`Branch not found: ${BranchCode}`);
                continue;
            }

            // Find parameter
            const parameter = await prisma.parameter.findUnique({
                where: { code: ParameterCode }
            });

            if (!parameter) {
                logger.warn(`Parameter not found: ${ParameterCode}`);
                continue;
            }

            const val = parseFloat(Value);
            const budVal = Budget ? parseFloat(Budget) : null;
            const baselineVal = baselineMap[`${branch.id}:${parameter.id}`] ?? 0;

            let status = 'NEUTRAL';
            if (budVal !== null && val > budVal) status = 'SURPASSED';
            else if (val > baselineVal) status = 'POSITIVE';
            else if (val < baselineVal) status = 'NEGATIVE';

            const isNegative = status === 'NEGATIVE' || (budVal !== null && val < budVal);

            // Upsert snapshot
            const existing = await prisma.snapshot.findFirst({
                where: {
                    date: uploadDate,
                    branchId: branch.id,
                    parameterId: parameter.id
                }
            });

            if (existing) {
                await prisma.snapshot.update({
                    where: { id: existing.id },
                    data: { value: val, budget: budVal, status }
                });
            } else {
                await prisma.snapshot.create({
                    data: {
                        date: uploadDate,
                        value: val,
                        budget: budVal,
                        parameterId: parameter.id,
                        branchId: branch.id,
                        status
                    }
                });
            }



            // If negative, emit mis_alert to management and branch rooms
            if (isNegative) {
                const alertPayload = {
                    branchCode: branch.code,
                    branchName: branch.nameEn,
                    paramCode: parameter.code,
                    paramName: parameter.nameEn,
                    newStatus: 'NEGATIVE',
                    currentActual: Value,
                    proRatedBudget: Budget,
                    snapshotDate: date
                };

                const alertMessage = {
                    id: uuidv4(),
                    type: 'mis_alert',
                    user: 'System',
                    role: 'ADMIN',
                    text: `${branch.nameEn} (${branch.code}) — ${parameter.nameEn} moved to NEGATIVE`,
                    payload: JSON.stringify(alertPayload),
                    timestamp: new Date()
                };

                // Save to DB
                await prisma.chatMessage.create({
                    data: { ...alertMessage, room: 'management' }
                });
                await prisma.chatMessage.create({
                    data: { ...alertMessage, room: `branch:${branch.code}` }
                });

                // Broadcast
                io.to('management').emit('receive_message', {
                    ...alertMessage,
                    room: 'management',
                    payload: alertPayload,
                    timestamp: alertMessage.timestamp.toISOString()
                });
                io.to(`branch:${branch.code}`).emit('receive_message', {
                    ...alertMessage,
                    room: `branch:${branch.code}`,
                    payload: alertPayload,
                    timestamp: alertMessage.timestamp.toISOString()
                });
            }
        }
        
        // Post-process: Calculate TOTAL_BUSINESS for affected branches
        const allParams = await prisma.parameter.findMany({
            where: { code: { in: ['TOTAL_DEPOSITS', 'TOTAL_ADVANCES', 'TOTAL_BUSINESS'] } }
        });
        const pMap = Object.fromEntries(allParams.map(p => [p.code, p.id]));
        const depId = pMap['TOTAL_DEPOSITS'];
        const advId = pMap['TOTAL_ADVANCES'];
        const busId = pMap['TOTAL_BUSINESS'];

        if (depId && advId && busId) {
            const affectedBranches = [...new Set(records.map(r => r.BranchCode))];
            for (const bCode of affectedBranches) {
                const branch = await prisma.branch.findUnique({ where: { code: bCode } });
                if (!branch) continue;

                const depSnap = await prisma.snapshot.findFirst({
                    where: { branchId: branch.id, parameterId: depId, date: uploadDate }
                });
                const advSnap = await prisma.snapshot.findFirst({
                    where: { branchId: branch.id, parameterId: advId, date: uploadDate }
                });

                if (depSnap && advSnap) {
                    const totalBus = Number(depSnap.value) + Number(advSnap.value);
                    const budBus = Number(depSnap.budget || 0) + Number(advSnap.budget || 0);
                    
                    // Status calculation for Total Business
                    const baselineDate = new Date(fyStart.getTime() - 86400000);
                    const bDep = await prisma.snapshot.findFirst({ where: { branchId: branch.id, parameterId: depId, date: baselineDate } });
                    const bAdv = await prisma.snapshot.findFirst({ where: { branchId: branch.id, parameterId: advId, date: baselineDate } });
                    const baselineVal = Number(bDep?.value || 0) + Number(bAdv?.value || 0);

                    let status = 'NEUTRAL';
                    if (budBus > 0 && totalBus > budBus) status = 'SURPASSED';
                    else if (totalBus > baselineVal) status = 'POSITIVE';
                    else if (totalBus < baselineVal) status = 'NEGATIVE';

                    const existingBusSnap = await prisma.snapshot.findFirst({
                        where: { branchId: branch.id, parameterId: busId, date: uploadDate }
                    });

                    if (existingBusSnap) {
                        await prisma.snapshot.update({
                            where: { id: existingBusSnap.id },
                            data: { value: totalBus, budget: budBus > 0 ? budBus : null, status }
                        });
                    } else {
                        await prisma.snapshot.create({
                            data: { branchId: branch.id, parameterId: busId, date: uploadDate, value: totalBus, budget: budBus > 0 ? budBus : null, status }
                        });
                    }

                }
            }
        }


        // Emit Summary Card to Management
        const summaryMessage = {
            id: uuidv4(),
            type: 'system_info',
            room: 'management',
            user: 'System',
            role: 'ADMIN',
            text: `MIS updated on ${date} for ${records.length} parameters.`,
            payload: JSON.stringify({ date, processedCount: records.length }),
            timestamp: new Date()
        };

        await prisma.chatMessage.create({ data: summaryMessage });
        io.to('management').emit('receive_message', {
            ...summaryMessage,
            payload: { date, processedCount: records.length },
            timestamp: summaryMessage.timestamp.toISOString()
        });

        res.json({ message: `Successfully processed ${records.length} records.` });
    } catch (error) {
        logger.error('Error processing MIS upload:', error);
        res.status(500).json({ error: 'Failed to process MIS upload' });
    }
});

// --- Business Snapshot Endpoints ---

// Generate from staging
router.post('/generate-from-staging', authenticateToken, async (req, res) => {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Missing date' });

    try {
        const result = await BusinessSnapshotService.generateFromStaging(date);
        res.json(result);
    } catch (error: any) {
        logger.error('Error generating from staging:', error);
        res.status(500).json({ error: error.message || 'Failed to generate snapshots' });
    }
});

// Get business snapshot
// NOTE: This endpoint is intentionally public (no authenticateToken) as it feeds the public display portal.
router.get('/business-snapshot/:branchCode', async (req, res) => {
    const { branchCode } = req.params;
    const { date } = req.query;

    if (!date) return res.status(400).json({ error: 'Missing date' });

    try {
        const snapshot = await BusinessSnapshotService.getSnapshot(branchCode, String(date));
        if (!snapshot) {
            return res.status(404).json({ error: `Snapshot or Unit '${branchCode}' not found for date ${date}` });
        }
        res.json(snapshot);
    } catch (error: any) {
        logger.error('Error getting business snapshot:', error);
        res.status(500).json({ error: 'Internal server error while fetching snapshot' });
    }
});

// Freeze snapshot
router.post('/freeze/:snapshotId', authenticateToken, async (req, res) => {
    const { snapshotId } = req.params;

    try {
        const frozen = await BusinessSnapshotService.freezeSnapshot(String(snapshotId));
        res.json({ message: 'Snapshot frozen and evaluated', frozen });
    } catch (error: any) {
        logger.error('Error freezing snapshot:', error);
        res.status(500).json({ error: 'Failed to freeze snapshot' });
    }
});

// Get all exceptions
router.get('/exceptions', authenticateToken, async (req, res) => {
    try {
        const exceptions = await prisma.misException.findMany({
            where: { status: 'OPEN' },
            include: { branch: true },
            orderBy: { businessDate: 'desc' }
        });
        res.json(exceptions);
    } catch (error) {
        logger.error('Error fetching exceptions:', error);
        res.status(500).json({ error: 'Failed to fetch exceptions' });
    }
});

// Get MIS import logs (history)
router.get('/import-logs', authenticateToken, async (req, res) => {
    try {
        const logs = await prisma.misImportLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(logs);
    } catch (error) {
        logger.error('Error fetching import logs:', error);
        res.status(500).json({ error: 'Failed to fetch import logs' });
    }
});

// Delete MIS import log (cascading)
router.delete('/import-logs/:id', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user?.section === 'Planning';
    if (req.user?.role !== 'ADMIN' && !isPlanning) {
        return res.status(403).json({ error: 'Only ADMIN or Planning section may delete MIS data' });
    }

    try {
        const { id } = req.params;
        await MISIngestionService.deleteImport(id);
        res.json({ message: 'Import deleted successfully' });
    } catch (error: any) {
        logger.error('Error deleting import:', error);
        res.status(500).json({ error: error.message || 'Failed to delete import' });
    }
});

// Get exception summary for all branches
router.get('/exception-summary', authenticateToken, async (req: any, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Missing date' });

    try {
        const summary = await BusinessSnapshotService.getExceptionSummary(String(date));
        res.json(summary);
    } catch (error: any) {
        logger.error('Error fetching exception summary:', error);
        res.status(500).json({ error: 'Failed to fetch exception summary' });
    }
});

// Bulk finalize all snapshots for a date
router.post('/finalize-all', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user?.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Forbidden' });
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Missing date' });

    try {
        const result = await BusinessSnapshotService.finalizeAllSnapshots(String(date));
        res.json(result);
    } catch (error: any) {
        logger.error('Error finalizing all snapshots:', error);
        res.status(500).json({ error: 'Failed to finalize snapshots' });
    }
});

// Trigger evaluation for all units on a date
router.post('/evaluate-all', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user?.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Forbidden' });
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Missing date' });

    try {
        const [y, m, d] = String(date).split('-').map(Number);
        const businessDate = new Date(Date.UTC(y, m - 1, d));

        const snapshots = await prisma.misSnapshot.findMany({
            where: { businessDate }
        });

        for (const s of snapshots) {
            await RuleEngine.evaluate(s.id);
        }

        res.json({ success: true, count: snapshots.length });
    } catch (error: any) {
        logger.error('Error triggering evaluations:', error);
        res.status(500).json({ error: 'Failed to trigger evaluations' });
    }
});

// Bulk download draft letters as ZIP
router.get('/letters/bulk-zip', authenticateToken, async (req: any, res) => {
    const { period, type = 'ALL' } = req.query;
    if (!period) return res.status(400).json({ error: 'period query parameter required' });

    try {
        const letters = await prisma.letter.findMany({
            where: { 
                period: String(period),
                status: 'DRAFT',
                type: type === 'ALL' ? { in: ['APPRECIATION', 'EXPLANATION', 'OP_RISK'] } : String(type)
            },
            include: { branch: true, parameter: true }
        });

        if (letters.length === 0) {
            return res.status(404).json({ error: 'No draft letters found to bundle' });
        }

        const tempDirId = uuidv4();
        const baseDir = path.join(process.cwd(), 'temp_zips', tempDirId);
        const cacheDir = path.join(process.cwd(), 'uploads', 'letter_cache');
        
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

        // Optimization: Use a single browser instance for the entire batch
        const browser = await getBrowser();
        const concurrencyLimit = 5;

        // Process in parallel batches of 5 to avoid memory crashes
        for (let i = 0; i < letters.length; i += concurrencyLimit) {
            const batch = letters.slice(i, i + concurrencyLimit);
            await Promise.all(batch.map(async (letter) => {
                try {
                    const safeBranchName = letter.branch.nameEn.replace(/[^a-z0-9]/gi, '_');
                    const safeParamName = (letter.parameter?.nameEn || 'OP_RISK').replace(/[^a-z0-9]/gi, '_');
                    const fileName = `${letter.type}_${letter.branch.code}_${safeBranchName}_${safeParamName}.pdf`;
                    const cacheFileName = `${letter.id}_${new Date(letter.updatedAt).getTime()}.pdf`;
                    const cachePath = path.join(cacheDir, cacheFileName);

                    let buffer: Buffer;
                    if (fs.existsSync(cachePath)) {
                        buffer = fs.readFileSync(cachePath);
                    } else {
                        const html = await renderTemplate('letter', {
                            ...(letter.orgMeta as any || {}),
                            title: letter.titleEn,
                            titleHi: letter.titleHi,
                            titleTa: letter.titleTa,
                            date: letter.period,
                            refNo: letter.referenceNo,
                            bodyHtml: buildLetterBodyHtml(letter.contentEn || '', letter.orgMeta as any || {}, letter),
                            signatoryName: (letter.orgMeta as any)?.signatoryName,
                            signatoryTitleEn: (letter.orgMeta as any)?.signingAuthEn,
                            signatoryTitleHi: (letter.orgMeta as any)?.signingAuthHi,
                            signatoryTitleTa: (letter.orgMeta as any)?.signingAuthTa,
                        });
                        buffer = await generatePDF(html, browser);
                        fs.writeFileSync(cachePath, buffer);

                        // Cleanup old versions of this letter from cache
                        const oldFiles = fs.readdirSync(cacheDir).filter(f => f.startsWith(letter.id) && f !== cacheFileName);
                        oldFiles.forEach(f => fs.unlinkSync(path.join(cacheDir, f)));
                    }

                    fs.writeFileSync(path.join(baseDir, fileName), buffer);
                } catch (pdfErr) {
                    logger.error(`Failed to generate PDF for letter ${letter.id}:`, pdfErr);
                }
            }));
        }

        await browser.close();

        const zipPath = path.join(process.cwd(), 'temp_zips', `${tempDirId}.zip`);
        
        // Use archiver for cross-platform (Linux/Windows) compatibility
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(baseDir, false);
            archive.finalize();
        });

        res.download(zipPath, `Dindigul_Letters_${period.replace(/ /g, '_')}.zip`, (err) => {
            // Cleanup after download finishes or errors
            try {
                if (fs.existsSync(baseDir)) fs.rmSync(baseDir, { recursive: true, force: true });
                if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
            } catch (cleanErr) {
                logger.warn('Cleanup failed after bulk download:', cleanErr);
            }
        });

    } catch (error: any) {
        logger.error('[bulk-zip] Global error:', error);
        res.status(500).json({ error: 'Failed to generate bulk ZIP archive' });
    }
});

export default router;
