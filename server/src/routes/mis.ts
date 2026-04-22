import { Router } from 'express';
import { getFYRange } from '../utils/calendar';
import { io } from '../index';
import prisma from '../lib/prisma';
import { 
  PDFRenderer, 
  TemplateRenderer, 
} from '../renderers';
import { 
  SnapshotOrchestrator,
  SnapshotBuilder,
} from '../services';
import {
  SnapshotRepository,
  MISIngester
} from '../infra';
import { RuleEvaluator } from '../rules/RuleEvaluator';
import { authenticateToken } from '../middleware/auth';
import { misUpload as upload } from '../middleware/upload';
import path from 'path';
import { logger } from '../utils/logger';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';

const router = Router();

// Get latest snapshots for dashboard (Legacy compatibility layer using Fact)
/**
 * MIS Snapshot Routes - Realigned to SSOT (Single Source of Truth).
 * All data now flows from Fact table -> SnapshotBuilder -> Snapshot UI.
 */

router.get('/snapshots', authenticateToken, async (req, res) => {
    try {
        const latestSnapshots = await prisma.misSnapshot.findMany({
            orderBy: { businessDate: 'desc' },
            take: 20,
            include: { branch: true }
        });
        res.json(latestSnapshots);
    } catch (error: any) {
        logger.error('Error fetching snapshots:', error);
        res.status(500).json({ error: 'Failed to fetch snapshots' });
    }
});

router.get('/business-snapshot/:branchCode', authenticateToken, async (req, res) => {
    const { branchCode } = req.params;
    const { date } = req.query;

    if (!date) return res.status(400).json({ error: 'Date is required' });

    try {
        const snapshot = await SnapshotRepository.getSnapshot(branchCode as string, String(date));
        
        if (!snapshot) {
            return res.status(404).json({ error: `Snapshot not generated for SOL ${branchCode} on ${date}` });
        }

        // Enrich panel data with metadata for frontend components (PerformanceWidget etc)
        const enrichedSnapshot = {
            ...snapshot,
            panelData: snapshot.panelData.map(p => ({
                ...p,
                metadata: {
                    displayName: p.registry?.displayName || p.parameter,
                    category: p.registry?.category || 'Uncategorized'
                }
            }))
        };

        res.json(enrichedSnapshot);
    } catch (error: any) {
        logger.error('Error fetching business snapshot:', error);
        res.status(500).json({ error: 'Failed to fetch snapshot' });
    }
});

// GET /api/mis/regional-panel?date=YYYY-MM-DD
router.get('/regional-panel', authenticateToken, async (req: any, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query parameter required (YYYY-MM-DD)' });

    try {
        const [y, m, d] = String(date).split('-').map(Number);
        const businessDate = new Date(Date.UTC(y, m - 1, d));

        const snapshots = await prisma.misSnapshot.findMany({
            where: { businessDate },
            include: {
                branch: { select: { id: true, code: true, nameEn: true, nameTa: true, type: true } },
                panelData: true,
            },
            orderBy: { branch: { code: 'asc' } }
        });

        if (snapshots.length === 0) return res.status(404).json({ error: `No snapshots found for date ${date}` });

        const registry = await prisma.misParameterRegistry.findMany({
            where: { isEnabled: true },
            orderBy: { orderIndex: 'asc' }
        });
        const regMap = Object.fromEntries(registry.map(r => [r.parameterName, r]));

        const enriched = snapshots
            .filter(s => !!s.branch)
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

        const paramTotals: Record<string, any> = {};
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

        res.json({ date, businessDate: businessDate.toISOString(), branchCount: enriched.length, regionalTotals: paramTotals, branches: enriched });
    } catch (error: any) {
        logger.error('[regional-panel] Error:', error);
        res.status(500).json({ error: 'Failed to fetch regional panel data' });
    }
});

// Upload MIS Excel (Pivot format)
router.post('/excel-upload', authenticateToken, upload.single('file'), async (req: any, res) => {
    const isPlanning = req.user?.section === 'Planning';
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role) && !isPlanning) return res.status(403).json({ error: 'Forbidden' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const importId = uuidv4();
        
        // 1. Create initial log record to satisfy FK constraints
        await prisma.misImportLog.create({
            data: {
                id: importId,
                filename: req.file.originalname,
                status: 'PROCESSING',
                processedUnits: 0,
                failedUnits: 0,
                uniqueDates: []
            }
        });

        // 2. Perform ingestion
        const result = await MISIngester.ingestData(req.file.path, importId, req.file.originalname);
        
        // 3. Update log record with final results
        await prisma.misImportLog.update({
            where: { id: importId },
            data: {
                status: 'SUCCESS',
                processedUnits: result.processedUnits,
                failedUnits: result.skippedUnits,
                uniqueDates: result.datesFound,
            }
        });

        fs.unlinkSync(req.file.path);
        res.json(result);
    } catch (error: any) {
        logger.error('Excel processing error:', error);
        res.status(500).json({ error: error.message || 'Failed to process Excel file' });
    }
});

// CSV Upload deprecated
router.post('/upload', authenticateToken, (req, res) => {
    res.status(410).json({ error: 'CSV Upload is deprecated. Please use Excel Pivot upload.' });
});

// Generate from staging
router.post('/generate-from-staging', authenticateToken, async (req, res) => {
    const { date } = req.body;
    logger.info('MIS_GENERATE_STAGING_HIT', { date });
    if (!date) return res.status(400).json({ error: 'Missing date' });
    try {
        const result = await SnapshotBuilder.generateDailySnapshots(String(date));
        res.json(result);
    } catch (error: any) {
        logger.error('Error generating snapshots:', error);
        res.status(500).json({ error: error.message || 'Failed to generate snapshots' });
    }
});


// Freeze snapshot
router.post('/freeze/:snapshotId', authenticateToken, async (req, res) => {
    const { snapshotId } = req.params;
    try {
        const frozen = await SnapshotOrchestrator.freezeAndEvaluate(String(snapshotId));
        res.json({ message: 'Snapshot frozen and evaluated', frozen });
    } catch (error: any) {
        logger.error('Error freezing snapshot:', error);
        res.status(500).json({ error: 'Failed to freeze snapshot' });
    }
});

// Get exceptions
router.get('/exceptions', authenticateToken, async (req, res) => {
    try {
        const exceptions = await prisma.misException.findMany({ where: { status: 'OPEN' }, include: { branch: true }, orderBy: { businessDate: 'desc' } });
        res.json(exceptions);
    } catch (error: any) {
        logger.error('Error fetching exceptions:', error);
        res.status(500).json({ error: 'Failed to fetch exceptions' });
    }
});

// Get import logs
router.get('/import-logs', authenticateToken, async (req, res) => {
    try {
        const logs = await prisma.misImportLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
        res.json(logs);
    } catch (error: any) {
        logger.error('Error fetching import logs:', error);
        res.status(500).json({ error: 'Failed to fetch import logs' });
    }
});

// Delete import log
router.delete('/import-logs/:id', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user?.section === 'Planning';
    if (req.user?.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Forbidden' });
    try {
        const { id } = req.params;
        await SnapshotRepository.deleteByImportId(id);
        res.json({ message: 'Import deleted successfully' });
    } catch (error: any) {
        logger.error('Error deleting import:', error);
        res.status(500).json({ error: error.message || 'Failed to delete import' });
    }
});

// Bulk finalize all snapshots
router.post('/finalize-all', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user?.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Forbidden' });
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Missing date' });
    try {
        const result = await SnapshotOrchestrator.finalizeAllSnapshots(String(date));
        res.json(result);
    } catch (error: any) {
        logger.error('Error finalizing all snapshots:', error);
        res.status(500).json({ error: 'Failed to finalize snapshots' });
    }
});

// Trigger evaluation for all units
router.post('/evaluate-all', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user?.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Forbidden' });
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Missing date' });
    try {
        const [y, m, d] = String(date).split('-').map(Number);
        const businessDate = new Date(Date.UTC(y, m - 1, d));
        const snapshots = await prisma.misSnapshot.findMany({ where: { businessDate } });
        for (const s of snapshots) { await RuleEvaluator.evaluate(s.id); }
        res.json({ success: true, count: snapshots.length });
    } catch (error: any) {
        logger.error('Error triggering evaluations:', error);
        res.status(500).json({ error: 'Failed to trigger evaluations' });
    }
});

// Bulk download draft letters as ZIP
router.get('/letters/bulk-zip', authenticateToken, async (req: any, res) => {
    const { period, type = 'ALL' } = req.query;
    if (!period) return res.status(400).json({ error: 'period required' });
    try {
        const letters = await prisma.letter.findMany({
            where: { period: String(period), status: 'DRAFT', type: type === 'ALL' ? { in: ['APPRECIATION', 'EXPLANATION', 'OP_RISK'] } : String(type) },
            include: { branch: true }
        });
        if (letters.length === 0) return res.status(404).json({ error: 'No draft letters found' });

        const tempDirId = uuidv4();
        const baseDir = path.join(process.cwd(), 'temp_zips', tempDirId);
        const cacheDir = path.join(process.cwd(), 'uploads', 'letter_cache');
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

        for (const letter of letters) {
            try {
                const fileName = `${letter.type}_${letter.branch.code}_${letter.id}.pdf`;
                const html = await TemplateRenderer.renderLetter({
                    metadata: {
                        referenceNo: letter.referenceNo || 'M-PENDING',
                        letterDate: new Date(letter.createdAt).toLocaleDateString(),
                        generatedAt: new Date(),
                        type: letter.type as any,
                        category: 'GENERAL',
                        version: 1
                    },
                    organization: {
                        bankName: { en: 'Dindigul Bank', hi: '', ta: '' },
                        officeName: { en: 'Regional Office', hi: '', ta: '' },
                        address: { en: '', hi: '', ta: '' },
                        phone: '',
                        email: '',
                        website: 'http://bank.com'
                    },
                    recipient: { name: letter.branch.nameEn, isExternal: false },
                    signatory: {
                        name: { en: 'Regional Manager', hi: '', ta: '' },
                        title: { en: 'Regional Office', hi: '', ta: '' }
                    },
                    content: {
                        title: { en: letter.titleEn, hi: '', ta: '' },
                        bodyHtml: letter.contentEn || ''
                    }
                });
                const buffer = await PDFRenderer.generate(html);
                fs.writeFileSync(path.join(baseDir, fileName), buffer);
            } catch (pdfErr: any) { logger.error(`PDF error for ${letter.id}:`, pdfErr); }
        }

        const zipPath = path.join(process.cwd(), 'temp_zips', `${tempDirId}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        await new Promise((resolve, reject) => {
            output.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(output);
            archive.directory(baseDir, false);
            archive.finalize();
        });

        res.download(zipPath, `Dindigul_Letters_${period}.zip`, () => {
            try { fs.rmSync(baseDir, { recursive: true, force: true }); fs.unlinkSync(zipPath); } catch {}
        });
    } catch (err: any) {
        logger.error('Bulk zip error:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to create zip' });
    }
});

// Get Summary of Exceptions for multiple branches
router.get('/exception-summary', authenticateToken, async (req, res) => {
    try {
        const date = req.query.date as string;
        if (!date) return res.status(400).json({ error: 'Date is required' });
        
        const summary = await SnapshotOrchestrator.getExceptionSummary(date);
        res.json(summary);
    } catch (error: any) {
        console.error('Exception summary error:', error);
        res.status(500).json({ error: 'Failed to fetch exception summary' });
    }
});

export default router;
