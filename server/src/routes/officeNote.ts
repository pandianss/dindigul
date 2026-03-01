import { Router } from 'express';
import { prisma } from '../index';
import { generatePDF } from '../services/pdfService';
import { authenticateToken } from '../middleware/auth';
import { createNotification, notifyAdmins } from '../services/notificationService';
import fs from 'fs';
import path from 'path';

const router = Router();

// GAP 15: Submit note for review (DRAFT → SUBMITTED)
router.patch('/:id/submit', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const note = await (prisma as any).officeNote.update({
            where: { id },
            data: { status: 'SUBMITTED' }
        });

        await notifyAdmins('New Office Note Submission', `Note "${note.titleEn}" has been submitted for review.`, `/office-notes/${id}`);

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit note' });
    }
});

// GAP 15: Checker approval (SUBMITTED → CHECKED)
router.patch('/:id/check', authenticateToken, async (req: any, res) => {
    if (!['ADMIN', 'RO_MANAGER', 'SECTION_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    try {
        const note = await (prisma as any).officeNote.update({
            where: { id },
            data: { status: 'CHECKED', checkerId: req.user.id, checkerApprovedAt: new Date() }
        });

        await createNotification(note.preparerId, 'Note Checked', `Your note "${note.titleEn}" has been checked by ${req.user.fullNameEn}.`, 'SUCCESS', `/office-notes/${id}`);

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to check note' });
    }
});

// GAP 15: Final approver approval (CHECKED → APPROVED)
router.patch('/:id/approve', authenticateToken, async (req: any, res) => {
    if (!['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    try {
        const note = await (prisma as any).officeNote.update({
            where: { id },
            data: { status: 'APPROVED', approverId: req.user.id, approverApprovedAt: new Date() }
        });

        await createNotification(note.preparerId, 'Note Approved', `Your note "${note.titleEn}" has been final approved.`, 'SUCCESS', `/office-notes/${id}`);

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve note' });
    }
});

// GAP 15: Reject note
router.patch('/:id/reject', authenticateToken, async (req: any, res) => {
    if (!['ADMIN', 'RO_MANAGER', 'SECTION_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    try {
        const note = await (prisma as any).officeNote.update({
            where: { id },
            data: { status: 'REJECTED' }
        });

        await createNotification(note.preparerId, 'Note Rejected', `Your note "${note.titleEn}" was returned/rejected.`, 'ERROR', `/office-notes/${id}`);

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject note' });
    }
});


// Get all office notes
router.get('/', async (req, res) => {
    try {
        const { preparerId } = req.query;
        const notes = await (prisma as any).officeNote.findMany({
            where: {
                ...(preparerId ? { preparerId: String(preparerId) } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                preparer: true
            }
        });
        res.json(notes);
    } catch (error) {
        console.error('Error fetching office notes:', error);
        res.status(500).json({ error: 'Failed to fetch office notes' });
    }
});

// Create a new office note
router.post('/', async (req, res) => {
    const { type, titleEn, titleTa, titleHi, contentJson, preparerId } = req.body;
    try {
        const note = await (prisma as any).officeNote.create({
            data: {
                type,
                titleEn,
                // These might not be in the schema yet, but for now we'll store them in contentJson if needed
                // or assume schema was updated. I'll stick to contentJson for safety if schema is unknown.
                contentJson: typeof contentJson === 'string'
                    ? contentJson
                    : JSON.stringify({ ...contentJson, titleTa, titleHi }),
                preparerId,
                status: 'DRAFT'
            }
        });
        res.json(note);
    } catch (error) {
        console.error('Error creating office note:', error);
        res.status(500).json({ error: 'Failed to create office note' });
    }
});

// GAP 19: Update office note with versioning
router.put('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { type, titleEn, contentJson } = req.body;
    try {
        const currentNote = await (prisma as any).officeNote.findUnique({ where: { id } });
        if (!currentNote) return res.status(404).json({ error: 'Note not found' });

        if (currentNote.status === 'DRAFT') {
            const updated = await (prisma as any).officeNote.update({
                where: { id },
                data: {
                    type,
                    titleEn,
                    contentJson: typeof contentJson === 'string' ? contentJson : JSON.stringify(contentJson)
                }
            });
            res.json(updated);
        } else {
            // Document is beyond draft — create new version record (GAP 19)
            const newVersion = await (prisma as any).officeNote.create({
                data: {
                    type: type || currentNote.type,
                    titleEn: titleEn || currentNote.titleEn,
                    contentJson: typeof contentJson === 'string' ? contentJson : JSON.stringify(contentJson || {}),
                    preparerId: req.user.id,
                    status: 'DRAFT',
                    version: currentNote.version + 1,
                    previousVersionId: currentNote.id
                }
            });
            res.json({ message: 'New version created', note: newVersion });
        }
    } catch (err) {
        console.error('Update error:', err);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Generate PDF for office note
router.get('/:id/pdf', async (req: any, res) => {
    const { id } = req.params;
    const { manualDate } = req.query; // Support passing a manual date

    try {
        const note = await (prisma as any).officeNote.findUnique({
            where: { id },
            include: { preparer: true }
        });

        if (!note) return res.status(404).json({ error: 'Note not found' });

        const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;

        // Construct refNo
        const refNo = `RO/ADMIN/${new Date(note.createdAt).getFullYear()}/${note.id.slice(-4).toUpperCase()}`;
        const noteDate = manualDate || new Date(note.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Construct bodyHtml for the template
        let bodyHtml = `
            <div class="subject-box">
                <div class="subject-title">SUBJECT: ${note.titleEn}</div>
                ${content.titleTa ? `<div class="subject-ta">பொருள்: ${content.titleTa}</div>` : ''}
            </div>
            <div class="main-content">
                ${content.details ? content.details.split('\n').map((p: string) => `<p>${p}</p>`).join('') : ''}
                
                ${content.amount ? `
                    <div class="section-title">FINANCIAL IMPLICATIONS</div>
                    <p>Proposed Amount: <strong>₹ ${Number(content.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></p>
                ` : ''}

                ${content.branch ? `
                    <div class="section-title">AFFECTED UNIT</div>
                    <p>Unit/Branch Code & Name: <strong>${content.branch}</strong></p>
                ` : ''}

                ${content.justification ? `
                    <div class="section-title">JUSTIFICATION & REMARKS</div>
                    <p>${content.justification}</p>
                ` : ''}
            </div>
        `;

        // Prepare logo base64
        let logoBase64 = '';
        const logoPath = path.join(process.cwd(), '..', 'public', 'assets', 'logo_center.svg');
        try {
            console.log('[OfficeNotePDF] Loading logo from:', logoPath);
            const logoBuffer = await fs.promises.readFile(logoPath);
            logoBase64 = logoBuffer.toString('base64');
            console.log('[OfficeNotePDF] Logo loaded successfully, size:', logoBuffer.length);
        } catch (err) {
            console.warn('[OfficeNotePDF] Logo not found at:', logoPath);
        }

        // Fetch Regional Office details for contact info
        const ro = await (prisma as any).branch.findUnique({
            where: { code: '6100' } // Regional Office code
        });

        const { renderTemplate } = require('../services/pdfService');
        const html = await renderTemplate('internal-note', {
            refNo,
            date: noteDate,
            department: 'Dindigul Regional Office',
            classification: 'INTERNAL ONLY',
            subject: note.titleEn,
            bodyHtml,
            createdBy: note.preparer.fullNameEn,
            designation: note.preparer.username,
            logoBase64,
            roAddressEn: ro?.address || 'Regional Office, Dindigul',
            roAddressTa: ro?.addressTa || '',
            roAddressHi: ro?.addressHi || '',
            roPhone: '0451-2423344',
            roEmail: 'rodindigul@iob.in'
        });

        const pdf = await generatePDF(html);

        // Save PDF to disk with name format: [date]_[refNo].pdf
        const safeRefNo = refNo.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeDate = noteDate.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${safeDate}_${safeRefNo}.pdf`;
        const uploadsDir = path.join(process.cwd(), 'uploads', 'office-notes');

        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        fs.writeFileSync(path.join(uploadsDir, fileName), pdf);

        res.contentType('application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdf);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

export default router;
