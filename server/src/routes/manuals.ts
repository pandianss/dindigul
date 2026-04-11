import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * GET /api/manuals
 * Retrieves all manuals for the user's department, or all manuals if ADMIN.
 */
router.get('/', authenticateToken, async (req: any, res) => {
    const { departmentId, role } = req.user;
    
    try {
        // ADMIN sees everything, RO_USER sees their department's manuals
        // BRANCH_USER sees all manuals (readonly) for operational awareness
        const where = (role === 'ADMIN' || role === 'BRANCH_USER') ? {} : { departmentId };
        
        const manuals = await prisma.departmentManual.findMany({
            where,
            include: {
                activities: true,
                department: {
                    select: {
                        nameEn: true,
                        code: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        
        res.json(manuals);
    } catch (error) {
        console.error('[Manuals] Fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch department manuals' });
    }
});

/**
 * POST /api/manuals
 * Creates a new manual. Restricted to ADMIN or RO_USER.
 */
router.post('/', authenticateToken, async (req: any, res) => {
    const { role, departmentId: userDepId } = req.user;
    if (role === 'BRANCH_USER') return res.status(403).json({ error: 'Only RO staff can create manuals' });

    const { titleEn, titleTa, titleHi, description, departmentId } = req.body;
    
    // Default to user's department if not provided (unless ADMIN)
    const finalDepId = (role === 'ADMIN' && departmentId) ? departmentId : userDepId;

    if (!finalDepId) {
        return res.status(400).json({ error: 'Department association is required' });
    }

    try {
        const manual = await prisma.departmentManual.create({
            data: {
                titleEn,
                titleTa,
                titleHi,
                description,
                departmentId: finalDepId
            }
        });
        res.json(manual);
    } catch (error) {
        console.error('[Manuals] Create error:', error);
        res.status(400).json({ error: 'Failed to create manual' });
    }
});

/**
 * PUT /api/manuals/:id
 * Updates an existing manual.
 */
router.put('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { role, departmentId: userDepId } = req.user;
    const { titleEn, titleTa, titleHi, description } = req.body;

    try {
        const existing = await prisma.departmentManual.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Manual not found' });

        // Authorization check: Only ADMIN or member of the department can edit
        if (role !== 'ADMIN' && existing.departmentId !== userDepId) {
            return res.status(403).json({ error: 'Unauthorized to edit this manual' });
        }

        const updated = await prisma.departmentManual.update({
            where: { id },
            data: { titleEn, titleTa, titleHi, description }
        });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

/**
 * DELETE /api/manuals/:id
 * Deletes a manual and all its activities.
 */
router.delete('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { role, departmentId: userDepId } = req.user;

    try {
        const existing = await prisma.departmentManual.findUnique({ where: { id } });
        if (!existing) return res.status(404).json({ error: 'Manual not found' });

        if (role !== 'ADMIN' && existing.departmentId !== userDepId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.departmentManual.delete({ where: { id } });
        res.json({ message: 'Manual deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

/**
 * POST /api/manuals/:id/activities
 * Adds a new activity to a manual.
 */
router.post('/:id/activities', authenticateToken, async (req: any, res) => {
    const { id: manualId } = req.params;
    const { role, departmentId: userDepId } = req.user;
    const { titleEn, titleTa, titleHi, description, frequency, dueDate } = req.body;

    try {
        const manual = await prisma.departmentManual.findUnique({ where: { id: manualId } });
        if (!manual) return res.status(404).json({ error: 'Manual not found' });

        if (role !== 'ADMIN' && manual.departmentId !== userDepId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const activity = await prisma.departmentActivity.create({
            data: {
                manualId,
                titleEn,
                titleTa,
                titleHi,
                description,
                frequency: frequency || 'MONTHLY',
                dueDate
            }
        });
        res.json(activity);
    } catch (error) {
        res.status(400).json({ error: 'Failed to add activity' });
    }
});

/**
 * PUT /api/manuals/activities/:activityId
 * Updates an activity.
 */
router.put('/activities/:activityId', authenticateToken, async (req: any, res) => {
    const { activityId } = req.params;
    const { role, departmentId: userDepId } = req.user;
    const { titleEn, titleTa, titleHi, description, frequency, dueDate, status } = req.body;

    try {
        const activity = await prisma.departmentActivity.findUnique({
            where: { id: activityId },
            include: { manual: true }
        });
        if (!activity) return res.status(404).json({ error: 'Activity not found' });

        if (role !== 'ADMIN' && activity.manual.departmentId !== userDepId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const updated = await prisma.departmentActivity.update({
            where: { id: activityId },
            data: { titleEn, titleTa, titleHi, description, frequency, dueDate, status }
        });
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: 'Update failed' });
    }
});

/**
 * DELETE /api/manuals/activities/:activityId
 * Removes an activity.
 */
router.delete('/activities/:activityId', authenticateToken, async (req: any, res) => {
    const { activityId } = req.params;
    const { role, departmentId: userDepId } = req.user;

    try {
        const activity = await prisma.departmentActivity.findUnique({
            where: { id: activityId },
            include: { manual: true }
        });
        if (!activity) return res.status(404).json({ error: 'Activity not found' });

        if (role !== 'ADMIN' && activity.manual.departmentId !== userDepId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await prisma.departmentActivity.delete({ where: { id: activityId } });
        res.json({ message: 'Activity removed' });
    } catch (error) {
        res.status(400).json({ error: 'Delete failed' });
    }
});

export default router;
