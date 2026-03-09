import { Router } from 'express';
import { prisma } from '../index';
import { parsePagination, getPaginatedResponse } from '../utils/pagination';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get all requests — BRANCH_USER sees only their branch (GAP 03)
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        const { branchId, assignedSection, status } = req.query;
        // Branch users are restricted to their own branch
        const scopedBranchId = req.user?.role === 'BRANCH_USER'
            ? req.user.branchId
            : (branchId ? String(branchId) : undefined);

        const whereClause = {
            ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
            ...(assignedSection ? { assignedSection: String(assignedSection) } : {}),
            ...(status ? { status: String(status) } : {})
        };
        const { skip, take, page, limit } = parsePagination(req);

        const [requests, total] = await Promise.all([
            prisma.branchRequest.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    branch: true,
                    user: {
                        select: { fullNameEn: true, username: true }
                    },
                    comments: {
                        include: {
                            user: {
                                select: { fullNameEn: true }
                            }
                        },
                        orderBy: { createdAt: 'asc' }
                    }
                },
                skip,
                take
            }),
            prisma.branchRequest.count({ where: whereClause })
        ]);
        res.json(getPaginatedResponse(requests, total, page, limit));
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// Create a new request
router.post('/', async (req, res) => {
    const { titleEn, contentEn, category, priority, branchId, userId, assignedSection } = req.body;
    try {
        const request = await prisma.branchRequest.create({
            data: {
                titleEn,
                contentEn,
                category,
                priority: priority || 'MEDIUM',
                branchId,
                userId,
                assignedSection,
                status: 'OPEN'
            }
        });
        res.json(request);
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ error: 'Failed to create request' });
    }
});

// Update request status or assignment
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { status, priority, assignedSection, resolutionNotes } = req.body;
    try {
        const request = await prisma.branchRequest.update({
            where: { id },
            data: {
                ...(status ? { status } : {}),
                ...(priority ? { priority } : {}),
                ...(assignedSection ? { assignedSection } : {}),
                ...(resolutionNotes ? { resolutionNotes } : {})
            }
        });
        res.json(request);
    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// Add a comment to a request
router.post('/:id/comments', async (req, res) => {
    const { id: requestId } = req.params;
    const { content, userId } = req.body;
    try {
        const comment = await prisma.comment.create({
            data: {
                content,
                userId,
                requestId
            },
            include: {
                user: {
                    select: { fullNameEn: true }
                }
            }
        });
        res.json(comment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

export default router;
