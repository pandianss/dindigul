import { Router } from 'express';
import prisma from '../lib/prisma';
import { parsePagination, getPaginatedResponse } from '../utils/pagination';
import { generatePDF } from '../services/pdfService';
import { generateReference } from '../services/referenceService';
import { authenticateToken } from '../middleware/auth';
import { createNotification, notifyAdmins } from '../services/notificationService';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { officeNoteUpload as upload } from '../middleware/upload';

const router = Router();

const canManageOfficeNotes = (user: any) =>
    ['ADMIN', 'RO_USER', 'RO_MANAGER'].includes(user?.role) || user?.section === 'Planning';

const canEditOfficeNote = (user: any, note: { preparerId: string; approverId?: string | null }) =>
    canManageOfficeNotes(user) || note.preparerId === user.id || note.approverId === user.id;

async function getAccessibleOfficeNote(noteId: string, user: any) {
    const note = await prisma.officeNote.findUnique({
        where: { id: noteId },
        include: {
            preparer: {
                include: {
                    department: true,
                    branch: true,
                    designation: true
                }
            },
            approver: {
                include: { designation: true }
            }
        }
    });

    if (!note) return null;
    if (canManageOfficeNotes(user) || note.preparerId === user.id || note.approverId === user.id) return note;
    return null;
}

// upload configuration moved to centralized middleware
    // Submit note for review (DRAFT → SUBMITTED)
router.patch('/:id/submit', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const currentNote = await prisma.officeNote.findUnique({
            where: { id },
            select: { id: true, preparerId: true, approverId: true }
        });
        if (!currentNote) return res.status(404).json({ error: 'Note not found' });
        if (!canEditOfficeNote(req.user, currentNote)) return res.status(403).json({ error: 'Forbidden' });

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
    // Checker approval (SUBMITTED → CHECKED)
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
    // Final approver approval (CHECKED → APPROVED)
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


        await notifyAdmins('New Office Note Submission', `Note "${note.titleEn}" has been submitted for review.`, `/office-notes/${id}`);

        res.json(note);
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit note' });
    }
});
    // Checker approval (SUBMITTED to CHECKED)
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
    // Final approver approval (CHECKED to APPROVED)
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

// Freeze note (Snap current signatories and lock)
router.patch('/:id/freeze', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const note = await prisma.officeNote.findUnique({
            where: { id },
            include: { 
                preparer: { include: { designation: true } },
                approver: { include: { designation: true } }
            }
        });

        if (!note) return res.status(404).json({ error: 'Note not found' });
        if (!canEditOfficeNote(req.user, note)) return res.status(403).json({ error: 'Forbidden' });
        
        const { getRegionalOfficeData } = require('../services/pdfService');
        const RO_DATA = await getRegionalOfficeData();

        const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;
        
        // Logic to get current signatories (copied/referenced from PDF route)
        let initiator = {
            name: note.preparer.fullNameEn,
            nameTa: note.preparer.fullNameTa || undefined,
            nameHi: note.preparer.fullNameHi || undefined,
            titleEn: note.preparer.designationEn || (note.preparer.role === 'ADMIN' ? 'Administrator' : 'Preparer'),
            titleTa: note.preparer.designationTa || undefined,
            titleHi: note.preparer.designationHi || undefined
        };
        if (note.preparer.username === 'admin' || note.preparer.fullNameEn === 'System Administrator') {
            const satish = await prisma.user.findUnique({ where: { username: '63039' }, include: { designation: true } });
            if (satish) {
                initiator = {
                    name: satish.fullNameEn,
                    nameTa: satish.fullNameTa || undefined,
                    nameHi: satish.fullNameHi || undefined,
                    titleEn: satish.designationEn || (satish as any).designation?.nameEn || 'Preparer',
                    titleTa: satish.designationTa || (satish as any).designation?.nameTa || undefined,
                    titleHi: satish.designationHi || (satish as any).designation?.nameHi || undefined
                };
            }
        }

        const roChiefManagers = await prisma.user.findMany({
            where: {
                role: { in: ['RO_USER', 'RO_MANAGER'] },
                OR: [
                    { designation: { nameEn: { contains: 'Chief Manager', mode: 'insensitive' } } },
                    { designationEn: { contains: 'Chief Manager', mode: 'insensitive' } }
                ]
            },
            orderBy: { fullNameEn: 'asc' },
            include: { designation: true }
        });

        const reviewers = roChiefManagers.map(u => ({
            name: u.fullNameEn,
            nameTa: u.fullNameTa || undefined,
            nameHi: u.fullNameHi || undefined,
            titleEn: u.designationEn || 'Chief Manager',
            titleTa: u.designationTa || undefined,
            titleHi: u.designationHi || undefined
        }));

        const approver = {
            name: note.approver?.fullNameEn || RO_DATA.signatoryName || 'System Admin',
            nameTa: note.approver?.fullNameTa || RO_DATA.signatoryNameTa || '',
            nameHi: note.approver?.fullNameHi || RO_DATA.signatoryNameHi || '',
            titleEn: note.approver?.designationEn || RO_DATA.signingAuthEn || 'Approver',
            titleTa: note.approver?.designationTa || RO_DATA.signingAuthTa || '',
            titleHi: note.approver?.designationHi || RO_DATA.signingAuthHi || ''
        };

        const snapshot = {
            preparer: initiator,
            reviewers,
            approver,
            organization: {
                bankNameEn: RO_DATA.bankNameEn,
                bankNameHi: RO_DATA.bankNameHi,
                bankNameTa: RO_DATA.bankNameTa,
                officeNameEn: RO_DATA.officeNameEn,
                officeNameHi: RO_DATA.officeNameHi,
                officeNameTa: RO_DATA.officeNameTa,
                addressEn: RO_DATA.addressEn,
                addressHi: RO_DATA.addressHi,
                addressTa: RO_DATA.addressTa,
                phone: RO_DATA.phone,
                email: RO_DATA.email
            }
        };

        const updated = await prisma.officeNote.update({
            where: { id },
            data: {
                contentJson: JSON.stringify({
                    ...content,
                    isFrozen: true,
                    frozenAt: new Date().toISOString(),
                    signatorySnapshot: snapshot
                })
            }
        });

        res.json(updated);
    } catch (err) {
        logger.error('Freeze error:', err);
        res.status(500).json({ error: 'Failed to freeze note' });
    }
});

// Reject note
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


// Get valid initiators (RO staff, excluding RM and Chief Managers)
router.get('/initiators', authenticateToken, async (req: any, res) => {
    try {
        const initiators = await prisma.user.findMany({
            where: {
                OR: [
                    { role: { in: ['RO_USER', 'RO_MANAGER', 'ADMIN'] } },
                    { branch: { code: '3933' } }
                ],
                isRegionHead: false,
                NOT: {
                    designationEn: { contains: 'Chief Manager', mode: 'insensitive' }
                }
            },
            select: {
                id: true,
                fullNameEn: true,
                designationEn: true,
                username: true
            },
            orderBy: { fullNameEn: 'asc' }
        });
        res.json(initiators);
    } catch (err) {
        logger.error('Fetch initiators error:', err);
        res.status(500).json({ error: 'Failed to fetch initiators' });
    }
});

// Suggest a reference number based on department
router.get('/suggest-reference', authenticateToken, async (req: any, res) => {
    const { deptName, date } = req.query;
    if (!deptName) return res.status(400).json({ error: 'deptName required' });
    try {
        const { generateReference } = require('../services/referenceService');
        const ref = await generateReference('OFFICE_NOTE', deptName, date as string);
        res.json({ referenceNo: ref });
    } catch (err) {
        logger.error('Reference suggestion error:', err);
        res.status(500).json({ error: 'Failed to suggest reference' });
    }
});

// Get all office notes
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        const { preparerId } = req.query;
        const { skip, take, page, limit } = parsePagination(req);
        const whereClause = {
            ...(
                canManageOfficeNotes(req.user)
                    ? (preparerId ? { preparerId: String(preparerId) } : {})
                    : { preparerId: req.user.id }
            ),
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
        logger.error('Error fetching office notes:', error);
        res.status(500).json({ error: 'Failed to fetch office notes' });
    }
});

// Create a new office note
router.post('/', authenticateToken, async (req: any, res) => {
    const { type, titleEn, titleTa, titleHi, contentJson, preparerId, referenceNo: manualReferenceNo, deptName: selectedDeptName } = req.body;
    try {
        const effectivePreparerId = canManageOfficeNotes(req.user) && preparerId ? preparerId : req.user.id;
        const preparer = await prisma.user.findUnique({
            where: { id: effectivePreparerId },
            include: { department: true }
        });

        if (!preparer) return res.status(404).json({ error: 'Preparer not found' });

        const deptName = selectedDeptName || preparer?.department?.nameEn || 'ADMIN';
        const noteDate = (contentJson && typeof contentJson === 'object') ? contentJson.noteDate : (contentJson ? JSON.parse(contentJson).noteDate : null);
        const referenceNo = manualReferenceNo || (await generateReference('OFFICE_NOTE', deptName, noteDate));

        const note = await (prisma.officeNote as any).create({
            data: {
                type,
                titleEn,
                contentJson: typeof contentJson === 'string'
                    ? JSON.stringify({ ...JSON.parse(contentJson), titleTa, titleHi, deptName })
                    : JSON.stringify({ ...contentJson, titleTa, titleHi, deptName }),
                preparerId: effectivePreparerId,
                status: 'DRAFT'
            }
        });

        logger.info(`[Office Note] Created new draft with initiator: ${effectivePreparerId}`);

        // Update referenceNo using raw SQL to bypass Prisma Client sync issues
        await (prisma as any).$executeRaw`
            UPDATE office_notes SET "referenceNo" = ${referenceNo} WHERE id = ${note.id}
        `;
        note.referenceNo = referenceNo;

        res.json(note);
    } catch (error) {
        logger.error('Error creating office note:', error);
        res.status(500).json({ error: 'Failed to create office note' });
    }
});

// Upload scanned signed copy (GAP: GL Enabling workflow)
router.post('/:id/upload-scan', authenticateToken, upload.single('document'), async (req: any, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No document file uploaded' });

    try {
        const currentNote = await prisma.officeNote.findUnique({
            where: { id },
            select: { id: true, preparerId: true, approverId: true }
        });
        if (!currentNote) return res.status(404).json({ error: 'Note not found' });
        if (!canEditOfficeNote(req.user, currentNote)) return res.status(403).json({ error: 'Forbidden' });

        const scannedCopyUrl = `/uploads/office-notes/${req.file.filename}`;
        const note = await prisma.officeNote.update({
            where: { id },
            data: { 
                scannedCopyUrl,
                status: 'SIGNED' // Update status to reflect signed copy is attached
            } as any
        });

        await createNotification(note.preparerId, 'Signed Copy Uploaded', `Signed copy for note "${note.titleEn}" has been uploaded successfully.`, 'SUCCESS', `/office-notes/${id}`);

        res.json({ message: 'Scanned document uploaded successfully', note });
    } catch (err) {
        logger.error('Upload scan error:', err);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// Forward to Regional Office
router.patch('/:id/forward', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const currentNote = await prisma.officeNote.findUnique({ where: { id } });
        if (!currentNote) return res.status(404).json({ error: 'Note not found' });
        if (!canEditOfficeNote(req.user, currentNote)) return res.status(403).json({ error: 'Forbidden' });

        const note = await prisma.officeNote.update({
            where: { id },
            data: { status: 'FORWARDED_TO_RO' }
        });

        await notifyAdmins('Office Note Forwarded to RO', `Note "${note.titleEn}" has been forwarded to Regional Office by ${req.user.fullNameEn}.`, `/office-notes/${id}`);

        res.json(note);
    } catch (err) {
        logger.error('Forward error:', err);
        res.status(500).json({ error: 'Failed to forward note' });
    }
});


// Update office note with versioning
router.put('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { type, titleEn, contentJson, deptName, referenceNo, preparerId } = req.body;
    try {
        const currentNote = await getAccessibleOfficeNote(id, req.user);
        if (!currentNote) return res.status(404).json({ error: 'Note not found' });

        const currentContent = typeof currentNote.contentJson === 'string' ? JSON.parse(currentNote.contentJson) : (currentNote.contentJson as any);
        if (currentContent?.isFrozen) {
            return res.status(403).json({ error: 'Document is frozen and cannot be edited.' });
        }

        if (!canEditOfficeNote(req.user, currentNote)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const effectivePreparerId = canManageOfficeNotes(req.user) && preparerId
            ? preparerId
            : currentNote.preparerId;

        if (currentNote.status === 'DRAFT') {
            const updated = await prisma.officeNote.update({
                where: { id },
                data: {
                    type,
                    titleEn,
                    contentJson: typeof contentJson === 'string' 
                        ? JSON.stringify({ ...JSON.parse(contentJson), titleHi: req.body.titleHi, titleTa: req.body.titleTa, deptName })
                        : JSON.stringify({ ...contentJson, titleHi: req.body.titleHi, titleTa: req.body.titleTa, deptName }),
                    preparerId: effectivePreparerId
                }
            });

            logger.info(`[Office Note] Updated draft ${id} with initiator: ${effectivePreparerId}`);

            if (referenceNo) {
                await (prisma as any).$executeRaw`
                    UPDATE office_notes SET "referenceNo" = ${referenceNo} WHERE id = ${id}
                `;
                updated.referenceNo = referenceNo;
            }

            res.json(updated);
        } else {
            // Document is beyond draft - create new version record (GAP 19)
            const newVersion = await (prisma.officeNote as any).create({
                data: {
                    type: type || currentNote.type,
                    titleEn: titleEn || currentNote.titleEn,
                    status: 'DRAFT',
                    preparerId: effectivePreparerId,
                    version: (currentNote.version || 1) + 1,
                    previousVersionId: currentNote.id,
                    contentJson: typeof contentJson === 'string' 
                        ? JSON.stringify({ ...JSON.parse(contentJson), titleHi: req.body.titleHi, titleTa: req.body.titleTa, deptName })
                        : JSON.stringify({ ...(contentJson || {}), titleHi: req.body.titleHi, titleTa: req.body.titleTa, deptName }),
                }
            });

            logger.info(`[Office Note] Created new version from ${currentNote.id}. New version: ${newVersion.id}, initiator: ${effectivePreparerId}`);
            if (referenceNo) {
                await (prisma as any).$executeRaw`
                    UPDATE office_notes SET "referenceNo" = ${referenceNo} WHERE id = ${newVersion.id}
                `;
                newVersion.referenceNo = referenceNo;
            }

            res.json({ message: 'New version created', note: newVersion });
        }
    } catch (err) {
        logger.error('Update error:', err);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Delete office note
router.delete('/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const note = await prisma.officeNote.findUnique({ where: { id } });
        if (!note) return res.status(404).json({ error: 'Note not found' });
        const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : (note.contentJson as any);
        if (content?.isFrozen) {
            return res.status(403).json({ error: 'Frozen documents cannot be deleted.' });
        }

        // Only preparer or ADMIN can delete
        if (!canEditOfficeNote(req.user, note)) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await prisma.officeNote.delete({ where: { id } });
        res.json({ message: 'Note deleted successfully' });
    } catch (err) {
        logger.error('Delete error:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// Generate PDF for office note
router.get('/:id/pdf', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { manualDate } = req.query; // Support passing a manual date

    try {
        const note = await getAccessibleOfficeNote(id, req.user);
        if (!note) return res.status(404).json({ error: 'Note not found' });

        const content = (typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson) as any;

        // Use stored referenceNo or fallback to dynamic one if missing
        const fallbackYear = new Date(note.createdAt).getFullYear();
        const fallbackMonth = (new Date(note.createdAt).getMonth() + 1).toString().padStart(2, '0');
        const refNo = (note as any).referenceNo || `RO/ADMIN/${fallbackYear}/${fallbackMonth}/${note.id.slice(-2).toUpperCase()}`;
        
        const formatDate = (dStr: any) => {
            if (!dStr) return '-';
            const d = new Date(dStr);
            if (isNaN(d.getTime())) return '-';
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}.${month}.${year}`;
        };

        const noteDate = manualDate ? formatDate(manualDate) : formatDate(note.createdAt);

        // Construct bodyHtml for the template
        let bodyHtml = '';

        if (note.type === 'PROFORMA_BRANCH_CODE') {
            bodyHtml = `
                <style>
                    .proforma-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11.5px; }
                    .proforma-table td { padding: 4px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
                    .proforma-table .label { font-weight: bold; width: 38%; background-color: #f8fafc; color: #475569; }
                    .proforma-table .value { width: 62%; color: #1e293b; }
                    .remarks-section { margin-top: 10px; border-top: 1px solid #e2e8f0; padding-top: 8px; }
                    .section-title { font-weight: bold; color: #1e3a5f; border-left: 4px solid #1e3a5f; padding-left: 10px; margin-bottom: 6px; font-size: 12px; }
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
                    <p style="line-height: 1.4; text-align: justify; font-size: 12px;">${content.details || 'Submitted for obtaining branch code for the newly opened unit.'}</p>
                </div>
            `;
        } else if (note.type === 'MICR_CODE_REQUEST') {
            bodyHtml = `
                <style>
                    .micr-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
                    .micr-table th, .micr-table td { border: 1px solid #000; padding: 8px 10px; text-align: left; vertical-align: top; }
                    .micr-table .num { width: 5%; text-align: center; }
                    .micr-table .label { width: 45%; font-weight: bold; background-color: #f3f4f6; }
                    .micr-table .value { width: 50%; text-transform: uppercase; }
                    .sub-row { padding-left: 20px; }
                </style>

                <table class="micr-table">
                    <tbody>
                        <tr>
                            <td class="num">1</td>
                            <td class="label">Date of Opening</td>
                            <td class="value">${content.dateOfOpening ? new Date(content.dateOfOpening).toLocaleDateString('en-GB') : '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">2</td>
                            <td class="label">Name of the Branch / Office</td>
                            <td class="value">${content.branchName || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">3</td>
                            <td class="label">Permission Letter / License Details (Attached)</td>
                            <td class="value">${content.permissionDetails || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">4</td>
                            <td class="label">Population Category (Metro / Urban / Semi Urban / Rural)</td>
                            <td class="value">${content.populationCategory || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">5</td>
                            <td class="label">Taluk / Tehsil:</td>
                            <td class="value">${content.talukTehsil || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">6</td>
                            <td class="label">District / State:</td>
                            <td class="value">${content.districtState || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num" rowspan="3">7</td>
                            <td class="label">Working Hours:</td>
                            <td class="value"></td>
                        </tr>
                        <tr>
                            <td class="label" style="padding-left: 20px;">7.1. Week Days</td>
                            <td class="value">${content.workingHoursWeekdays || '-'}</td>
                        </tr>
                        <tr>
                            <td class="label" style="padding-left: 20px;">7.2. Saturdays (1st, 3rd, 5th)<br/>7.3 Holiday</td>
                            <td class="value">
                                ${content.workingHoursSaturdays || '-'} (Sat)<br/>
                                ${content.workingHoursHoliday || '-'} (Hol)
                            </td>
                        </tr>
                        <tr>
                            <td class="num">8</td>
                            <td class="label">Complete Postal address with Pincode:</td>
                            <td class="value">${content.postalAddressWithPin || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">9</td>
                            <td class="label">Whether Branch is under CBS</td>
                            <td class="value">${content.isUnderCBS || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">10</td>
                            <td class="label">Mail ID</td>
                            <td class="value" style="text-transform: none;">${content.mailId || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">11</td>
                            <td class="label">Landline Number</td>
                            <td class="value">${content.landlineNumber || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">12</td>
                            <td class="label">Branch Head Name and Contact No.</td>
                            <td class="value">${content.branchHeadDetails || '-'}</td>
                        </tr>
                        <tr>
                            <td class="num">13</td>
                            <td class="label">Controlling Office Contact Details</td>
                            <td class="value">${content.controllingOfficeDetails || '-'}</td>
                        </tr>
                    </tbody>
                </table>

                <div style="margin-top: 30px; font-size: 13px; line-height: 1.6;">
                    <p>The above details are submitted for onward transmission to RBI for allotment of MICR Code.</p>
                </div>
            `;
        } else if (note.type === 'HIGH_VALUE_DD') {
            bodyHtml = `
                <style>
                    .dd-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11.5px; }
                    .dd-table th, .dd-table td { padding: 4px 8px; border: 1px solid #cbd5e1; vertical-align: top; text-align: left; }
                    .dd-table th { background-color: #f8fafc; font-weight: bold; text-transform: uppercase; color: #1e3a5f; }
                    .dd-table .label { width: 38%; font-weight: bold; background-color: #f8fafc; }
                    .dd-table .value { width: 62%; }
                    .amount-cell { font-family: 'Courier New', monospace; font-weight: bold; font-size: 13px; }
                </style>
                <div class="subject-section" style="margin-bottom: 6px; font-weight: bold; font-family: 'NotoTamil', 'NotoHindi', sans-serif; text-align: center;">
                    <div style="font-size: 13px;">${(note.titleEn || '-').replace(/^High Value Demand Draft - /i, '')}</div>
                    <div style="width: 100%; border-bottom: 1px solid #000; margin-top: 1px;"></div>
                </div>


                <div class="dd-info">
                    <table class="dd-table">
                        <thead>
                            <tr><th>Particulars</th><th>Branch reply</th></tr>
                        </thead>
                        <tbody>
                            <tr><td class="label">Branch SOL ID</td><td class="value">${content.branchSol || '-'}</td></tr>
                            <tr><td class="label">Grade of Branch head</td><td class="value">${content.branchHeadGrade || '-'}</td></tr>
                            <tr><td class="label">Name of the applicant</td><td class="value">${content.applicantName || '-'}</td></tr>
                            <tr><td class="label">Account number</td><td class="value">${content.applicantAccount || '-'}</td></tr>
                            <tr><td class="label">Compliance of KYC norms</td><td class="value">${content.kycCompliance || 'Yes'}</td></tr>
                            <tr><td class="label">Date of Issue</td><td class="value">${formatDate(content.dateOfIssue)}</td></tr>
                            <tr><td class="label">Name of Beneficiary</td><td class="value">${content.beneficiaryName || '-'}</td></tr>
                            <tr><td class="label">Amount of Draft to be issued</td><td class="value amount-cell">₹ ${Number(content.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}/-</td></tr>
                            <tr><td class="label">Issuing Branch</td><td class="value font-bold">${content.issuingBranch || '-'}</td></tr>
                            <tr><td class="label">DD Drawn on</td><td class="value">${content.ddDrawnOn || '-'}</td></tr>
                            <tr><td class="label">Purpose of transaction</td><td class="value">${content.purpose || '-'}</td></tr>
                            <tr><td class="label">Transaction ID</td><td class="value">${content.transactionId || '-'}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="policy-section" style="margin-top: 6px;">
                    <div style="font-weight: bold; font-size: 11.5px; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a5f; text-transform: uppercase;">Policy Reference</div>
                    <table class="dd-table" style="font-size: 10.5px; margin-top: 5px;">
                        <thead>
                            <tr><th style="width: 40%">Issuing Department</th><th style="width: 20%">Date</th><th style="width: 40%">Circular Ref No</th></tr>
                        </thead>
                        <tbody>
                            ${(content.policyCirculars || []).length > 0 ? content.policyCirculars.map((p: any) => `
                                <tr>
                                    <td>${p.dept || '-'}</td>
                                    <td>${formatDate(p.date)}</td>
                                    <td>${p.ref || '-'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" style="text-align:center;">No specific policy references provided</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div class="recommendation-section" style="margin-top: 10px;">
                    <div style="font-weight: bold; font-size: 12px; margin-bottom: 3px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; color: #1e3a5f; text-transform: uppercase;">Department Recommendation</div>
                    <p style="line-height: 1.4; text-align: justify; font-size: 12px; color: #1e293b; font-weight: 500;">
                        Since the branch request satisfies extant guidelines in the referred circulars, we may approve the entry in Finacle using HHVDD menu.
                    </p>
                </div>

            `;
        } else if (note.type === 'EXPENSE_APPROVAL') {
            bodyHtml = `
                <style>
                    .exp-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11.5px; }
                    .exp-table th, .exp-table td { padding: 5px 10px; border: 1px solid #cbd5e1; text-align: left; }
                    .exp-table th { background-color: #f1f5f9; font-weight: bold; color: #1e3a5f; text-transform: uppercase; font-size: 10px; }
                    .exp-table .label { font-weight: bold; background-color: #f8fafc; width: 38%; color: #334155; }
                    .exp-table .value { width: 62%; color: #0f172a; }
                    .amount { font-family: 'Courier New', monospace; font-weight: bold; font-size: 13px; text-align: right; }
                    .section-hdr { font-weight: bold; font-size: 12px; color: #1e3a5f; border-bottom: 1.5px solid #1e3a5f; margin-bottom: 6px; margin-top: 14px; padding-bottom: 2px; display: inline-block; text-transform: uppercase; }
                </style>
                <div style="margin-bottom: 8px; font-weight: bold; font-family: 'NotoTamil', 'NotoHindi', sans-serif; text-align: center;">
                    <div style="width: 100%; border-bottom: 1.2px solid #000; margin-top: 4px;"></div>
                </div>


                <div class="section-hdr">1. Background & Justification</div>
                <div style="text-align: justify; line-height: 1.4; font-size: 12.5px; color: #1e293b;">${content.expensePurpose || '-'}</div>

                <div class="section-hdr">2. Financial Details</div>
                <table class="exp-table">
                    <tbody>
                        <tr><td class="label">Expense Category</td><td class="value">${content.expenseCategory || '-'} Expenditure</td></tr>
                        <tr><td class="label">GL Budget Head</td><td class="value">${content.budgetHead || '-'}</td></tr>
                        ${(content.budgetHead === 'Other Expenditure' || content.budgetHead === 'Other Expenditure (Sundries)') ? `
                        <tr><td class="label">Budget Allocated for FY</td><td class="value amount">₹ ${Number(content.budgetAllocated || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
                        <tr><td class="label">Budget Utilized so far</td><td class="value amount" style="color: #64748b;">₹ ${Number(content.budgetUtilized || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
                        <tr><td class="label">Remaining Balance</td><td class="value amount" style="color: ${ (Number(content.budgetAllocated || 0) - Number(content.budgetUtilized || 0) - Number(content.proposedAmount || 0)) < 0 ? '#ef4444' : '#059669' };">₹ ${(Number(content.budgetAllocated || 0) - Number(content.budgetUtilized || 0) - Number(content.proposedAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
                        ` : ''}
                        <tr><td class="label" style="background-color: #e2e8f0; font-size: 12px;">Proposed Expenditure Amount</td><td class="value amount" style="font-size: 14px; font-weight: 800;">₹ ${Number(content.proposedAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
                    </tbody>
                </table>

                <div class="section-hdr">3. Statutory & Vendor Details</div>
                <table class="exp-table">
                    <tbody>
                        <tr><td class="label">Selected Vendor / Beneficiary</td><td class="value" style="font-weight: bold">${content.vendorName || '-'}</td></tr>
                        <tr><td class="label">Vendor PAN / GSTIN</td><td class="value">${content.vendorPan || '-'}${content.vendorGst ? ` / ${content.vendorGst}` : ''}</td></tr>
                        <tr><td class="label">Quotation Basis</td><td class="value">${content.quotationBasis || '-'}</td></tr>
                        <tr><td class="label">TDS/GST Applicability</td><td class="value font-bold">${content.tdsApplicable || '-'}${content.gstApplicable ? ` / ${content.gstApplicable}` : ''}</td></tr>
                    </tbody>
                </table>

                <div class="section-hdr" style="margin-top: 15px;">4. Recommendation & Sanction</div>
                <div style="text-align: justify; line-height: 1.4; font-size: 13px; color: #000; font-weight: 500; margin-bottom: 20px;">${content.recommendation || '-'}</div>

            `;
        } else if (note.type === 'BROKEN_INTEREST') {
            const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-GB') : '-';
            const startDate = fmt(content.brokenPeriodStart);
            const endDate = fmt(content.brokenPeriodEnd);
            const openDate = fmt(content.depositOpenDate);
            const principalVal = parseFloat(content.principalAmount || '0');
            const rateVal = parseFloat(content.effectiveInterestRate || '0');
            const daysVal = parseInt(content.brokenPeriodDays || '0');
            const freq = content.compoundingFrequency || 'SIMPLE';
            const rDec = rateVal / 100;
            const t = daysVal / 365;
            let biInterest = parseFloat(content.calculatedInterest || '0');
            if (principalVal > 0 && rateVal > 0 && daysVal > 0) {
                if (freq === 'SIMPLE') {
                    biInterest = principalVal * rDec * daysVal / 365;
                } else {
                    const n = freq === 'MONTHLY' ? 12 : freq === 'QUARTERLY' ? 4 : freq === 'HALFYEARLY' ? 2 : 1;
                    biInterest = principalVal * Math.pow(1 + rDec / n, n * t) - principalVal;
                }
            }
            const freqLabelMap: Record<string,string> = {
                SIMPLE: 'Simple Interest (P × R × D / 365)',
                QUARTERLY: 'Compound — Quarterly',
                MONTHLY: 'Compound — Monthly',
                HALFYEARLY: 'Compound — Half-Yearly',
                ANNUALLY: 'Compound — Annually',
            };
            const freqLabel = freqLabelMap[freq] || freq;
            const principalFmt = principalVal > 0
                ? `₹ ${principalVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';
            const interestFmt = biInterest > 0
                ? `₹ ${biInterest.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';
            let formula = '';
            if (principalVal > 0 && rateVal > 0 && daysVal > 0) {
                if (freq === 'SIMPLE') {
                    formula = `₹${principalVal.toLocaleString('en-IN')} × ${rateVal}% × ${daysVal} days ÷ 365 = ${interestFmt}`;
                } else {
                    const n = freq === 'MONTHLY' ? 12 : freq === 'QUARTERLY' ? 4 : freq === 'HALFYEARLY' ? 2 : 1;
                    formula = `₹${principalVal.toLocaleString('en-IN')} × (1 + ${rateVal}%/${n})^(${n}×${t.toFixed(4)}y) − P = ${interestFmt}`;
                }
            }
            const isOrg = (content.depositorType || '').toLowerCase().includes('org');
            const custCategory = content.customerCategory || 'General';
            const dobStr = content.customerDob ? fmt(content.customerDob) : '-';
            const ageStr = content.customerAge ? `${content.customerAge} years` : '-';

            bodyHtml = `
                <style>
                    .bi-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                    .bi-table th, .bi-table td { border: 1px solid #dee2e6; padding: 6px 10px; text-align: left; }
                    .bi-table th { background-color: #f8f9fa; font-weight: bold; width: 42%; color: #343a40; }
                    .bi-table .val { color: #212529; font-family: "Courier New", Courier, monospace; font-weight: 600; }
                    .bi-table .val-plain { color: #212529; font-weight: 600; }
                    .bi-table .val-hl { color: #166534; font-family: "Courier New", Courier, monospace; font-weight: 700; font-size: 14px; }
                    .bi-table .val-rate { color: #dc2626; font-family: "Courier New", Courier, monospace; font-weight: 700; }
                    .bi-table .val-cat { color: #7c3aed; font-weight: 700; }
                    .bi-section { margin-top: 18px; font-size: 14px; font-weight: bold; color: #1e3a8a; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
                    .bi-text { text-align: justify; line-height: 1.5; font-size: 12.5px; color: #333; }
                    .bi-formula { font-family: "Courier New", Courier, monospace; font-size: 11px; color: #333; margin-top: 4px; padding: 6px 10px; background: #f0f4f8; border-left: 3px solid #1e3a8a; }
                </style>

                <div class="bi-section">1. Depositor &amp; Deposit Details</div>
                <table class="bi-table">
                    <tbody>
                        <tr><th>Depositor Type</th><td class="val-plain">${content.depositorType || 'Individual'}</td></tr>
                        <tr><th>Customer Category</th><td class="val-cat">${custCategory}${custCategory === 'Senior Citizen' ? ' (60–79 yrs, +0.50% spread)' : custCategory === 'Super Senior Citizen' ? ' (80+ yrs, +0.75% spread)' : ''}</td></tr>
                        <tr><th>CIF ID / Customer ID</th><td class="val">${content.cifId || '-'}</td></tr>
                        <tr><th>TD / FD Account Number</th><td class="val">${content.tdAccountNo || '-'}</td></tr>
                        <tr><th>Deposit Open Date</th><td class="val-plain">${openDate}</td></tr>
                        <tr><th>Contract Rate of Interest</th><td class="val-rate">${content.contractRate || '-'} %</td></tr>
                        <tr><th>Date of Birth</th><td class="val-plain">${isOrg ? '<em>N/A — Organization</em>' : dobStr}</td></tr>
                        <tr><th>Age</th><td class="val-plain">${isOrg ? '<em>N/A — Organization</em>' : ageStr}</td></tr>
                    </tbody>
                </table>

                <div class="bi-section">2. Rate Criteria</div>
                <table class="bi-table">
                    <tbody>
                        <tr><th>Base Interest Rate Claimed</th><td class="val">${content.claimedInterestRate || '0.00'} %</td></tr>
                        <tr><th>Additional Spread (Senior / Super Senior Citizen)</th><td class="val">${content.additionalSpread || '0.00'} %</td></tr>
                        <tr><th>Effective Interest Rate</th><td class="val-rate">${content.effectiveInterestRate || '0.00'} %</td></tr>
                    </tbody>
                </table>

                <div class="bi-section">3. Broken Period Details</div>
                <table class="bi-table">
                    <tbody>
                        <tr><th>Period Start Date</th><td class="val-plain">${startDate}</td></tr>
                        <tr><th>Period End Date</th><td class="val-plain">${endDate}</td></tr>
                        <tr><th>Total Days Claimed</th><td class="val">${content.brokenPeriodDays || '-'} Days</td></tr>
                    </tbody>
                </table>

                <div class="bi-section">4. Interest Calculation &mdash; ${freqLabel}</div>
                <table class="bi-table">
                    <tbody>
                        <tr><th>Principal / Deposit Amount</th><td class="val">${principalFmt}</td></tr>
                        <tr><th>Compounding Method</th><td class="val-plain">${freqLabel}</td></tr>
                        <tr><th>Effective Rate of Interest</th><td class="val-rate">${content.effectiveInterestRate || '0.00'} % p.a.</td></tr>
                        <tr><th>Number of Days (Broken Period)</th><td class="val">${content.brokenPeriodDays || '-'} Days</td></tr>
                        <tr><th style="background-color:#f0fdf4;">Broken Period Interest Amount</th><td class="val-hl">${interestFmt}</td></tr>
                    </tbody>
                </table>
                ${formula ? `<div class="bi-formula">Formula: ${formula}</div>` : ''}

                <div class="bi-section">5. Justification / Calculation Narrative</div>
                <div class="bi-text">${content.brokenPeriodJustification || 'No justification provided.'}</div>

                <div style="margin-top: 40px; font-size: 13px; color: #6c757d; font-style: italic; border-top: 1px dashed #ccc; padding-top: 10px;">
                    Note: Interest computed per RBI Master Circular on Interest Rates on Rupee Deposits (DBOD.No.Dir.BC.1/13.03.00/2012-13, Para 2.3 &amp; 2.9).
                </div>
            `;
        } else if (note.type === 'REVERSAL_CHARGES') {
            const chargeDate = content.revOriginalChargeDate ? new Date(content.revOriginalChargeDate).toLocaleDateString('en-GB') : '-';
            const origAmt = parseFloat(content.revOriginalChargeAmount || '0');
            const revAmt = parseFloat(content.revReversalAmount || '0');

            const fmtAmt = (val: number) => val > 0 
                ? `₹ ${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '-';

            bodyHtml = `
                <style>
                    .rev-table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11.5px; }
                    .rev-table th, .rev-table td { border: 1px solid #dee2e6; padding: 5px 10px; text-align: left; }
                    .rev-table th { background-color: #f8f9fa; font-weight: bold; width: 42%; color: #343a40; }
                    .rev-table .val { color: #212529; font-weight: 600; font-family: "Courier New", Courier, monospace; }
                    .rev-table .val-amt { color: #dc2626; font-weight: 700; font-family: "Courier New", Courier, monospace; }
                    .rev-table .val-rev { color: #166534; font-weight: 700; font-family: "Courier New", Courier, monospace; font-size: 13px; }
                    .rev-section { margin-top: 10px; font-size: 13px; font-weight: bold; color: #1e3a8a; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 6px; }
                    .rev-text { text-align: justify; line-height: 1.35; font-size: 12px; color: #333; margin-top: 4px; }
                    .rev-reason { font-weight: bold; color: #1e3a8a; }
                </style>

                <div class="rev-section">1. Account / Customer Details</div>
                <table class="rev-table">
                    <tbody>
                        <tr><th>Customer Name</th><td class="val">${content.revCustomerName || '-'}</td></tr>
                        <tr><th>Account Number</th><td class="val">${content.revAccountNumber || '-'}</td></tr>
                        <tr><th>CIF ID / Customer ID</th><td class="val">${content.revCifId || '-'}</td></tr>
                    </tbody>
                </table>

                <div class="rev-section">2. Original Charge Information</div>
                <table class="rev-table">
                    <tbody>
                        <tr><th>Type of Charge Charged</th><td class="val">${content.revChargeType || '-'}</td></tr>
                        <tr><th>Date of Original Charge</th><td class="val">${chargeDate}</td></tr>
                        <tr><th>Original Amount Charged</th><td class="val-amt">${fmtAmt(origAmt)}</td></tr>
                    </tbody>
                </table>

                <div class="rev-section">3. Reversal Justification</div>
                <table class="rev-table">
                    <tbody>
                        <tr><th>Proposed Reversal Amount</th><td class="val-rev">${fmtAmt(revAmt)}</td></tr>
                        <tr><th>Root Cause / Reason</th><td class="val" style="color:#1e3a8a;">${content.revReason || '-'}</td></tr>
                    </tbody>
                </table>

                <div class="rev-text">
                    <p style="margin-bottom: 5px;"><strong>Detailed Justification:</strong></p>
                    <div style="background:#f8fafc; padding:10px; border-radius:8px; border:1px solid #e2e8f0; font-size: 12px;">${content.revJustification || 'No justification provided.'}</div>
                </div>

                <div style="margin-top: 20px; font-size: 11px; color: #6c757d; font-style: italic; border-top: 1px dashed #ccc; padding-top: 8px;">
                    Note: Waiver of legitimate bank charges is subject to internal audit guidelines. System errors must be clearly documented and approved as per the delegation of powers.
                </div>

            `;
        } else if (note.type === 'GL_HEAD_ACTIVATION') {
            bodyHtml = `
                <style>
                    .gl-header { text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 5px; text-decoration: underline; }
                    .gl-subheader { text-align: center; font-size: 12px; margin-bottom: 20px; font-style: italic; }
                    .gl-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; table-layout: fixed; }
                    .gl-table th, .gl-table td { border: 1px solid #000; padding: 6px 10px; text-align: left; vertical-align: top; }
                    .gl-table th { width: 40%; font-weight: bold; background-color: #f3f4f6; }
                    .gl-val { font-weight: bold; font-family: "Courier New", Courier, monospace; word-wrap: break-word; }
                    .gl-section { background-color: #e5e7eb; font-weight: bold; padding: 4px 10px; margin-top: 15px; border: 1px solid #000; font-size: 13px; }
                    .gl-sign-area { margin-top: 30px; display: flex; justify-content: space-between; font-size: 12px; border-top: 1px solid #ccc; padding-top: 10px; }
                </style>

                <div style="text-align: right; font-weight: bold; font-size: 12px; margin-bottom: 10px;">Annexure 2</div>
                <div class="gl-header">Request Mandate form for RE OPENING OF BLOCKED GL Head / Account</div>
                <div class="gl-subheader">(To be filed by Owner department/unit For RE-OPENING / ENABLING Internal Office Account)</div>

                <table class="gl-table">
                    <tbody>
                        <tr><th>Ownership: Name of the CO Department/Unit with code</th><td class="gl-val">${content.glOwnershipDept || '-'}</td></tr>
                        <tr><th>Operation User: Name of the department/unit/Branch</th><td class="gl-val">${content.glOperationUser || '-'}</td></tr>
                        <tr><th>GL Office Account No - &lt;FORACID&gt;</th><td class="gl-val">${content.glAccountNo || '-'}</td></tr>
                        <tr><th>Account Description</th><td class="gl-val">${content.glAccountDesc || '-'}</td></tr>
                        <tr>
                            <th>Purpose of Reopening/ Enabling</th>
                            <td class="gl-val">
                                <div><strong>Justification/Fund Flow:</strong></div>
                                <div style="margin-top: 5px;">${content.glPurpose || '-'}</div>
                            </td>
                        </tr>
                        <tr><th>Type of Operation</th><td class="gl-val">${content.glOpType || '-'} / ${content.glDrCrBoth || '-'}</td></tr>
                        <tr><th>Is the Account - recorder of Asset or Liability</th><td class="gl-val">${content.glAssetLiability || '-'}</td></tr>
                        <tr><th>Activity - Parking / Pooling / Generic</th><td class="gl-val">${content.glActivity || '-'}</td></tr>
                        <tr><th>Any Limits / Restrictions</th><td class="gl-val">${content.glLimits || '-'}</td></tr>
                        <tr><th>Name of the monitoring CO Dept/ Unit</th><td class="gl-val">${content.glMonitoringDept || '-'}</td></tr>
                        <tr><th>For Operation by Branch Only/ Inter Branch / CO only/ Inter CO Dept./ Branch &amp; CO</th><td class="gl-val">${content.glOperationBy || '-'}</td></tr>
                        <tr><th>CASH Operation</th><td class="gl-val">${content.glCashOp || '-'}</td></tr>
                        <tr><th>Is it a Finacle Mandatory A/C?</th><td class="gl-val">${content.glFinacleMandatory || '-'}</td></tr>
                        <tr><th>Does the Account need Pointer facility</th><td class="gl-val">${content.glPointerFacility || '-'}</td></tr>
                        <tr><th>Revoke of Status to Block / Periodicity of Liveliness of account</th><td class="gl-val">${content.glRevokeStatus || '-'}</td></tr>
                        <tr><th>Whether RO need delegated power to Unblock and Enable</th><td class="gl-val">${content.glRoPower || '-'}</td></tr>
                        <tr><th>Reconciliation Mandate</th><td class="gl-val">${content.glReconMandate || '-'}</td></tr>
                        <tr><th>Whether Account will be reconciled to ZERO by Day End - EOD-Check required?</th><td class="gl-val">${content.glReconZeroEod || '-'}</td></tr>
                    </tbody>
                </table>

                <div class="gl-sign-area">
                    <div style="width: 30%;">
                        <div>Date: ${new Date().toLocaleDateString('en-GB')}</div>
                        <div style="margin-top: 40px;">Intending User Department/Unit</div>
                    </div>
                    <div style="width: 30%; text-align: right;">
                        <div style="margin-top: 55px;">Signature &amp; Seal of Branch Head</div>
                    </div>
                </div>

                <div class="gl-section">Remarks by Regional Office (In Case of Branch Request)</div>
                <div style="height: 60px; border: 1px solid #000; border-top: none; padding: 10px; font-size: 11px; color: #666;">
                    Date: ........................ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Seal &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Signature: ........................
                </div>

                <div class="gl-section">Remarks/ Recommendation by Central Office Department/ HOD Ownership</div>
                <div style="height: 80px; border: 1px solid #000; border-top: none; padding: 10px; font-size: 11px;">
                    <p>Recommended to REOPEN/ ENABLE GL a/c................................................</p>
                    <p style="margin-top: 20px;">Date: ........................ &nbsp;&nbsp;&nbsp;&nbsp; Seal &nbsp;&nbsp;&nbsp;&nbsp; HOD/GM Signature: ........................</p>
                </div>
            `;
        } else if (note.type === 'RBI_BO_PROFORMA') {
            const unit = note.preparer.branch || {
                nameEn: 'Not found in database',
                district: '-',
                populationGroup: '-',
                address: '-',
                pincode: '000000'
            }; // Fallback for users without an assigned branch (e.g. Administrator)

            const c = content;
            const val = (v: any) => (v && String(v).trim()) ? String(v) : '';
            const check = (v: any, target: any) => (v && v.toUpperCase() === (target && target.toUpperCase())) ? '☒' : '☐';
            const box = (v: any, len: number) => {
                const chars = String(v || '').slice(0, len).padEnd(len, ' ').split('');
                return chars.map(ch => `<span class="char-box">${ch}</span>`).join('');
            };
            const svc = (c.rbi_services as any) || {};

            bodyHtml = `
                <style>
                    @page { size: A4; margin: 25mm 25mm; }
                    .proforma-container { 
                        font-family: 'Century Gothic', 'Tw Cen MT', Futura, Geneva, sans-serif; 
                        color: #000; line-height: 1.5; padding: 0; font-size: 16px; 
                    }
                    .annex-hdr { text-align: right; font-weight: bold; text-decoration: underline; margin-bottom: 25px; font-size: 16px; }
                    .main-tit { text-align: center; font-weight: bold; font-size: 22px; text-decoration: underline; margin-bottom: 5px; }
                    .stmt-desc { font-weight: bold; text-align: center; font-size: 14px; margin: 0 auto 30px auto; max-width: 95%; line-height: 1.5; }
                    .page-footer { text-align: right; font-weight: bold; text-decoration: underline; font-size: 14px; margin-top: 40px; }
                    .sec-row { display: flex; margin-bottom: 12px; align-items: flex-start; }
                    .sec-num { width: 35px; flex-shrink: 0; font-weight: bold; }
                    .sec-lbl { flex: 1; padding-right: 15px; }
                    .sec-val { width: 45%; flex-shrink: 0; }
                    .sub-row { display: flex; margin-bottom: 10px; margin-left: 55px; align-items: flex-start; }
                    .sub-num { width: fit-content; min-width: 45px; padding-right: 10px; flex-shrink: 0; }
                    .sub-lbl { flex: 1; padding-right: 10px; }
                    .sub-val { width: 45%; flex-shrink: 0; }
                    .cb-group { display: flex; flex-wrap: wrap; gap: 10px; }
                    .cb-item { display: flex; align-items: center; margin-bottom: 4px; width: 100%; max-width: 320px; }
                    .cb-label { flex: 1; min-width: 0; }
                    .cb-sq { font-size: 19px; margin-left: auto; width: 22px; text-align: center; font-family: "Segoe UI Symbol", sans-serif; height: 18px; line-height: 18px; display: inline-block; vertical-align: middle; position: relative; top: -1px; }
                    .char-box { display: inline-block; width: 15px; height: 16px; border: 0.5px solid #000; text-align: center; margin-right: -1px; font-family: monospace; font-weight: bold; line-height: 16px; vertical-align: middle; background: #fff; }
                    .underscore { border-bottom: 0.5px solid #000; min-width: 150px; display: inline-block; padding: 0 5px; font-weight: bold; transform: translateY(5px); }
                    .value-box { border: 0.5px solid #000; padding: 2px 10px; display: inline-block; min-width: 300px; font-weight: bold; background: #fff; transform: translateY(2px); }
                    .date-boxes { display: flex; align-items: center; }
                    .footnote { font-size: 14px; margin-top: 30px; line-height: 1.4; border-top: 0.5px solid #000; padding-top: 10px; text-align: justify; }
                    .page-break { page-break-after: always; clear: both; }
                    table.timings { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    table.timings td, table.timings th { border: 0.5px solid #000; padding: 6px; text-align: center; font-size: 12px; }
                    .bold { font-weight: bold; }
                    .underline { text-decoration: underline; }
                </style>

                <div class="proforma-container">
                    <!-- PAGE 1 -->
                    <div class="annex-hdr">ANNEX-I</div>
                    <div class="main-tit underline">Proforma</div>
                    <div class="stmt-desc">
                        Statement for Reporting of Information on Full/Part Time Banking Outlets (BOs) (Brick 
                        & Mortar Branch<sup>1</sup> or Fixed-Point Business Correspondent (BC) outlet<sup>2</sup> )/Offices/Other 
                        Fixed Customer Service Points (CSPs) i.e. other than BOs like ATMs, Cash Deposit 
                        Machines, Other Customer Services, etc. - Opened/Closed/Conversion, etc.<br/>
                        (Applicable for All Banks and All India Financial Institutions)
                    </div>

                    <div class="sec-row">
                        <div class="sec-num">1.</div>
                        <div class="sec-lbl">Bank/Institution Details<sup>3</sup> :</div>
                        <div class="sec-val bold">System Driven</div>
                    </div>

                    <div class="sec-row">
                        <div class="sec-num">2.</div>
                        <div class="sec-lbl">Action for Reporting :</div>
                        <div class="sec-val">
                             <div class="cb-item" style="max-width: 350px;">
                                <div class="cb-label">Addition (Opening of new banking Outlet/unit, etc.)</div>
                                <div class="cb-sq">${check(c.rbi_action, 'ADDITION')}</div>
                             </div>
                             <div style="margin-left: 80px; margin-bottom: 15px;">
                                <div class="cb-item" style="max-width: 270px;"><div class="cb-label">Opened</div><div class="cb-sq">${check(c.rbi_additionStatus, 'OPENED')}</div></div>
                                <div class="cb-item" style="max-width: 270px;"><div class="cb-label">Planned<sup>4</sup></div><div class="cb-sq">${check(c.rbi_additionStatus, 'PLANNED')}</div></div>
                             </div>
                             <div style="display: flex;">
                                <div style="width: 80px; font-weight: bold;">OR</div>
                                <div style="flex: 1;">
                                    <div class="cb-item" style="max-width: 270px;"><div class="cb-label">Updation</div><div class="cb-sq">${check(c.rbi_action, 'UPDATION')}</div></div>
                                    <div class="cb-item" style="max-width: 270px;"><div class="cb-label">Updating of existing Information</div><div class="cb-sq">${check(c.rbi_action, 'UPDATING_INFO')}</div></div>
                                    <div class="cb-item" style="max-width: 270px;"><div class="cb-label">Closure</div><div class="cb-sq">${check(c.rbi_action, 'CLOSURE')}</div></div>
                                    <div class="cb-item" style="max-width: 270px;"><div class="cb-label">Permanent Closed</div><div class="cb-sq">${check(c.rbi_action, 'PERMANENT_CLOSED')}</div></div>
                                    <div class="cb-item" style="max-width: 270px;"><div class="cb-label">Merged</div><div class="cb-sq">${check(c.rbi_action, 'MERGED')}</div></div>
                                    <div class="cb-item" style="max-width: 270px;"><div class="cb-label">Conversion</div><div class="cb-sq">${check(c.rbi_action, 'CONVERSION')}</div></div>
                                </div>
                             </div>
                        </div>
                    </div>

                    <div class="sec-row" style="margin-top: 15px;">
                        <div class="sec-num">3.</div>
                        <div class="sec-lbl italic">If proforma is for updating information</div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">3.1.</div>
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: baseline;">
                                <div style="width: 280px; flex-shrink: 0;">Part-I Code of updating :</div>
                                <div class="underscore" style="flex: 1;">${val(c.rbi_updatePartICode)}</div>
                            </div>
                            <div style="font-size: 11px; margin-top: 5px; line-height: 1.2; margin-left: 280px;">
                                [Banking Outlet (Full/ Part-time), Administrative/Back Office (7 digits), NAIOs<sup>5</sup>, ATMs, Other Fixed CSPs (16 digits)]
                            </div>
                        </div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">3.2.</div>
                        <div class="sub-lbl">Effective Date of Change : </div>
                        <div class="sub-val date-boxes">
                            ${box(c.rbi_updateEffectiveDate?.split('-')[2], 2)} / ${box(c.rbi_updateEffectiveDate?.split('-')[1], 2)} / ${box(c.rbi_updateEffectiveDate?.split('-')[0], 4)}
                            <br/><span style="font-size: 10px; margin-left: 5px;">Day</span> <span style="font-size: 10px; margin-left: 20px;">Month</span> <span style="font-size: 10px; margin-left: 20px;">Year</span>
                        </div>
                    </div>

                    <div class="sec-row" style="margin-top: 25px;">
                        <div class="sec-num">4.</div>
                        <div class="sec-lbl italic">Conversion from B&M Branch/Fixed Point BC etc.<sup>6</sup></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">4.1.</div><div style="width: 280px; flex-shrink: 0;">Conversion From :</div><div class="value-box">To be selected from database</div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">4.2.</div><div style="width: 280px; flex-shrink: 0;">Conversion To :</div><div class="value-box">To be selected from database</div>
                    </div>
                    <div class="sub-row" style="align-items: baseline;">
                        <div class="sub-num">4.3.</div><div style="width: 280px; flex-shrink: 0;">Part-1 Code :</div><div class="underscore" style="flex: 1;">${val(c.rbi_part1Code)}</div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">4.4.</div>
                        <div style="width: 280px; flex-shrink: 0;">Conversion Date :</div>
                        <div class="date-boxes">
                            ${box(c.rbi_conversionDate?.split('-')[2], 2)} / ${box(c.rbi_conversionDate?.split('-')[1], 2)} / ${box(c.rbi_conversionDate?.split('-')[0], 4)}
                            <div style="font-size: 11px; display: flex; gap: 20px; margin-top: 5px;">
                                <span>Day</span> <span>Month</span> <span>Year</span>
                            </div>
                        </div>
                    </div>

                    <div class="footnote">
                        <div><sup>1</sup> Manned by bank staff.</div>
                        <div><sup>2</sup> Including Access Points of Payments Banks.</div>
                        <div><sup>3</sup> Depends on login credentials. Bank Code, Bank Name, Bank Category and Bank Group will be displayed in read only mode by the system.</div>
                        <div><sup>4</sup> In case of Planned, it is mandatory to select location till ‘Revenue Center’.</div>
                        <div><sup>5</sup> Non-Administratively Independent Offices.</div>
                        <div><sup>6</sup> Conversion from Brick & Mortar (B&M) Branch/Fixed Point BC outlet/Office/NAIO to Fixed Point BC outlet/B&M Branch/Office/NAIO or vice versa.</div>
                    </div>
                    <div class="page-footer">Proforma - Page 1 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 2 -->
                    <div class="sec-row" style="margin-top: 25px;">
                        <div class="sec-num">5.</div><div class="sec-lbl bold italic">Addition of a new banking outlet/office/unit/CSP etc.</div>
                    </div>
                        <div class="sub-row">
                            <div class="sub-num">5.1.</div><div class="sub-lbl bold">If B&M Branch (Staffed by bank)</div><div class="cb-sq">${check(c.rbi_branchType, 'BM')}</div>
                        </div>
                        <div style="margin-left: 55px;">
                            <div class="sub-row">
                                <div class="sub-num">5.1.1.</div><div class="sub-lbl">Domestic Banking Unit <span class="cb-sq">${check(c.rbi_bmDomesticOverseas, 'DOMESTIC')}</span> / Overseas Banking Unit <span class="cb-sq">${check(c.rbi_bmDomesticOverseas, 'OVERSEAS')}</span></div>
                            </div>
                        </div>

                        <div class="sub-row" style="margin-top: 15px;">
                            <div class="sub-num">5.2.</div><div class="sub-lbl bold">If fixed point BC outlet</div><div class="cb-sq">${check(c.rbi_branchType, 'BC')}</div>
                        </div>
                        <div style="margin-left: 55px;">
                            <div class="sub-row">
                                <div class="sub-num">5.2.1.</div><div class="sub-lbl">Corporate BC <span class="cb-sq">${check(c.rbi_bcType, 'CORPORATE')}</span> / Individual BC <span class="cb-sq">${check(c.rbi_bcType, 'INDIVIDUAL')}</span></div>
                            </div>
                            <div class="sub-row">
                                <div class="sub-num">5.2.2.</div><div class="sub-lbl">Base/controlling branch Part-I Code, if applicable ${box(c.rbi_bcBasePartICode, 7)}</div>
                            </div>
                            <div class="sub-row" style="align-items: baseline;">
                                <div class="sub-num" style="width: 50px; flex-shrink: 0;">5.2.3.</div><div class="sub-lbl" style="width: 250px; flex-shrink: 0;">IBA Registration Number:</div>
                                <div class="underscore" style="flex: 1;">${val(c.rbi_bcIBARegNo)}</div>
                            </div>
                    </div>

                    <!-- NEW SECTION 6: OFFICES -->
                    <div class="sec-row" style="margin-top: 15px;">
                        <div class="sec-num">6.</div><div class="sec-lbl bold">For addition of a new Office<sup>7</sup>,</div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">6.1.</div><div class="sub-lbl">Domestic Office Unit <span class="cb-sq">${check(c.rbi_officeType, 'DOMESTIC')}</span> / Overseas Office Unit <span class="cb-sq">${check(c.rbi_officeType, 'OVERSEAS')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">6.2.</div><div class="sub-lbl">Administrative (including Head/ Regional/ Zonal/ etc.) Office <span class="cb-sq">${check(c.rbi_officeRole, 'ADMIN')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">6.3.</div><div class="sub-lbl">Training Centre <span class="cb-sq">${check(c.rbi_officeRole, 'TRAINING')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">6.4.</div><div class="sub-lbl">Back Office </div>
                    </div>
                    <div style="margin-left: 55px;">
                        <div class="sub-row">
                            <div class="sub-num">6.4.1.</div>
                            <div class="sub-lbl">
                                Central Processing Centres (CPCs) (including Loan/ Deposit/ other liability/ Cheque book issuing, new account opening etc.)
                                <span class="cb-sq">${check(c.rbi_officeRole, 'CPC')}</span>
                            </div>
                        </div>
                        <div class="sub-row">
                            <div class="sub-num">6.4.2.</div><div class="sub-lbl">Service Branches <span class="cb-sq">${check(c.rbi_officeRole, 'SERVICE')}</span></div>
                        </div>
                        <div class="sub-row">
                            <div class="sub-num">6.4.3.</div><div class="sub-lbl">Asset Recovery Branches <span class="cb-sq">${check(c.rbi_officeRole, 'ASSET')}</span></div>
                        </div>
                    </div>
                    <div class="sub-row" style="margin-top: 5px;">
                        <div class="sub-num">6.5.</div><div class="sub-lbl">Treasury Branch Office <span class="cb-sq">${check(c.rbi_officeRole, 'TREASURY')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">6.6.</div><div class="sub-lbl">Forex Office <span class="cb-sq">${check(c.rbi_officeRole, 'FOREX')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">6.7.</div><div class="sub-lbl" style="width: 250px;">Any Other <span class="cb-sq">${check(c.rbi_officeRole, 'OTHER')}</span> (Please specify)</div><div class="underscore" style="flex: 1;">${val(c.rbi_officeOtherNote)}</div>
                    </div>
                    <div class="sub-row">
                         <div class="sub-num">6.8.</div><div class="sub-lbl">Part-I code of the base branch/office, if applicable : ${box(c.rbi_officeBasePartICode, 7)}</div>
                    </div>

                    <div class="sec-row" style="margin-top: 15px;">
                        <div class="sec-num">7.</div><div class="sec-lbl bold">If NAIOs:</div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">7.1.</div><div class="sub-lbl">Extension Counter<sup>8</sup> <span class="cb-sq">${check(c.rbi_naioType, 'EXTENSION')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">7.2.</div><div class="sub-lbl">Satellite Office<sup>9</sup> <span class="cb-sq">${check(c.rbi_naioType, 'SATELLITE')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">7.3.</div><div class="sub-lbl">Exchange Bureau <span class="cb-sq">${check(c.rbi_naioType, 'EXCHANGE')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">7.4.</div><div class="sub-lbl">Representative Office <span class="cb-sq">${check(c.rbi_naioType, 'REPRESENTATIVE')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">7.5.</div><div class="sub-lbl">Call Centre <span class="cb-sq">${check(c.rbi_naioType, 'CALL_CENTRE')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">7.6.</div><div class="sub-lbl" style="width: 250px;">Other <span class="cb-sq">${check(c.rbi_naioType, 'OTHER')}</span> (Please specify)</div><div class="underscore" style="flex: 1;">${val(c.rbi_officeOtherNote)}</div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">7.7.</div><div class="sub-lbl">Part-I code of the base BO/office : ${box(c.rbi_naioBasePartICode, 7)}</div>
                    </div>

                    <div class="footnote">
                        <div><sup>7</sup> For each type of office, bank will be required to submit separate proforma.</div>
                        <div><sup>8</sup> For applicable categories of bank (foreign banks, RRBs, cooperative banks), may be reported here. For commercial bank, there is no extension counter as they fulfil the criteria of Banking Outlet.</div>
                        <div><sup>9</sup> For applicable categories of bank (foreign banks, RRBs, cooperative banks) may be reported here. For commercial bank, there is no satellite offices as they fulfil the criteria of Banking Outlet.</div>
                    </div>

                    <div class="page-footer">Proforma - Page 2 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 3 -->
                    <div class="sec-row" style="margin-top: 15px;">
                        <div class="sec-num">8.</div><div class="sec-lbl bold">If other Fixed Location CSPs then</div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">8.1.</div><div class="sub-lbl bold">Mode of service</div>
                    </div>
                    <div style="margin-left: 55px;">
                        <div class="sub-row">
                            <div class="sub-num">8.1.1.</div><div class="sub-lbl">Electronic services <span class="cb-sq">${check(c.rbi_cspModeCategory, 'ELECTRONIC')}</span></div>
                        </div>
                        <div style="margin-left: 55px;">
                            <div class="sub-row">
                                <div class="sub-num">8.1.1.1.</div><div class="sub-lbl">ATMs <span class="cb-sq">${check(c.rbi_cspMode, 'ATM')}</span></div>
                            </div>
                            <div class="sub-row">
                                <div class="sub-num">8.1.1.2.</div><div class="sub-lbl">Cash Recycler Machine (CRM) <span class="cb-sq">${check(c.rbi_cspMode, 'CRM')}</span></div>
                            </div>
                            <div class="sub-row">
                                <div class="sub-num">8.1.1.3.</div><div class="sub-lbl">Bunch Note Acceptor Machine (BNAM)/<br/>Cash Deposit Machines (CDMs) <span class="cb-sq">${check(c.rbi_cspMode, 'CDM')}</span></div>
                            </div>
                            <div class="sub-row">
                                <div class="sub-num">8.1.1.4.</div><div class="sub-lbl">Electronic Kiosks <span class="cb-sq">${check(c.rbi_cspMode, 'KIOSK')}</span></div>
                            </div>
                            <div class="sub-row">
                                <div class="sub-num">8.1.1.5.</div><div class="sub-lbl">E-lobby <span class="cb-sq">${check(c.rbi_cspMode, 'ELOBBY')}</span></div>
                            </div>
                            <div class="sub-row">
                                <div class="sub-num">8.1.1.6.</div><div class="sub-lbl" style="width: 250px;">Other <span class="cb-sq">${check(c.rbi_cspMode, 'OTHER')}</span> (Please specify)</div><div class="underscore" style="flex: 1;">${val(c.rbi_cspModeOther)}</div>
                            </div>
                        </div>
                        <div class="sub-row">
                            <div class="sub-num">8.1.2.</div><div class="sub-lbl">Manual Services <span class="cb-sq">${check(c.rbi_cspModeCategory, 'MANUAL')}</span></div>
                        </div>
                        <div style="margin-left: 55px;">
                            <div class="sub-row">
                                <div class="sub-num">8.1.2.1.</div><div class="sub-lbl">Other Customer Services <span class="cb-sq">${check(c.rbi_cspModeManualType, 'OTHER')}</span></div>
                            </div>
                        </div>
                        <div class="sub-row">
                            <div class="sub-num">8.1.3.</div><div class="sub-lbl">Onsite <span class="cb-sq">${check(c.rbi_cspLocation, 'ONSITE')}</span> / Off-site <span class="cb-sq">${check(c.rbi_cspLocation, 'OFFSITE')}</span></div>
                        </div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">8.2.</div><div class="sub-lbl">Part-I code of the base BO/office, if applicable : ${box(c.rbi_cspBasePartICode, 7)}</div>
                    </div>

                    <div class="sec-row" style="margin-top: 15px;">
                        <div class="sec-num">9.</div><div class="sec-lbl bold">Details of Banking Outlet / Office / CSP</div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">9.1.</div><div class="sub-lbl">Name: <span class="underscore font-bold">${val(unit.nameEn)}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">9.2.</div><div class="sub-lbl">Category: General <span class="cb-sq">${check(c.rbi_category, 'GENERAL')}</span> | Authorised <span class="cb-sq">${check(c.rbi_category, 'AUTHORISED')}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">9.3.</div><div class="sub-lbl">License No: <span class="underscore">${val(c.rbi_licenseNo)}</span></div>
                        <div class="sub-num" style="margin-left: 15px;">9.4.</div><div class="sub-lbl">Date: <span class="underscore">${val(c.rbi_licenseDate)}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">9.5.</div><div class="sub-lbl">Opening Date: <span class="underscore">${val(c.openingDate)}</span></div>
                        <div class="sub-num" style="margin-left: 15px;">9.6.</div><div class="sub-lbl">Linked CC Code: ${box(c.rbi_linkedCurrencyChest, 7)}</div>
                    </div>

                    <div class="footnote">
                    </div>
                    <div class="page-footer">Proforma - Page 3 of 7</div>
                    <div class="page-break"></div>
                    
                    <!-- PAGE 4 -->
                    <div class="sec-row">
                        <div class="sec-num">10.</div><div class="sec-lbl">MICR Code: ${box(c.rbi_micr, 9)}</div>
                        <div class="sec-num" style="margin-left: 30px;">11.</div><div class="sec-lbl">IFSC Code: ${box(c.rbi_ifsc, 11)}</div>
                    </div>
                    <div class="sec-row">
                        <div class="sec-num">12.</div><div class="sec-lbl">CBS Code: ${box(c.rbi_cbsCode, 12)}</div>
                    </div>
                    <div class="sec-row" style="margin-top: 10px;">
                        <div class="sec-num">13.</div><div class="sec-lbl bold">Location details</div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">13.1.</div><div class="sub-lbl">Country: <span class="underscore">${val((unit as any).country) || 'India'}</span></div>
                        <div class="sub-num">13.2.</div><div class="sub-lbl">State: <span class="underscore">${val((unit as any).state)}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">13.3.</div><div class="sub-lbl">District: <span class="underscore">${val(unit.district)}</span></div>
                        <div class="sub-num">13.4.</div><div class="sub-lbl">Sub-District: <span class="underscore">${val((unit as any).subDistrict)}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">13.5.</div><div class="sub-lbl">Revenue Centre: <span class="underscore">${val((unit as any).revenueCentre)}</span></div>
                        <div class="sub-num">13.6.</div><div class="sub-lbl">Pop. Group: <span class="underscore">${val(unit.populationGroup)}</span></div>
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">13.7.</div><div class="sub-lbl bold underline">Address</div>
                    </div>
                    <div class="sub-row" style="margin-left: 125px;">
                        <span style="width: 100px;">Line 1:</span> <span class="underscore" style="flex:1">${val(unit.address?.substring(0, 50))}</span>
                    </div>
                    <div class="sub-row" style="margin-left: 125px;">
                        <span style="width: 100px;">Post Office:</span> <span class="underscore" style="flex:1">${val(c.rbi_postOffice)}</span>
                        <span style="width: 80px; margin-left:15px;">Pin:</span> ${box(unit.pincode, 6)}
                    </div>
                    <div class="sub-row">
                        <div class="sub-num">13.8.</div><div class="sec-lbl bold underline">Communication</div>
                    </div>
                    <div class="sub-row" style="margin-left: 125px;">
                        <span style="width: 150px;">Tel:</span> ${box(c.rbi_telephone, 10)}
                        <span style="width: 150px; margin-left: 20px;">Mob:</span> ${box(c.rbi_mobile, 10)}
                    </div>
                    <div class="sub-row" style="margin-left: 125px;">
                        <span style="width: 150px;">Email:</span> <span class="underscore" style="flex:1">${val(c.rbi_email)}</span>
                    </div>

                    <div class="page-footer">Proforma - Page 4 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 5 -->
                    <div class="sec-row">
                        <div class="sec-num">13.9.</div><div class="sec-lbl bold underline">Geo-coordinates</div>
                    </div>
                    <div class="sub-row">
                        Long: ${box(c.rbi_longitude, 12)} &nbsp;&nbsp; Lat: ${box(c.rbi_latitude, 12)}
                    </div>

                    <div class="sec-row" style="margin-top: 15px;">
                        <div class="sec-num">14.</div><div class="sec-lbl bold">Working Hours (Full Time <span class="cb-sq">${check(c.rbi_workingType, 'FULL_TIME')}</span> | Part Time <span class="cb-sq">${check(c.rbi_workingType, 'PART_TIME')}</span>)</div>
                    </div>
                    <div class="sub-row">
                        <table class="timings">
                            <thead><tr><th>Day</th><th>Session I</th><th>Session II</th></tr></thead>
                            <tbody>
                                ${['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(d => {
                                    const s = c.rbi_schedule?.[d] || {};
                                    return `<tr><td class="bold">${d.toUpperCase()}</td><td>${s.from1||'-'} to ${s.to1||'-'}</td><td>${s.from2||'-'} to ${s.to2||'-'}</td></tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="sec-row" style="margin-top: 15px;">
                        <div class="sec-num">15.</div><div class="sec-lbl bold">Services Offered</div>
                    </div>
                    <div class="sub-row">
                        Gen Banking <span class="cb-sq">${check(svc.generalBanking, true)}</span> | Personal <span class="cb-sq">${check(svc.personalBanking, true)}</span> | Locker <span class="cb-sq">${check(svc.locker, true)}</span>
                    </div>
                    <div class="sub-row">
                        Agri <span class="cb-sq">${check(svc.agri, true)}</span> | MSME <span class="cb-sq">${check(svc.msme, true)}</span> | Forex <span class="cb-sq">${check(svc.forex, true)}</span> | Mutual Fund<sup>12</sup> <span class="cb-sq">${check(svc.mutualFund, true)}</span> | Life<sup>13</sup> <span class="cb-sq">${check(svc.lifeIns, true)}</span>
                    </div>

                    <div class="page-footer">Proforma - Page 5 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 6 -->
                    <div class="sec-row">
                         <div class="sec-num">16.</div><div class="sec-lbl bold">Forex Activity<sup>14</sup>: AD Cat: <span class="underscore">${val(c.rbi_forexADCategory)}</span> | Date: <span class="underscore">${val(c.rbi_forexAuthDate)}</span></div>
                    </div>
                    <div class="sec-row">
                         <div class="sec-num">17.</div><div class="sec-lbl bold">Foreign Bank (India Presence): Yes <span class="cb-sq">${check(c.rbi_foreignPresent, 'YES')}</span> | No <span class="cb-sq">${check(c.rbi_foreignPresent, 'NO')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-top: 15px;">
                        <div class="sec-num">18.</div><div class="sec-lbl bold">Other Information / Remarks:</div>
                    </div>
                    <div class="sub-row">
                        <div class="underscore" style="width: 100%; min-height: 120px; border: 0.5px solid #000; padding:10px;">${val(c.rbi_otherInfo) || val(c.rbi_remarks)}</div>
                    </div>

                    <div class="footnote">
                        <div><sup>12</sup> Unit linked plans should be treated under Mutual Funds.</div>
                        <div><sup>13</sup> Includes health insurance and other similar products related to life.</div>
                        <div><sup>14</sup> Offices doing authorised dealer activities with customer interface will be considered as Banking Outlets.</div>
                    </div>
                    <div class="page-footer">Proforma - Page 6 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 7 -->
                    <div style="margin-top: 40px;"><p class="bold">I certify that the information provided above is true and correct.</p></div>

                    <div class="signature" style="margin-top: 70px; display: flex; justify-content: space-between;">
                        <div style="width: 45%;">
                            <p>Place : <span class="underscore">${val(c.rbi_place || 'DINDIGUL')}</span></p>
                            <p style="margin-top: 30px;">Date : <div class="date-boxes">${box(new Date().getDate(), 2)} / ${box(new Date().getMonth()+1, 2)} / ${box(new Date().getFullYear(), 4)}</div></p>
                        </div>
                        <div style="width: 45%; text-align: right;">
                            <p>(Signature of Authorized<sup>15</sup> Official)</p>
                            <p style="margin-top: 40px;">Name : <span class="underscore">${val(c.rbi_authorisedName)}</span></p>
                            <p style="margin-top: 15px;">Designation : <span class="underscore">${val(c.rbi_authorisedDesignation)}</span></p>
                        </div>
                    </div>

                    <div style="margin-top: 80px; text-align: center; border-top: 1px dashed #000; padding-top: 15px;">
                        <p class="bold">--- End of Annex-I Proforma ---</p>
                    </div>

                    <div class="sec-row" style="margin-top: 40px;">
                        <div class="sec-num">19.</div><div class="sec-lbl bold">Uniform Part-I Code: ${box('', 16)}</div>
                        <div class="sec-num" style="margin-left: 20px;">20.</div><div class="sec-lbl bold">Part-II Code: ${box('', 7)}</div>
                    </div>

                    <div class="footnote">
                        <div><sup>15</sup> To be signed by an officer in the rank of a General Manager or equivalent, strictly as per the instructions in the main circular.</div>
                    </div>
                    <div class="page-footer">Proforma - Page 7 of 7</div>
                </div>
             `;
        } else {
            bodyHtml = `
                <div class="main-content">
                    ${content.details || ''}
                </div>
            `;
        }

        const { generatePDF, buildPremiumLayout, getRegionalOfficeData, imageToBase64 } = require('../services/pdfService');

        // Fetch current RO and Org data (respect freeze snapshot if available)
        const RO_DATA = content.isFrozen ? content.signatorySnapshot.organization : await getRegionalOfficeData();

        // Authority override for Proforma: Region Head signs instead of preparer
        const isProforma = ['PROFORMA_BRANCH_CODE', 'RBI_BO_PROFORMA'].includes(note.type);
        
        let pdfTitle = note.titleEn;
        let pdfTitleHi = content.titleHi;
        let pdfTitleTa = content.titleTa;
        let pdfSubTitle = undefined;

        if (note.type === 'PROFORMA_BRANCH_CODE') {
            pdfTitle = 'PROFORMA FOR OBTENTION OF BRANCH CODE';
            pdfSubTitle = 'கிளைக் குறியீடு பெறுவதற்கான படிவம் / शाखा कोड प्राप्त करने के लिए प्रोफார்மா';
        } else if (note.type === 'RBI_BO_PROFORMA') {
            pdfTitle = 'PROFORMA FOR REPORTING TO RBI - ANNEX-I';
            pdfSubTitle = 'भारतीय रिज़र्व बैंक को रिपोर्ट करने के लिए प्रोफார்मा / ரிசர்வ் வங்கிக்கு சமர்ப்பிப்பதற்கான படிவம்';
        } else if (note.type === 'HIGH_VALUE_DD') {
            pdfTitle = 'Office Note / कार्यालय टिप्पणी / அலுவலகக் குறிப்பு';
            pdfSubTitle = 'HIGH VALUE DEMAND DRAFT / उच्च मूल्य का डिमांड ड्राफ्ट / அதிக மதிப்புள்ள கோரிக்கை வரைவோலை';
        }

        const isHighValueDD = note.type === 'HIGH_VALUE_DD';
        
        let deptName = (note as any).deptName;
        if (!deptName && note.contentJson) {
            try {
                const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;
                deptName = content.deptName;
            } catch (e) {}
        }

        const isPlanningOrProformaOrDD = isProforma || isHighValueDD || deptName === 'Planning Department';
        
        let sigTitleEn = isPlanningOrProformaOrDD ? 'Chief Manager' : (note.preparer.role === 'ADMIN' ? 'Administrator' : 'Preparer');
        let sigTitleHi = isPlanningOrProformaOrDD ? 'मुख्य प्रबंधक' : (note.preparer.role === 'ADMIN' ? 'प्रशासक' : 'तैयारकर्ता');
        let sigTitleTa = isPlanningOrProformaOrDD ? 'தலைமை மேலாளர்' : (note.preparer.role === 'ADMIN' ? 'நிர்வாகி' : 'தயாரித்தவர்');

        if (isHighValueDD) {
            sigTitleEn = RO_DATA.signingAuthEn || 'Regional Manager';
            sigTitleHi = RO_DATA.signingAuthHi || 'क्षेत्रীয় प्रबंधक';
            sigTitleTa = RO_DATA.signingAuthTa || 'மண்டல மேலாளர்';
        }

        const currentDeptName = content.deptName || note.preparer?.department?.nameEn || 'ADMIN';
        const issuingDept = await (prisma as any).department.findFirst({
            where: { OR: [{ nameEn: currentDeptName }, { code: currentDeptName }] }
        });

        const deptSealPath = (issuingDept as any)?.sealPath || (note.preparer?.department as any)?.sealPath;
        const deptSealSrc = deptSealPath ? imageToBase64(deptSealPath) : undefined;

        const initiator = (note.type === 'MICR_CODE_REQUEST') ? undefined : (content.isFrozen ? content.signatorySnapshot.preparer : {
            name: note.preparer.fullNameEn,
            nameTa: note.preparer.fullNameTa || undefined,
            nameHi: note.preparer.fullNameHi || undefined,
            titleEn: note.preparer.designationEn || (note.preparer.role === 'ADMIN' ? 'Administrator' : 'Preparer'),
            titleTa: note.preparer.designationTa || undefined,
            titleHi: note.preparer.designationHi || undefined
        });

        const roChiefManagers = (note.type === 'MICR_CODE_REQUEST' || content.isFrozen) ? [] : await prisma.user.findMany({
            where: {
                role: { in: ['RO_USER', 'RO_MANAGER'] },
                OR: [
                    { designation: { nameEn: { contains: 'Chief Manager', mode: 'insensitive' } } },
                    { designationEn: { contains: 'Chief Manager', mode: 'insensitive' } }
                ]
            },
            orderBy: {
                fullNameEn: 'asc'
            },
            include: { designation: true }
        });

        const reviewers = (note.type === 'MICR_CODE_REQUEST') ? [] : (content.isFrozen ? content.signatorySnapshot.reviewers : roChiefManagers.map((u: any) => ({
            name: u.fullNameEn,
            nameTa: u.fullNameTa || undefined,
            nameHi: u.fullNameHi || undefined,
            titleEn: u.designationEn || 'Chief Manager',
            titleTa: u.designationTa || undefined,
            titleHi: u.designationHi || undefined
        })));

        const approver = content.isFrozen ? content.signatorySnapshot.approver : {
            name: note.approver?.fullNameEn || RO_DATA.signatoryName || 'System Admin',
            nameTa: note.approver?.fullNameTa || RO_DATA.signatoryNameTa || '',
            nameHi: note.approver?.fullNameHi || RO_DATA.signatoryNameHi || '',
            titleEn: note.approver?.designationEn || RO_DATA.signingAuthEn || 'Approver',
            titleTa: note.approver?.designationTa || RO_DATA.signingAuthTa || '',
            titleHi: note.approver?.designationHi || RO_DATA.signingAuthHi || ''
        };

        const html = buildPremiumLayout({
            title: pdfTitle,
            titleHi: pdfTitleHi,
            titleTa: pdfTitleTa,
            subTitle: pdfSubTitle,
            refNo,
            date: noteDate,
            bodyHtml,
            initiator,
            reviewers,
            approver,
            signatoryName: approver.name,
            signatoryTitleEn: approver.titleEn,
            signatoryTitleHi: sigTitleHi,
            signatoryTitleTa: sigTitleTa,
            organization: RO_DATA,
            isAdvisory: false,
            deptSealSrc,
            orgMeta: {
                sealX: content.sealX,
                sealY: content.sealY
            },
            hideHeader: ['RBI_BO_PROFORMA'].includes(note.type),
            hideMeta: ['RBI_BO_PROFORMA'].includes(note.type),
            hideTitle: ['RBI_BO_PROFORMA'].includes(note.type),
            hideApprovedStatus: note.type === 'MICR_CODE_REQUEST'
        });

        const pdfBuffer = await generatePDF(html, undefined, refNo);

        res.contentType('application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="OfficeNote_${note.id.slice(-4)}.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        logger.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});


// Get summary of High Value DD notes (Weekly/Monthly)
router.get('/high-value-dd/summary', authenticateToken, async (req: any, res) => {
    const { period, date } = req.query; // 'weekly' or 'monthly'
    const referenceDate = date ? new Date(date as string) : new Date();

    let startDate, endDate;
    if (period === 'weekly') {
        startDate = startOfWeek(referenceDate, { weekStartsOn: 1 });
        endDate = endOfWeek(referenceDate, { weekStartsOn: 1 });
    } else {
        startDate = startOfMonth(referenceDate);
        endDate = endOfMonth(referenceDate);
    }

    try {
        const notes = await prisma.officeNote.findMany({
            where: {
                type: 'HIGH_VALUE_DD',
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                preparer: {
                    include: {
                        branch: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Generate CSV
        const header = "SOL,Branch,DD Purchaser,Txn ID,Amount,Purpose\n";
        const rows = notes.map(note => {
            const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;
            const branch = note.preparer?.branch;
            return [
                branch?.code || '-',
                branch?.nameEn || '-',
                `"${(content.applicantName || '-').replace(/"/g, '""')}"`,
                content.transactionId || '-',
                content.amount || 0,
                `"${(content.purpose || '-').replace(/"/g, '""')}"`
            ].join(',');
        }).join('\n');

        const csv = header + rows;
        const filename = `HighValueDD_Summary_${period}_${format(referenceDate, 'yyyy-MM-dd')}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (err) {
        logger.error('Summary generation error:', err);
        res.status(500).json({ error: 'Failed to generate summary' });
    }
});

export default router;
