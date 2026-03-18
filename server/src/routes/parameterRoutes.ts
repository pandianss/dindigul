import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();


/**
 * GET /api/parameters
 * Fetches all registered parameters with hierarchy info and full descriptive metadata.
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { category, isEnabled } = req.query;
        const where: any = {};

        if (category) where.category = String(category);
        if (isEnabled !== undefined) where.isEnabled = isEnabled === 'true';

        const parameters = await prisma.misParameterRegistry.findMany({
            where,
            include: {
                parentParameter: {
                    select: {
                        displayName: true,
                        parameterName: true
                    }
                }
            },
            orderBy: [
                { category: 'asc' },
                { orderIndex: 'asc' },
                { parameterName: 'asc' }
            ]
        });

        // Fetch usage counts manually
        const counts = await prisma.budgetMaster.groupBy({
            by: ['parameterName'],
            _count: { parameterName: true }
        });

        const countMap = Object.fromEntries(counts.map(c => [c.parameterName, c._count.parameterName]));

        const results = parameters.map(p => ({
            ...p,
            budgetCount: countMap[p.parameterName] || 0
        }));

        res.json(results);
    } catch (error) {
        console.error('Failed to fetch parameters:', error);
        res.status(500).json({ error: 'Failed to fetch parameters' });
    }
});

/**
 * GET /api/parameters/hierarchy
 * Returns a hierarchical tree structure of parameters.
 */
router.get('/hierarchy', authenticateToken, async (req, res) => {
    try {
        const allParams = await prisma.misParameterRegistry.findMany({
            orderBy: { orderIndex: 'asc' }
        });

        const hierarchy: any[] = [];
        const map = new Map();

        allParams.forEach(p => {
            map.set(p.parameterName, { ...p, children: [] });
        });

        allParams.forEach(p => {
            const node = map.get(p.parameterName);
            if (p.parentParameterName && map.has(p.parentParameterName)) {
                map.get(p.parentParameterName).children.push(node);
            } else {
                hierarchy.push(node);
            }
        });

        res.json(hierarchy);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch parameter hierarchy' });
    }
});

/**
 * POST /api/parameters
 * Creates a new parameter.
 */
router.post('/', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

    const {
        parameterName,
        displayName,
        fullForm,
        description,
        category,
        isEnabled,
        orderIndex,
        parentParameterName
    } = req.body;

    try {
        // Check if parameterName already exists
        const existingParameter = await prisma.misParameterRegistry.findUnique({
            where: { parameterName: String(parameterName) }
        });

        if (existingParameter) {
            return res.status(409).json({ error: `Parameter with name '${parameterName}' already exists.` });
        }

        const newParameter = await prisma.misParameterRegistry.create({
            data: {
                parameterName: String(parameterName),
                displayName,
                fullForm,
                description,
                category,
                isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true, // Default to true if not provided
                orderIndex: orderIndex !== undefined ? parseInt(String(orderIndex)) : 0, // Default to 0 if not provided
                parentParameterName: parentParameterName || null
            }
        });

        res.status(201).json(newParameter);
    } catch (error) {
        console.error('Failed to create parameter:', error);
        res.status(500).json({ error: 'Failed to create parameter' });
    }
});

/**
 * PUT /api/parameters/:name
 * Updates metadata for a specific parameter.
 */
router.put('/:name', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

    const { name } = req.params;
    const {
        displayName,
        fullForm,
        description,
        category,
        isEnabled,
        orderIndex,
        parentParameterName
    } = req.body;

    try {
        // Prevent circular reference
        if (parentParameterName === name) {
            return res.status(400).json({ error: 'A parameter cannot be its own parent' });
        }

        const updated = await prisma.misParameterRegistry.update({
            where: { parameterName: String(name) },
            data: {
                displayName,
                fullForm,
                description,
                category,
                isEnabled,
                orderIndex: orderIndex !== undefined ? parseInt(String(orderIndex)) : undefined,
                parentParameterName: parentParameterName || null
            }
        });

        res.json(updated);
    } catch (error) {
        console.error(`Update failed for parameter ${name}:`, error);
        res.status(500).json({ error: 'Failed to update parameter metadata' });
    }
});

/**
 * DELETE /api/parameters/:name
 * Removes a parameter if it's not being used in any active budgets.
 */
router.delete('/:name', authenticateToken, async (req: any, res) => {
    const isPlanning = req.user.section?.toLowerCase() === 'planning';
    if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

    const { name } = req.params;
    const { force } = req.query;

    try {
        if (force === 'true') {
            await prisma.$transaction([
                prisma.budgetMaster.deleteMany({ where: { parameterName: String(name) } }),
                prisma.budgetHistory.deleteMany({ where: { parameterName: String(name) } }),
                prisma.misParameterRegistry.delete({ where: { parameterName: String(name) } })
            ]);
            return res.json({ message: 'Parameter and all associated budget data deleted successfully' });
        }

        // Standard delete check
        const usageCount = await prisma.budgetMaster.count({
            where: { parameterName: String(name) }
        });

        if (usageCount > 0) {
            return res.status(400).json({
                error: `Cannot delete parameter '${name}' as it is used in ${usageCount} budget records. Use force delete to remove all data.`
            });
        }

        await prisma.misParameterRegistry.delete({
            where: { parameterName: String(name) }
        });

        res.json({ message: 'Parameter deleted successfully' });
    } catch (error) {
        console.error('Delete failed:', error);
        res.status(500).json({ error: 'Failed to delete parameter' });
    }
});

export default router;
