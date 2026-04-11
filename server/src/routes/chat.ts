import { Router } from 'express';
import { io } from '../index';
import prisma from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All chat routes require authentication
router.use(authenticateToken as any);

// POST /api/chat/query - RO/ADMIN creates a branch query
router.post('/query', async (req: any, res) => {
    const { branchCode, queryText, paramCodes } = req.body;

    if (!['ADMIN', 'RO_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Only ADMIN or Regional Office users can raise branch queries' });
    }

    if (!branchCode || !queryText) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const queryRecord = await prisma.branchQuery.create({
            data: {
                branchCode,
                queryText,
                askedBy: req.user.username,
                paramCodes: paramCodes ? JSON.stringify(paramCodes) : null,
                status: 'PENDING'
            }
        });

        const users = await prisma.user.findMany({
            where: {
                branch: { code: branchCode },
                role: { in: ['BRANCH', 'BRANCH_USER'] }
            },
            select: { fullNameEn: true }
        });
        const pendingUsers = users.map(u => u.fullNameEn);

        const roMessage = {
            id: uuidv4(),
            type: 'ro_query',
            room: `branch:${branchCode}`,
            user: req.user.username,
            role: ['ADMIN', 'RO_USER'].includes(req.user.role) ? req.user.role : 'RO_USER',
            text: queryText,
            payload: JSON.stringify({
                queryId: queryRecord.id,
                queryText,
                requestedBy: req.user.username,
                paramCodes: paramCodes || [],
                pendingUsers
            }),
            timestamp: new Date()
        };

        await prisma.chatMessage.create({ data: roMessage });

        io.to(`branch:${branchCode}`).emit('receive_message', {
            ...roMessage,
            payload: JSON.parse(roMessage.payload),
            timestamp: roMessage.timestamp.toISOString()
        });

        res.json({ ...queryRecord, pendingUsers });
    } catch (err) {
        console.error('Error creating chat query:', err);
        res.status(500).json({ error: 'Failed to create chat query' });
    }
});

// POST /api/chat/respond - Branch replies to a query
router.post('/respond', async (req: any, res) => {
    const { queryId, responseText, branchCode, branchName } = req.body;

    if (req.user?.role !== 'BRANCH_USER' && req.user?.role !== 'BRANCH') {
        return res.status(403).json({ error: 'Only branch users can respond to queries' });
    }

    if (!queryId || !responseText) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const queryRecord = await prisma.branchQuery.update({
            where: { id: queryId },
            data: {
                response: responseText,
                respondedBy: req.user.username,
                respondedAt: new Date(),
                status: 'ANSWERED'
            }
        });

        const branchMessage = {
            id: uuidv4(),
            type: 'branch_response',
            room: 'management',
            user: req.user.username,
            role: 'BRANCH_USER',
            branchCode,
            text: responseText,
            payload: JSON.stringify({
                queryId,
                branchCode,
                branchName,
                responseText,
                respondedAt: new Date().toISOString()
            }),
            timestamp: new Date()
        };

        await prisma.chatMessage.create({ data: branchMessage });

        io.to('management').emit('receive_message', {
            ...branchMessage,
            payload: JSON.parse(branchMessage.payload),
            timestamp: branchMessage.timestamp.toISOString()
        });

        // Also emit to the branch to show the response in their private channel
        await prisma.chatMessage.create({ data: { ...branchMessage, room: `branch:${branchCode}` } });
        io.to(`branch:${branchCode}`).emit('receive_message', {
            ...branchMessage,
            room: `branch:${branchCode}`,
            payload: JSON.parse(branchMessage.payload),
            timestamp: branchMessage.timestamp.toISOString()
        });

        res.json(queryRecord);
    } catch (err) {
        console.error('Error responding to chat query:', err);
        res.status(500).json({ error: 'Failed to submit response' });
    }
});

// GET /api/chat/history/:room - Admin/Refresh fetching historical messages
router.get('/history/:room', async (req: any, res) => {
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Only ADMIN or Regional Office users can view full chat history' });
    }
    const { room } = req.params;
    try {
        const messages = await prisma.chatMessage.findMany({
            where: { room },
            orderBy: { timestamp: 'desc' },
            take: 50
        });

        const mapped = await Promise.all(messages.reverse().map(async m => {
            let payload = m.payload ? JSON.parse(m.payload) : undefined;
            if (m.type === 'ro_query' && payload?.queryId) {
                const queryRec = await prisma.branchQuery.findUnique({ where: { id: payload.queryId } });
                if (queryRec?.status === 'PENDING') {
                    const users = await prisma.user.findMany({
                        where: { branch: { code: queryRec.branchCode }, role: 'BRANCH' },
                        select: { fullNameEn: true }
                    });
                    payload.pendingUsers = users.map(u => u.fullNameEn);
                } else if (queryRec?.status === 'ANSWERED') {
                    payload.pendingUsers = []; // Clear it out if resolved
                }
            }
            return {
                ...m,
                payload
            };
        }));

        res.json({ messages: mapped });
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// GET /api/chat/pending - RO/ADMIN fetching unresolved queries
router.get('/pending', async (req: any, res) => {
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Only ADMIN or Regional Office users can view pending queries' });
    }
    try {
        const pendingQueries = await prisma.branchQuery.findMany({
            where: { status: 'PENDING' },
            orderBy: { askedAt: 'desc' }
        });

        const pendingWithUsers = await Promise.all(pendingQueries.map(async (q) => {
            const users = await prisma.user.findMany({
                where: {
                    branch: { code: q.branchCode },
                    role: { in: ['BRANCH', 'BRANCH_USER'] }
                },
                select: { fullNameEn: true }
            });
            return {
                ...q,
                pendingUsers: users.map(u => u.fullNameEn)
            };
        }));

        res.json({ pending: pendingWithUsers });
    } catch (err) {
        console.error('Error fetching pending queries:', err);
        res.status(500).json({ error: 'Failed to fetch pending queries' });
    }
});

// GET /api/chat/history/summary/:sol - RO/ADMIN fetching summarized history
router.get('/history/summary/:sol', async (req: any, res) => {
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Only ADMIN or Regional Office users can view summary history' });
    }
    const { sol } = req.params;
    try {
        const messages = await prisma.chatMessage.findMany({
            where: { room: `branch:${sol}` },
            orderBy: { timestamp: 'desc' },
            take: 20
        });

        const queries = messages.filter(m => m.type === 'ro_query').length;
        const responses = messages.filter(m => m.type === 'branch_response').length;
        const alerts = messages.filter(m => m.type === 'mis_alert').length;

        res.json({
            branchCode: sol,
            summary: `Recent Activity: ${queries} Queries, ${responses} Responses, ${alerts} Alerts`,
            messages: messages.map(m => ({
                id: m.id,
                type: m.type,
                user: m.user,
                timestamp: m.timestamp
            }))
        });
    } catch (err) {
        console.error('Error fetching chat history summary:', err);
        res.status(500).json({ error: 'Failed to fetch history summary' });
    }
});

export default router;
