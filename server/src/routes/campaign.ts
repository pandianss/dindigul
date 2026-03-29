import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as campaignService from '../services/campaignService';

const router = Router();

router.get('/', authenticateToken, async (req, res) => {
    try {
        const campaigns = await campaignService.getCampaigns();
        res.json(campaigns);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', authenticateToken, async (req, res) => {
    try {
        const campaign = await campaignService.createCampaign(req.body);
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const campaign = await campaignService.getCampaignById(req.params.id as string);
        if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/data', authenticateToken, async (req, res) => {
    try {
        const { branchId, date, value } = req.body;
        const entry = await campaignService.updateCampaignDailyData(req.params.id as string, branchId, new Date(date), value);
        res.json(entry);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id/performance', authenticateToken, async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date as string) : undefined;
        const rankings = await campaignService.getCampaignRankings(req.params.id as string, date);
        res.json(rankings);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const campaign = await campaignService.updateCampaign(req.params.id as string, req.body);
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await campaignService.deleteCampaign(req.params.id as string);
        res.json({ message: 'Campaign deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id/data/:entryId', authenticateToken, async (req, res) => {
    try {
        await campaignService.deleteCampaignDailyData(req.params.entryId as string);
        res.json({ message: 'Entry deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
