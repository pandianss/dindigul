import { Router } from 'express';
import { io, prisma } from '../index';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { BusinessSnapshotService, MisStatus } from '../services/BusinessSnapshotService';
import { RuleEngine } from '../services/RuleEngine';
import { MISIngestionService } from '../services/MISIngestionService';
import { authenticateToken } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 25 * 1024 * 1024 }
});

const router = Router();

interface MISRecord {
    BranchCode: string;
    ParameterCode: string;
    Value: string;
    Budget?: string;
}

// Get latest snapshots for dashboard
router.get('/snapshots', async (req, res) => {
    try {
        const snapshots = await (prisma as any).snapshot.findMany({
            orderBy: { date: 'desc' },
            take: 20,
            include: {
                parameter: true,
                branch: true
            }
        });
        res.json(snapshots);
    } catch (error) {
        console.error('Error fetching snapshots:', error);
        res.status(500).json({ error: 'Failed to fetch snapshots' });
    }
});

// Get specific branch snapshot for chat command
router.get('/snapshot', async (req, res) => {
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
        const snapshots = await (prisma as any).snapshot.findMany({
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
        console.error('Error fetching branch snapshot:', error);
        res.status(500).json({ error: 'Failed to fetch snapshot' });
    }
});

// Upload MIS Excel (Pivot format)
router.post('/excel-upload', authenticateToken, upload.single('file'), async (req: any, res) => {
    if (!['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(req.user?.role)) {
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
        console.error('Excel processing error:', error);
        res.status(500).json({ error: error.message || 'Failed to process Excel file' });
    }
});

// Upload MIS CSV — Admin / RO_MANAGER only (GAP 02)
router.post('/upload', authenticateToken, async (req: any, res) => {
    if (!['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Forbidden: Only ADMIN or Regional Office users may upload MIS data' });
    }

    const { csvData, date } = req.body;

    if (!csvData || !date) {
        return res.status(400).json({ error: 'Missing csvData or date' });
    }

    try {
        const records: MISRecord[] = parse(csvData, {
            columns: true,
            skip_empty_lines: true
        });

        const uploadDate = new Date(date);

        for (const record of records) {
            const { BranchCode, ParameterCode, Value, Budget } = record;

            // Find branch
            const branch = await (prisma as any).branch.findUnique({
                where: { code: BranchCode }
            });

            if (!branch) {
                console.warn(`Branch not found: ${BranchCode}`);
                continue;
            }

            // Find parameter
            const parameter = await (prisma as any).parameter.findUnique({
                where: { code: ParameterCode }
            });

            if (!parameter) {
                console.warn(`Parameter not found: ${ParameterCode}`);
                continue;
            }

            const isNegative = Budget ? (parseFloat(Value) < parseFloat(Budget)) : false;

            // Upsert snapshot
            await (prisma as any).snapshot.create({
                data: {
                    date: uploadDate,
                    value: parseFloat(Value),
                    budget: Budget ? parseFloat(Budget) : null,
                    parameterId: parameter.id,
                    branchId: branch.id,
                    status: isNegative ? 'NEGATIVE' : 'POSITIVE'
                }
            });

            // If negative, emit mis_alert to management and branch rooms
            if (isNegative) {
                const alertPayload = {
                    branchCode: branch.code,
                    branchName: branch.nameEn,
                    paramCode: parameter.code,
                    paramName: parameter.name,
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
                    text: `${branch.nameEn} (${branch.code}) — ${parameter.name} moved to NEGATIVE`,
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
        console.error('Error processing MIS upload:', error);
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
        console.error('Error generating from staging:', error);
        res.status(500).json({ error: error.message || 'Failed to generate snapshots' });
    }
});

// Get business snapshot
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
        console.error('Error getting business snapshot:', error);
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
        console.error('Error freezing snapshot:', error);
        res.status(500).json({ error: 'Failed to freeze snapshot' });
    }
});

// Get all exceptions
router.get('/exceptions', authenticateToken, async (req, res) => {
    try {
        const exceptions = await (prisma as any).misException.findMany({
            where: { status: 'OPEN' },
            include: { branch: true },
            orderBy: { businessDate: 'desc' }
        });
        res.json(exceptions);
    } catch (error) {
        console.error('Error fetching exceptions:', error);
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
        console.error('Error fetching import logs:', error);
        res.status(500).json({ error: 'Failed to fetch import logs' });
    }
});

// Delete MIS import log (cascading)
router.delete('/import-logs/:id', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only ADMIN may delete MIS data' });
    }

    try {
        const { id } = req.params;
        await MISIngestionService.deleteImport(id);
        res.json({ message: 'Import deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting import:', error);
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
        console.error('Error fetching exception summary:', error);
        res.status(500).json({ error: 'Failed to fetch exception summary' });
    }
});

// Bulk finalize all snapshots for a date
router.post('/finalize-all', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'Missing date' });

    try {
        const result = await BusinessSnapshotService.finalizeAllSnapshots(String(date));
        res.json(result);
    } catch (error: any) {
        console.error('Error finalizing all snapshots:', error);
        res.status(500).json({ error: 'Failed to finalize snapshots' });
    }
});

// Trigger evaluation for all units on a date
router.post('/evaluate-all', authenticateToken, async (req: any, res) => {
    if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
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
        console.error('Error triggering evaluations:', error);
        res.status(500).json({ error: 'Failed to trigger evaluations' });
    }
});

export default router;
