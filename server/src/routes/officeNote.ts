import { Router } from 'express';
import { prisma } from '../index';
import { parsePagination, getPaginatedResponse } from '../utils/pagination';
import { generatePDF } from '../services/pdfService';
import { generateReference } from '../services/referenceService';
import { authenticateToken } from '../middleware/auth';
import { createNotification, notifyAdmins } from '../services/notificationService';
import fs from 'fs';
import path from 'path';

const router = Router();

// GAP 15: Submit note for review (DRAFT → SUBMITTED)
router.patch('/:id/submit', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const note = await prisma.officeNote.update({
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
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    try {
        const note = await prisma.officeNote.update({
            where: { id },
            data: { status: 'CHECKED' }
        });

        await createNotification(note.preparerId, 'Note Checked', `Your note "${note.titleEn}" has been checked by ${req.user.fullNameEn}.`, 'SUCCESS', `/office-notes/${id}`);

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to check note' });
    }
});

// GAP 15: Final approver approval (CHECKED → APPROVED)
router.patch('/:id/approve', authenticateToken, async (req: any, res) => {
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    try {
        const note = await prisma.officeNote.update({
            where: { id },
            data: { status: 'APPROVED', approverId: req.user.id }
        });

        await createNotification(note.preparerId, 'Note Approved', `Your note "${note.titleEn}" has been final approved.`, 'SUCCESS', `/office-notes/${id}`);

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve note' });
    }
});

// GAP 15: Reject note
router.patch('/:id/reject', authenticateToken, async (req: any, res) => {
    if (!['ADMIN', 'RO_USER'].includes(req.user?.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { id } = req.params;
    try {
        const note = await prisma.officeNote.update({
            where: { id },
            data: { status: 'REJECTED' }
        });

        await createNotification(note.preparerId, 'Note Rejected', `Your note "${note.titleEn}" was returned/rejected.`, 'ERROR', `/office-notes/${id}`);

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject note' });
    }
});


// Suggest a reference number based on department
router.get('/suggest-reference', authenticateToken, async (req: any, res) => {
    const { deptName } = req.query;
    if (!deptName) return res.status(400).json({ error: 'deptName required' });
    try {
        const { generateReference } = require('../services/referenceService');
        const ref = await generateReference('OFFICE_NOTE', deptName);
        res.json({ referenceNo: ref });
    } catch (err) {
        console.error('Reference suggestion error:', err);
        res.status(500).json({ error: 'Failed to suggest reference' });
    }
});

// Get all office notes
router.get('/', async (req, res) => {
    try {
        const { preparerId } = req.query;
        const { skip, take, page, limit } = parsePagination(req);
        const whereClause = {
            ...(preparerId ? { preparerId: String(preparerId) } : {}),
        };
        const [notes, total] = await Promise.all([
            prisma.officeNote.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    preparer: {
                        include: { department: true }
                    }
                },
                skip,
                take
            }),
            prisma.officeNote.count({ where: whereClause })
        ]);
        res.json(getPaginatedResponse(notes, total, page, limit));
    } catch (error) {
        console.error('Error fetching office notes:', error);
        res.status(500).json({ error: 'Failed to fetch office notes' });
    }
});

// Create a new office note
router.post('/', async (req, res) => {
    const { type, titleEn, titleTa, titleHi, contentJson, preparerId, referenceNo: manualReferenceNo, deptName: selectedDeptName } = req.body;
    try {
        const preparer = await prisma.user.findUnique({
            where: { id: preparerId },
            include: { department: true }
        });

        const deptName = selectedDeptName || preparer?.department?.nameEn || 'ADMIN';
        const referenceNo = manualReferenceNo || (await generateReference('OFFICE_NOTE', deptName));

        const note = await (prisma.officeNote as any).create({
            data: {
                type,
                titleEn,
                contentJson: typeof contentJson === 'string'
                    ? JSON.stringify({ ...JSON.parse(contentJson), titleTa, titleHi, deptName })
                    : JSON.stringify({ ...contentJson, titleTa, titleHi, deptName }),
                preparerId,
                status: 'DRAFT'
            }
        });

        // Update referenceNo using raw SQL to bypass Prisma Client sync issues
        await (prisma as any).$executeRaw`
            UPDATE office_notes SET "referenceNo" = ${referenceNo} WHERE id = ${note.id}
        `;
        note.referenceNo = referenceNo;

        res.json(note);
    } catch (error) {
        console.error('Error creating office note:', error);
        res.status(500).json({ error: 'Failed to create office note' });
    }
});

// GAP 19: Update office note with versioning
router.put('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { type, titleEn, contentJson, deptName } = req.body;
    try {
        const currentNote = await prisma.officeNote.findUnique({ where: { id } });
        if (!currentNote) return res.status(404).json({ error: 'Note not found' });

        if (currentNote.status === 'DRAFT') {
            const updated = await prisma.officeNote.update({
                where: { id },
                data: {
                    type,
                    titleEn,
                    contentJson: typeof contentJson === 'string' 
                        ? JSON.stringify({ ...JSON.parse(contentJson), deptName })
                        : JSON.stringify({ ...contentJson, deptName })
                }
            });
            res.json(updated);
        } else {
            // Document is beyond draft — create new version record (GAP 19)
            const newVersion = await (prisma.officeNote as any).create({
                data: {
                    type: type || currentNote.type,
                    titleEn: titleEn || currentNote.titleEn,
                    contentJson: typeof contentJson === 'string' 
                        ? JSON.stringify({ ...JSON.parse(contentJson), deptName })
                        : JSON.stringify({ ...(contentJson || {}), deptName }),
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

// GAP 15: Delete office note
router.delete('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const note = await prisma.officeNote.findUnique({ where: { id } });
        if (!note) return res.status(404).json({ error: 'Note not found' });

        // Only preparer or ADMIN can delete
        if (note.preparerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.officeNote.delete({ where: { id } });
        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Generate PDF for office note
router.get('/:id/pdf', async (req: any, res) => {
    const { id } = req.params;
    const { manualDate } = req.query; // Support passing a manual date

    try {
        const note = await prisma.officeNote.findUnique({
            where: { id },
            include: { 
                preparer: {
                    include: { department: true }
                } 
            }
        });

        if (!note) return res.status(404).json({ error: 'Note not found' });

        const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;

        // Use stored referenceNo or fallback to dynamic one if missing
        const refNo = (note as any).referenceNo || `RO/ADMIN/${new Date(note.createdAt).getFullYear()}/${note.id.slice(-4).toUpperCase()}`;
        
        const noteDate = manualDate || new Date(note.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });

        // Construct bodyHtml for the template
        let bodyHtml = '';

        if (note.type === 'PROFORMA_BRANCH_CODE') {
            bodyHtml = `
                <style>
                    .proforma-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
                    .proforma-table td { padding: 12px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
                    .proforma-table .label { font-weight: bold; width: 40%; background-color: #f8fafc; color: #475569; }
                    .proforma-table .value { width: 60%; color: #1e293b; }
                    .remarks-section { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                    .section-title { font-weight: bold; color: #1e3a5f; border-left: 4px solid #1e3a5f; padding-left: 12px; margin-bottom: 12px; font-size: 14px; }
                </style>

                <table class="proforma-table">
                    <tr><td class="label">1. Date of Opening</td><td class="value">${content.dateOfOpening || '-'}</td></tr>
                    <tr><td class="label">2. Name of the Branch / Office</td><td class="value">${content.branchName || '-'}</td></tr>
                    <tr><td class="label">3. Permission Letter / License Details</td><td class="value">${content.permissionDetails || '-'}</td></tr>
                    <tr><td class="label">4. Population Category</td><td class="value">${content.populationCategory || '-'}</td></tr>
                    <tr><td class="label">5. Population Centre</td><td class="value">${content.populationCentre || '-'}</td></tr>
                    <tr><td class="label">6. Community Development Block</td><td class="value">${content.communityBlock || '-'}</td></tr>
                    <tr><td class="label">7. Taluk/Tehsil</td><td class="value">${content.talukTehsil || '-'}</td></tr>
                    <tr><td class="label">8. District and State</td><td class="value">${content.districtState || '-'}</td></tr>
                    <tr><td class="label">9. Working Hours</td><td class="value">${content.workingHours || '-'}</td></tr>
                    <tr><td class="label">10. Complete Postal Address with Pin Code</td><td class="value">${content.postalAddress || '-'}</td></tr>
                    <tr><td class="label">11. Nearest Currency Chest</td><td class="value">${content.currencyChest || '-'}</td></tr>
                    <tr><td class="label">12. Authorised Dealer (FX Routing)</td><td class="value">${content.authorisedDealer || '-'}</td></tr>
                    <tr><td class="label">13. Whether branch is under CBS</td><td class="value">${content.underCBS || '-'}</td></tr>
                    <tr><td class="label">14. MICR Code if any obtained</td><td class="value">${content.micrCode || '-'}</td></tr>
                </table>

                <div class="remarks-section">
                    <div class="section-title">REMARKS / RECOMMENDATION</div>
                    <p style="line-height: 1.7; text-align: justify; font-size: 13px;">${content.details || 'Submitted for obtaining branch code for the newly opened unit.'}</p>
                </div>
            `;
        } else {
            bodyHtml = `
                <style>
                    .section-title { font-weight: bold; color: #1e3a5f; margin: 25px 0 10px 0; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
                    .main-para { margin-bottom: 15px; line-height: 1.7; text-align: justify; }
                    .data-row { display: flex; margin-bottom: 8px; font-size: 13px; }
                    .data-label { font-weight: bold; width: 180px; color: #475569; }
                    .data-value { flex: 1; color: #1e293b; }
                </style>
                <div class="main-content">
                    ${content.details ? content.details.split('\n').map((p: string) => p.trim() ? `<p class="main-para">${p}</p>` : '').join('') : ''}
                    
                    ${content.amount ? `
                        <div class="section-title">FINANCIAL IMPLICATIONS</div>
                        <div class="data-row"><div class="data-label">Proposed Amount:</div><div class="data-value">₹ ${Number(content.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
                    ` : ''}

                    ${content.branch ? `
                        <div class="section-title">AFFECTED UNIT</div>
                        <div class="data-row"><div class="data-label">Unit/Branch:</div><div class="data-value">${content.branch}</div></div>
                    ` : ''}

                    ${content.justification ? `
                        <div class="section-title">JUSTIFICATION & REMARKS</div>
                        <p class="main-para">${content.justification}</p>
                    ` : ''}
                </div>
            `;
        }

        const { generatePDF, buildPremiumLayout, getRegionalOfficeData } = require('../services/pdfService');

        // Fetch current RO and Org data from DB
        const RO_DATA = await getRegionalOfficeData();

        // Authority override for Proforma: Region Head signs instead of preparer
        const isProforma = note.type === 'PROFORMA_BRANCH_CODE';
        
        const html = buildPremiumLayout({
            title: isProforma ? 'PROFORMA FOR OBTENTION OF BRANCH CODE' : note.titleEn,
            subTitle: isProforma 
                ? 'கிளைக் குறியீடு பெறுவதற்கான படிவம் / शाखा कोड प्राप्त करने के लिए प्रोफார்मा' 
                : undefined,
            refNo,
            date: noteDate,
            bodyHtml,
            signatoryName: isProforma ? RO_DATA.signatoryName : note.preparer.fullNameEn,
            signatoryTitleEn: isProforma ? RO_DATA.signingAuthEn : (note.preparer.role === 'ADMIN' ? 'Administrator' : 'Preparer'),
            signatoryTitleHi: isProforma ? RO_DATA.signingAuthHi : (note.preparer.role === 'ADMIN' ? 'प्रशासक' : 'तैयारकर्ता'),
            signatoryTitleTa: isProforma ? RO_DATA.signingAuthTa : (note.preparer.role === 'ADMIN' ? 'நிர்வாகி' : 'தயாரிட்டவர்'),
            organization: RO_DATA
        });

        const pdfBuffer = await generatePDF(html);

        res.contentType('application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="OfficeNote_${note.id.slice(-4)}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

export default router;
