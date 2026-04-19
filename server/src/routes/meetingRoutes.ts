import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { generatePDF, buildMeetingMinutesHtml, getRegionalOfficeData } from '../services/pdfService';
import { logger } from '../utils/logger';

const router = Router();

// 1. Get List of Committees
router.get('/committees', authenticateToken, async (req, res) => {
    try {
        const committees = await prisma.committee.findMany({
            orderBy: { nameEn: 'asc' }
        });
        res.json(committees);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch committees' });
    }
});

// 2. Get Meetings for a Committee
router.get('/committee/:id/meetings', authenticateToken, async (req, res) => {
    try {
        const meetings = await prisma.meeting.findMany({
            where: { committeeId: req.params.id as string },
            orderBy: { date: 'desc' },
            include: { committee: true }
        });
        res.json(meetings);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

// 3. Create Meeting Draft
router.post('/', authenticateToken, async (req: any, res) => {
    const { committeeId, date, venue, attendees, signatories } = req.body;
    try {
        const meeting = await prisma.meeting.create({
            data: {
                committeeId,
                date: new Date(date),
                venue,
                attendees,
                signatories,
                status: 'DRAFT',
                minutesJson: JSON.stringify([]) // Empty structured table
            }
        });
        res.status(201).json(meeting);
    } catch (err) {
        logger.error('Failed to create meeting:', err);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

// 4. Update Minutes (Structured Table)
router.patch('/:id/minutes', authenticateToken, async (req, res) => {
    const { minutes, attendees, signatories, status, venue } = req.body;
    try {
        const updated = await prisma.meeting.update({
            where: { id: req.params.id as string },
            data: {
                minutesJson: minutes ? JSON.stringify(minutes) : undefined,
                attendees: attendees || undefined,
                signatories: signatories || undefined,
                status: status || undefined,
                venue: venue || undefined
            }
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update minutes' });
    }
});

// 5. Generate Minutes PDF
router.get('/:id/pdf', authenticateToken, async (req: any, res) => {
    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id: req.params.id as string },
            include: { committee: true }
        });

        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        // Resolve Signatories Detailed Info
        const sigList: any[] = Array.isArray(meeting.signatories) ? meeting.signatories : [];
        const resolvedSignatories = await Promise.all(sigList.map(async (sig: any) => {
            if (sig.userId) {
                const user = await prisma.user.findUnique({
                    where: { id: sig.userId },
                    include: { designation: true, department: true }
                });
                return {
                    name: user?.fullNameEn || sig.name,
                    designation: user?.designationEn || user?.designation?.nameEn || sig.designation,
                    department: user?.department?.nameEn || ''
                };
            }
            return sig;
        }));

        const roData = await getRegionalOfficeData();
        const html = buildMeetingMinutesHtml({
            committee: meeting.committee,
            dateStr: meeting.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }),
            venue: meeting.venue,
            attendees: meeting.attendees,
            minutes: JSON.parse(meeting.minutesJson || '[]'),
            resolvedSignatories
        }, roData);

        const pdfBuffer = await generatePDF(html);

        res.contentType('application/pdf');
        res.send(pdfBuffer);
    } catch (err) {
        logger.error('PDF Generation failed:', err);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

export default router;
