import { Router } from 'express';
import { prisma } from '../index';

const router = Router();

// Get all committees
router.get('/', async (req, res) => {
    try {
        const committees = await (prisma as any).committee.findMany({
            include: {
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

// Get committee details and meetings
router.get('/:id/meetings', async (req, res) => {
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
router.post('/:id/meetings', async (req, res) => {
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
router.get('/action-points/:userId', async (req, res) => {
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
router.patch('/action-points/:id', async (req, res) => {
    const { id } = req.params;
    const { status, remarks, completionDate } = req.body;
    try {
        const ap = await (prisma as any).actionPoint.update({
            where: { id },
            data: {
                status,
                remarks,
                completionDate: completionDate ? new Date(completionDate) : undefined
            }
        });
        res.json(ap);
    } catch (error) {
        console.error('Error updating action point:', error);
        res.status(500).json({ error: 'Failed to update action point' });
    }
});

export default router;
