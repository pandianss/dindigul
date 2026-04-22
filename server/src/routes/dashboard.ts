import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { DashboardService } from '../services/dashboardService';

const router = express.Router();

router.get('/config', authenticateToken, async (req, res) => {
    try {
        const config = await DashboardService.getConfig();
        res.json(config);
    } catch (error) {
        console.error('Error fetching dashboard config:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch dashboard config' });
    }
});

// 7. Admin: Update SRM Message
router.post('/srm-message', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) {
        console.warn(`[Dashboard] Unauthorized SRM update attempt by ${req.user.username} (Section: ${req.user.section})`);
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { name, nameTa, nameHi, title, titleTa, titleHi, region, regionTa, regionHi, highlight, message } = req.body;
    try {
        const newMessage = await DashboardService.updateSrmMessage({
            name, nameTa, nameHi,
            title, titleTa, titleHi,
            region, regionTa, regionHi,
            highlight, message
        });
        res.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('Error updating SRM message:', error);
        res.status(500).json({ success: false, error: 'Failed to update message' });
    }
});

// 8. Admin: Add Dashboard Ticker
router.post('/tickers', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });
    const { text, expiresAt, linkUrl } = req.body;
    try {
        const ticker = await DashboardService.addTicker({ text, expiresAt, linkUrl });
        res.json({ success: true, ticker });
    } catch (error) {
        console.error('Error adding ticker:', error);
        res.status(500).json({ success: false, error: 'Failed to add ticker' });
    }
});

// 9. Admin: Update/Toggle Ticker
router.put('/tickers/:id', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });
    const { text, isActive, expiresAt, linkUrl, order } = req.body;
    try {
        const ticker = await DashboardService.updateTicker(req.params.id, { text, isActive, expiresAt, linkUrl, order });
        res.json({ success: true, ticker });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update ticker' });
    }
});

// 10. Admin: Delete Ticker
router.delete('/tickers/:id', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });
    try {
        await DashboardService.deleteTicker(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete ticker' });
    }
});

// 10. Admin: Get all tickers for management
router.get('/admin/tickers', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });
    try {
        const tickers = await DashboardService.getAdminTickers();
        res.json(tickers);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch tickers' });
    }
});

export default router;

