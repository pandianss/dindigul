import { Router } from 'express';
import { AccountAnalyticsService } from '../services/accountAnalyticsService';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { format } from 'date-fns';

const router = Router();


// Upload Account Opening CSV
router.post('/upload', authenticateToken, async (req: any, res: any) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const { csvData, date } = req.body;
        if (!csvData) return res.status(400).json({ error: 'No CSV data provided' });

        const businessDate = date ? new Date(date) : new Date();
        const results = await AccountAnalyticsService.processAccountOpenings(csvData, businessDate);

        res.json({
            message: 'Account opening data processed successfully',
            results
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to process upload' });
    }
});

// Upload Account Closure CSV
router.post('/upload-closures', authenticateToken, async (req: any, res: any) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const { csvData, date } = req.body;
        if (!csvData) return res.status(400).json({ error: 'No CSV data provided' });

        const businessDate = date ? new Date(date) : new Date();
        const results = await AccountAnalyticsService.processAccountClosures(csvData, businessDate);

        res.json({
            message: 'Account closure data processed successfully',
            results
        });
    } catch (error: any) {
        console.error('Closure upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to process closure upload' });
    }
});

// Get Account Opening Analytics
router.get('/analytics', authenticateToken, async (req: any, res: any) => {
    try {
        const { solId } = req.query;
        const analytics = await AccountAnalyticsService.getAnalytics(solId as string);
        res.json(analytics);
    } catch (error: any) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
    }
});

// Get Specialized Intelligence Reports
router.get('/intelligence-reports', authenticateToken, async (req: any, res: any) => {
    try {
        const { solId } = req.query;
        const reports = await AccountAnalyticsService.getIntelligenceReports(solId as string);
        res.json(reports);
    } catch (error: any) {
        console.error('Intelligence reports error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch intelligence reports' });
    }
});

// Update System Configuration
router.post('/config', authenticateToken, async (req: any, res: any) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const { key, value } = req.body;
        console.log(`Updating config: ${key} = ${value}`);
        if (!key || value === undefined) return res.status(400).json({ error: 'Key and value are required' });

        const config = await prisma.systemConfig.upsert({
            where: { key },
            update: { value: typeof value === 'object' ? JSON.stringify(value) : value.toString() },
            create: {
                key,
                value: typeof value === 'object' ? JSON.stringify(value) : value.toString(),
                dataType: typeof value === 'number' ? 'NUMBER' : 'STRING',
                group: 'PLANNING'
            }
        });

        console.log(`Successfully updated ${key}`);

        // Trigger re-processing in background (don't await to avoid timeout)
        AccountAnalyticsService.reprocessAllAccounts().catch(err => console.error('Reprocess error:', err));

        res.json({ message: 'Configuration updated', config });
    } catch (error: any) {
        console.error(`Error updating config ${req.body.key}:`, error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

// Get System Configuration
router.get('/config/:key', authenticateToken, async (req: any, res: any) => {
    try {
        const { key } = req.params;
        const config = await prisma.systemConfig.findUnique({
            where: { key: String(key) }
        });
        res.json(config);
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to fetch configuration' });
    }
});

// Get Special Report: Top 10 / Bottom 10 Branch Rankings
router.get('/special-report', authenticateToken, async (req: any, res: any) => {
    try {
        const period = (req.query.period as string) === 'fy' ? 'fy' : 'month';
        const report = await AccountAnalyticsService.getSpecialReport(period);
        res.json(report);
    } catch (error: any) {
        console.error('Special report error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate special report' });
    }
});

// Download Special Report as Image (PNG)
router.get('/special-report/download', authenticateToken, async (req: any, res: any) => {
    try {
        const period = (req.query.period as string) === 'fy' ? 'fy' : 'month';
        const metric = req.query.metric as string; // Optional: sbNetOpening, cdNetOpening, etc.
        const imageBuffer = await AccountAnalyticsService.generateSpecialReportImage(period, metric);
        
        const timestamp = format(new Date(), 'yyyyMMdd_HHmm');
        const metricSuffix = metric ? `_${metric}` : '';
        const filename = `Special_Report_${period}${metricSuffix}_${timestamp}.png`;

        res.set({
            'Content-Type': 'image/png',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': imageBuffer.length
        });

        res.send(imageBuffer);
    } catch (error: any) {
        console.error('Special report download error:', error);
        res.status(500).json({ error: error.message || 'Failed to download special report' });
    }
});

// Force re-process all account data (use after fixing date issues)
router.post('/reprocess-all', authenticateToken, async (req: any, res: any) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });
    try {
        AccountAnalyticsService.reprocessAllAccounts().catch(err => console.error('Reprocess error:', err));
        res.json({ message: 'Re-processing started in background. Metrics will update shortly.' });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to start reprocessing' });
    }
});

export default router;

