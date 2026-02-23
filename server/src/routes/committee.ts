import { Router } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All committee routes require authentication
router.use(authenticateToken as any);

// Get all committees
router.get('/', async (req: any, res) => {
    try {
        const committees = await (prisma as any).committee.findMany({
            include: {
                _count: {
                    select: { members: true }
                },
                meetings: {
                    orderBy: { date: 'desc' },
                    take: 1
                }
            }
        });
        res.json(committees);
    } catch (error) {
        console.error('Error fetching committees:', error);
        res.status(500).json({ error: 'Failed to fetch committees' });
    }
});

// GAP 22: Get committee members
router.get('/:id/members', async (req: any, res) => {
    const { id } = req.params;
    try {
        const members = await (prisma as any).committeeMember.findMany({
            where: { committeeId: id },
            include: {
                user: {
                    select: { id: true, fullNameEn: true, username: true, role: true }
                }
            },
            orderBy: { role: 'asc' }
        });
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// GAP 22: Add member to committee
router.post('/:id/members', async (req: any, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'RO_MANAGER') {
        return res.status(403).json({ error: 'Only ADMIN or RO_MANAGER can modify committees' });
    }
    const { id: committeeId } = req.params;
    const { userId, role } = req.body;
    try {
        const member = await (prisma as any).committeeMember.upsert({
            where: {
                committeeId_userId: { committeeId, userId }
            },
            update: { role: role || 'MEMBER' },
            create: { committeeId, userId, role: role || 'MEMBER' }
        });
        res.json(member);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// GAP 22: Remove member from committee
router.delete('/:id/members/:userId', async (req: any, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'RO_MANAGER') {
        return res.status(403).json({ error: 'Only ADMIN or RO_MANAGER can modify committees' });
    }
    const { id: committeeId, userId } = req.params;
    try {
        await (prisma as any).committeeMember.delete({
            where: {
                committeeId_userId: { committeeId, userId }
            }
        });
        res.json({ message: 'Removed' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// Get committee details and meetings
router.get('/:id/meetings', async (req: any, res) => {
    const { id } = req.params;
    try {
        const meetings = await (prisma as any).meeting.findMany({
            where: { committeeId: id },
            orderBy: { date: 'desc' },
            include: {
                actionPoints: {
                    include: {
                        assignedTo: {
                            select: { fullNameEn: true, username: true }
                        }
                    }
                }
            }
        });
        res.json(meetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

// Create a new meeting minutes record
router.post('/:id/meetings', async (req: any, res) => {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'RO_MANAGER') {
        return res.status(403).json({ error: 'Only ADMIN or RO_MANAGER can create meetings' });
    }
    const { id: committeeId } = req.params;
    const { date, venue, minutesJson, actionPoints } = req.body;
    try {
        const meeting = await (prisma as any).meeting.create({
            data: {
                committeeId,
                date: new Date(date),
                venue,
                minutesJson,
                status: 'FINALIZED',
                actionPoints: {
                    create: actionPoints?.map((ap: any) => ({
                        content: ap.content,
                        dueDate: ap.dueDate ? new Date(ap.dueDate) : null,
                        assignedToUserId: ap.assignedToUserId,
                        status: 'PENDING'
                    }))
                }
            },
            include: {
                actionPoints: true
            }
        });
        res.json(meeting);
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

// Get action points for a specific user
router.get('/action-points/:userId', async (req: any, res) => {
    const { userId } = req.params;
    try {
        const actionPoints = await (prisma as any).actionPoint.findMany({
            where: { assignedToUserId: userId },
            include: {
                meeting: {
                    include: {
                        committee: true
                    }
                }
            },
            orderBy: { dueDate: 'asc' }
        });
        res.json(actionPoints);
    } catch (error) {
        console.error('Error fetching action points:', error);
        res.status(500).json({ error: 'Failed to fetch action points' });
    }
});

// Update action point status
router.patch('/action-points/:id', async (req: any, res) => {
    const { id } = req.params;
    const { status, remarks, completionDate } = req.body;

    try {
        const ap = await (prisma as any).actionPoint.findUnique({
            where: { id },
            include: { assignedTo: true }
        });

        if (!ap) {
            return res.status(404).json({ error: 'Action point not found' });
        }

        const isAdminOrRo = req.user?.role === 'ADMIN' || req.user?.role === 'RO_MANAGER';
        const isAssignee = ap.assignedToUserId && ap.assignedToUserId === req.user?.id;

        if (!isAdminOrRo && !isAssignee) {
            return res.status(403).json({ error: 'Not authorised to update this action point' });
        }

        const updated = await (prisma as any).actionPoint.update({
            where: { id },
            data: {
                status,
                remarks,
                completionDate: completionDate ? new Date(completionDate) : undefined
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Error updating action point:', error);
        res.status(500).json({ error: 'Failed to update action point' });
    }
});

export default router;
