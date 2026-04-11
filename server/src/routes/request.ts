import { Router } from 'express';
import prisma from '../lib/prisma';
import { parsePagination, getPaginatedResponse } from '../utils/pagination';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const isElevatedRequestUser = (user: any) =>
    ['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role) || user?.section === 'Planning';

async function getScopedRequest(requestId: string, user: any) {
    const request = await prisma.branchRequest.findUnique({
        where: { id: requestId },
        select: { id: true, userId: true, branchId: true }
    });

    if (!request) return null;

    if (isElevatedRequestUser(user)) return request;

    const isOwner = request.userId === user.id;
    const isSameBranch = !!user.branchId && request.branchId === user.branchId;
    return isOwner || isSameBranch ? request : null;
}

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
router.post('/', authenticateToken, async (req: any, res) => {
    const { titleEn, contentEn, category, priority, branchId, assignedSection, contentJson } = req.body;
    const effectiveBranchId = req.user?.branchId || branchId;

    if (!effectiveBranchId) {
        return res.status(400).json({ error: 'branchId is required' });
    }

    try {
        const request = await prisma.branchRequest.create({
            data: {
                titleEn,
                contentEn,
                category,
                priority: priority || 'MEDIUM',
                branchId: effectiveBranchId,
                userId: req.user.id,
                assignedSection,
                contentJson,
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
router.patch('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { status, priority, assignedSection, resolutionNotes } = req.body;
    try {
        const scopedRequest = await getScopedRequest(id, req.user);
        if (!scopedRequest) return res.status(404).json({ error: 'Request not found' });

        const canModerate = isElevatedRequestUser(req.user);
        if (!canModerate && (assignedSection !== undefined || resolutionNotes !== undefined || status !== undefined)) {
            return res.status(403).json({ error: 'Only regional or planning users can update request workflow fields' });
        }

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
router.post('/:id/comments', authenticateToken, async (req: any, res) => {
    const { id: requestId } = req.params;
    const { content } = req.body;
    try {
        const scopedRequest = await getScopedRequest(requestId, req.user);
        if (!scopedRequest) return res.status(404).json({ error: 'Request not found' });

        const comment = await prisma.comment.create({
            data: {
                content,
                userId: req.user.id,
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
