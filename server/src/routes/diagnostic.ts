import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../utils/logger';

const router = Router();

router.use(authenticateToken);

// DIAGNOSTIC ENDPOINT
router.get('/diagnostic', async (req, res) => {
    try {
        const count = await prisma.branch.count();
        logger.info(`[Diagnostic] Branch count: ${count}`);
        const sample = await prisma.branch.findFirst();
        res.json({
            status: 'ok',
            count,
            sample: sample ? { name: sample.nameEn, code: sample.code } : null,
            requestedUrl: req.originalUrl,
            timestamp: new Date().toISOString()
        });
    } catch (err: any) {
        logger.error(`[Diagnostic] Error: ${err.message}`);
        res.status(500).json({ error: err.message });
    }
});

export default router;
