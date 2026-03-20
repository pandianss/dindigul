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
        } else if (note.type === 'RBI_BO_PROFORMA') {
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
                    @page { margin: 10mm; }
                    .proforma-container { font-family: 'Times New Roman', serif; color: #000; line-height: 1.3; padding: 0 10px; font-size: 13px; }
                    .annex-hdr { text-align: right; font-weight: bold; text-decoration: underline; margin-bottom: 5px; font-size: 15px; }
                    .main-tit { text-align: center; font-weight: bold; font-size: 18px; text-decoration: underline; margin-bottom: 10px; }
                    .stmt-desc { font-weight: bold; text-align: center; font-size: 12px; margin: 0 auto 20px auto; max-width: 95%; line-height: 1.4; }
                    .page-footer { text-align: right; font-weight: bold; font-size: 12px; margin-top: 20px; border-top: 1px solid #000; padding-top: 5px; }
                    
                    .sec-row { display: flex; margin-bottom: 8px; align-items: flex-start; }
                    .sec-num { width: 35px; flex-shrink: 0; }
                    .sec-lbl { flex: 1; }
                    .sec-val { width: 45%; padding-left: 10px; flex-shrink: 0; }
                    
                    .cb-item { display: flex; align-items: center; margin-bottom: 3px; }
                    .cb-sq { font-size: 16px; margin-left: 8px; font-family: "Segoe UI Symbol", sans-serif; }
                    
                    .char-box { display: inline-block; width: 16px; height: 16px; border: 1px solid #000; text-align: center; margin-right: -1px; font-family: monospace; font-weight: bold; line-height: 16px; margin-top: 1px; vertical-align: middle; background: #fff; }
                    .underscore { border-bottom: 1px solid #000; min-width: 150px; display: inline-block; padding: 0 5px; font-weight: bold; }
                    .date-boxes { display: flex; align-items: center; gap: 8px; }
                    .footnote { font-size: 10px; margin-top: 30px; line-height: 1.2; border-top: 0.5px solid #eee; padding-top: 10px; }
                    .page-break { page-break-after: always; clear: both; }
                    
                    sup { font-size: 9px; }
                    .bold { font-weight: bold; }
                </style>

                <div class="proforma-container">
                    <!-- PAGE 1 -->
                    <div class="annex-hdr">ANNEX-I</div>
                    <div class="main-tit">Proforma</div>
                    
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
                             <div class="cb-item">Addition (Opening of new banking Outlet/unit, etc.) <span class="cb-sq">${check(c.rbi_action, 'ADDITION')}</span></div>
                             <div style="margin-left: 40px;">
                                <div class="cb-item">Opened <span class="cb-sq">${check(c.rbi_action, 'ADDITION')}</span></div>
                                <div class="cb-item">Planned<sup>4</sup> <span class="cb-sq">${check(c.rbi_action, 'PLANNED')}</span></div>
                             </div>
                             <div style="margin-top: 8px; font-weight: bold;">OR</div>
                             <div class="cb-item">Updation <span class="cb-sq">${check(c.rbi_action, 'UPDATION')}</span></div>
                             <div class="cb-item">Updating of existing Information <span class="cb-sq">${check(c.rbi_action, 'UPDATION')}</span></div>
                             <div class="cb-item">Closure <span class="cb-sq">${check(c.rbi_action, 'CLOSURE')}</span></div>
                             <div class="cb-item">Permanent Closed <span class="cb-sq">${check(c.rbi_action, 'CLOSURE')}</span></div>
                             <div class="cb-item">Merged <span class="cb-sq">${check(c.rbi_action, 'MERGED')}</span></div>
                             <div class="cb-item">Conversion <span class="cb-sq">${check(c.rbi_action, 'CONVERSION')}</span></div>
                        </div>
                    </div>

                    <div class="sec-row">
                        <div class="sec-num">3.</div>
                        <div class="sec-lbl">If proforma is for updating information</div>
                    </div>
                    <div class="sec-row" style="margin-left: 15px;">
                        <div class="sec-num">3.1.</div>
                        <div class="sec-lbl">Part-I Code of updating : <span class="underscore" style="min-width: 250px;">${val(c.rbi_updatePartICode)}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 50px; font-size: 10px; color: #555;">
                        [Banking Outlet (Full/ Part-time), Administrative/Back Office (7 digits), NAIOs<sup>5</sup>,<br/>
                        ATMs, Other Fixed CSPs (16 digits)]
                    </div>

                    <div class="sec-row" style="margin-left: 15px; margin-top: 10px;">
                        <div class="sec-num">3.2.</div>
                        <div class="sec-lbl">Effective Date of Change : </div>
                        <div class="sec-val date-boxes">
                            <div style="text-align: center;">${box(c.rbi_updateEffectiveDate?.split('-')[2] || '', 2)}<br/><span style="font-size: 8px;">Day</span></div>
                            <div style="text-align: center;">${box(c.rbi_updateEffectiveDate?.split('-')[1] || '', 2)}<br/><span style="font-size: 8px;">Month</span></div>
                            <div style="text-align: center;">${box(c.rbi_updateEffectiveDate?.split('-')[0] || '', 4)}<br/><span style="font-size: 8px;">Year</span></div>
                        </div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">4.</div>
                        <div class="sec-lbl">For Conversion<sup>6</sup></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">4.1.</div><div class="sec-lbl">Conversion From</div><div class="sec-val">: <span class="underscore">${val(c.rbi_conversionFrom)}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">4.2.</div><div class="sec-lbl">Conversion To</div><div class="sec-val">: <span class="underscore">${val(c.rbi_conversionTo)}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">4.3.</div><div class="sec-lbl">Part-1 Code</div><div class="sec-val">: <span class="underscore">${val(c.rbi_conversionPartICode)}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">4.4.</div><div class="sec-lbl">Conversion Date</div>
                        <div class="sec-val date-boxes">
                            : <div style="text-align: center;">${box(c.rbi_conversionDate?.split('-')[2] || '', 2)}<br/><span style="font-size: 8px;">Day</span></div>
                            <div style="text-align: center;">${box(c.rbi_conversionDate?.split('-')[1] || '', 2)}<br/><span style="font-size: 8px;">Month</span></div>
                            <div style="text-align: center;">${box(c.rbi_conversionDate?.split('-')[0] || '', 4)}<br/><span style="font-size: 8px;">Year</span></div>
                        </div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">5.</div>
                        <div class="sec-lbl">For addition of a new Banking Outlet, then:</div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">5.1.</div>
                        <div class="sec-lbl">If B&M Branch (Staffed by bank)</div>
                        <div class="sec-val"><span class="cb-sq">${check(c.rbi_outletClass, 'BM_BRANCH')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">5.1.1.</div>
                        <div class="sec-lbl">Domestic Banking Unit <span class="cb-sq">${check(c.rbi_bmDomesticOverseas, 'DOMESTIC')}</span> / Overseas Banking Unit <span class="cb-sq">${check(c.rbi_bmDomesticOverseas, 'OVERSEAS')}</span></div>
                    </div>
                    
                    <div class="sec-row" style="margin-left: 30px; margin-top: 8px;">
                        <div class="sec-num">5.2.</div>
                        <div class="sec-lbl">If fixed point BC outlet</div>
                        <div class="sec-val"><span class="cb-sq">${check(c.rbi_outletClass, 'FIXED_BC')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">5.2.1.</div>
                        <div class="sec-lbl">Corporate BC <span class="cb-sq">${check(c.rbi_bcType, 'CORPORATE')}</span> / Individual BC <span class="cb-sq">${check(c.rbi_bcType, 'INDIVIDUAL')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">5.2.2.</div>
                        <div class="sec-lbl">Base/controlling branch Part-I Code, if applicable ${box(c.rbi_bcBasePartICode, 7)}</div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">5.2.3.</div>
                        <div class="sec-lbl">IBA Registration Number: <span class="underscore">${val(c.rbi_bcIBARegNo)}</span></div>
                    </div>

                    <div class="footnote">
                        <sup>1</sup> Manned by bank staff. <sup>2</sup> Including Access Points of Payments Banks. <sup>3</sup> Depends on login credentials. Bank Code, Bank Name, Bank Category and Bank Group will be displayed in read only mode by the system. <sup>4</sup> In case of Planned, it is mandatory to select location till 'Revenue Center'. <sup>5</sup> Non-Administratively Independent Offices. <sup>6</sup> Conversion from Brick & Mortar (B&M) Branch/Fixed Point BC outlet/Office/NAIO to Fixed Point BC outlet/B&M Branch/Office/NAIO or vice versa.
                    </div>

                    <div class="page-footer">Proforma - Page 1 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 2 -->
                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">6.</div>
                        <div class="sec-lbl">For addition of a new Office<sup>7</sup></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">6.1.</div>
                        <div class="sec-lbl">Domestic Office Unit <span class="cb-sq">${check(c.rbi_officeDomesticOverseas, 'DOMESTIC')}</span> / Overseas Office Unit <span class="cb-sq">${check(c.rbi_officeDomesticOverseas, 'OVERSEAS')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">6.2.</div>
                        <div class="sec-lbl">Administrative (including Head/ Regional/ Zonal/ etc.) Office <span class="cb-sq">${check(c.rbi_officeType, 'ADMINISTRATIVE')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">6.3.</div>
                        <div class="sec-lbl">Training Centre <span class="cb-sq">${check(c.rbi_officeType, 'TRAINING')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">6.4.</div>
                        <div class="sec-lbl">Back Office <span class="cb-sq">${check(c.rbi_officeType, 'BACK_OFFICE')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">6.4.1.</div>
                        <div class="sec-lbl">Central Processing Centres (CPCs) (including Loan/ Deposit/ other liability/ Cheque book issuing, new account opening etc.) <span class="cb-sq">${check(c.rbi_officeType, 'CPC')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">6.4.2.</div><div class="sec-lbl">Service Branches <span class="cb-sq">${check(c.rbi_officeType, 'SERVICE_BRANCH')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">6.4.3.</div><div class="sec-lbl">Asset Recovery Branches <span class="cb-sq">${check(c.rbi_officeType, 'ASSET_RECOVERY')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">6.5.</div><div class="sec-lbl">Treasury Branch Office <span class="cb-sq">${check(c.rbi_officeType, 'TREASURY')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">6.6.</div><div class="sec-lbl">Forex Office <span class="cb-sq">${check(c.rbi_officeType, 'FOREX')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">6.7.</div><div class="sec-lbl">Any Other <span class="cb-sq">${check(c.rbi_officeType, 'OTHER')}</span> (Please specify) <span class="underscore">${c.rbi_officeType === 'OTHER' ? val(c.rbi_officeTypeOther) : ''}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">6.8.</div><div class="sec-lbl">Part-I code of the base branch/office, if applicable : ${box(c.rbi_officeBasePartICode, 7)}</div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">7.</div>
                        <div class="sec-lbl">If NAIOs:</div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">7.1.</div><div class="sec-lbl">Extension Counter<sup>8</sup> <span class="cb-sq">${check(c.rbi_naioType, 'EXTENSION')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">7.2.</div><div class="sec-lbl">Satellite Office<sup>9</sup> <span class="cb-sq">${check(c.rbi_naioType, 'SATELLITE')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">7.3.</div><div class="sec-lbl">Exchange Bureau <span class="cb-sq">${check(c.rbi_naioType, 'EXCHANGE')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">7.4.</div><div class="sec-lbl">Representative Office <span class="cb-sq">${check(c.rbi_naioType, 'REPRESENTATIVE')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">7.5.</div><div class="sec-lbl">Call Centre <span class="cb-sq">${check(c.rbi_naioType, 'CALL_CENTRE')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">7.6.</div><div class="sec-lbl">Other <span class="cb-sq">${check(c.rbi_naioType, 'OTHER')}</span> (Please specify) <span class="underscore">${c.rbi_naioType === 'OTHER' ? val(c.rbi_naioTypeOther) : ''}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">7.7.</div><div class="sec-lbl">Part-I code of the base BO/office : ${box(c.rbi_naioBasePartICode, 7)}</div>
                    </div>

                    <div class="footnote" style="margin-top: 50px;">
                        <sup>7</sup> For each type of office, bank will be required to submit separate proforma. <sup>8</sup> For applicable categories of bank (foreign banks, RRBs, cooperative banks), may be reported here. <sup>9</sup> For commercial bank, there is no satellite offices as they fulfil the criteria of Banking Outlet.
                    </div>

                    <div class="page-footer">Proforma - Page 2 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 3 -->
                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">8.</div>
                        <div class="sec-lbl">If other Fixed Location CSPs then</div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">8.1.</div><div class="sec-lbl">Mode of service</div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">8.1.1.</div><div class="sec-lbl">Electronic services <span class="cb-sq">${c.rbi_cspMode?.startsWith('ELECTRONIC') ? '☒' : '☐'}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 90px;">
                        <div class="sec-num">8.1.1.1.</div><div class="sec-lbl">ATMs <span class="cb-sq">${check(c.rbi_cspMode, 'ELECTRONIC_ATM')}</span></div>
                        <div class="sec-num">8.1.1.2.</div><div class="sec-lbl">Cash Recycler Machine (CRM) <span class="cb-sq">${check(c.rbi_cspMode, 'ELECTRONIC_CRM')}</span></div>
                        <div class="sec-num">8.1.1.3.</div><div class="sec-lbl">BNAM/CDM <span class="cb-sq">${check(c.rbi_cspMode, 'ELECTRONIC_BNAM')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 90px;">
                        <div class="sec-num">8.1.1.4.</div><div class="sec-lbl">Electronic Kiosks <span class="cb-sq">${check(c.rbi_cspMode, 'ELECTRONIC_KIOSK')}</span></div>
                        <div class="sec-num">8.1.1.5.</div><div class="sec-lbl">E-lobby <span class="cb-sq">${check(c.rbi_cspMode, 'ELECTRONIC_LOBBY')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 90px;">
                         <div class="sec-num">8.1.1.6.</div><div class="sec-lbl">Other <span class="cb-sq">${check(c.rbi_cspMode, 'ELECTRONIC_OTHER')}</span> <span class="underscore">${c.rbi_cspMode === 'ELECTRONIC_OTHER' ? val(c.rbi_cspModeOther) : ''}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">8.1.2.</div><div class="sec-lbl">Manual Services <span class="cb-sq">${c.rbi_cspMode?.startsWith('MANUAL') ? '☒' : '☐'}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">8.1.3.</div><div class="sec-lbl">Onsite <span class="cb-sq">${check(c.rbi_cspOnsiteOffsite, 'ONSITE')}</span> / Off-site <span class="cb-sq">${check(c.rbi_cspOnsiteOffsite, 'OFFSITE')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">8.2.</div><div class="sec-lbl">Part-I code of the base BO/office, if applicable : ${box(c.rbi_cspBasePartICode, 7)}</div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">9.</div>
                        <div class="sec-lbl bold">Details of banking outlets/offices/CSPs</div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">9.1.</div><div class="sec-lbl">Name : <span class="underscore" style="min-width: 300px;">${val(c.rbi_outletName)}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px; margin-top: 10px;">
                        <div class="sec-num">9.2.</div><div class="sec-lbl">Applicable Category : General Permission <span class="cb-sq">${check(c.rbi_applicableCategory, 'GENERAL_PERMISSION')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 170px;">
                        <div class="sec-lbl">With Authorisation/ Approval/License<sup>10</sup> <span class="cb-sq">${check(c.rbi_applicableCategory, 'WITH_AUTHORISATION')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">9.3.</div><div class="sec-lbl">If approval/ authorisation, then <br/>License Number: <span class="underscore">${val(c.rbi_licenceNo)}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">9.4.</div><div class="sec-lbl">Date of License/ Auth : <div class="date-boxes" style="display:inline-flex;">${box(c.rbi_licenceDate?.split('-')[2] || '', 2)} / ${box(c.rbi_licenceDate?.split('-')[1] || '', 2)} / ${box(c.rbi_licenceDate?.split('-')[0] || '', 4)}</div></div>
                    </div>
                    
                    <div class="sec-row" style="margin-left: 30px; margin-top: 10px;">
                        <div class="sec-num">9.5.</div><div class="sec-lbl">If Re-validation<sup>11</sup>: Ref Number: <span class="underscore">${val(c.rbi_revalidationRef)}</span></div>
                    </div>

                    <div class="footnote" style="margin-top: 50px;">
                        <sup>10</sup> For banks requiring license/permission. <sup>11</sup> Applicable to banks requiring license/authorisation.
                    </div>

                    <div class="page-footer">Proforma - Page 3 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 4 -->
                    <div class="sec-row" style="margin-top: 20px; margin-left: 40px;">
                        <div class="sec-num">9.5.2.</div><div class="sec-lbl">Date of Re-validation : <div class="date-boxes" style="display:inline-flex;">${box(c.rbi_revalidationDate?.split('-')[2] || '', 2)} / ${box(c.rbi_revalidationDate?.split('-')[1] || '', 2)} / ${box(c.rbi_revalidationDate?.split('-')[0] || '', 4)}</div></div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px; margin-left: 30px;">
                        <div class="sec-num">9.6.</div><div class="sec-lbl">Date of Opening (Actual/ Planned) : <div class="date-boxes" style="display:inline-flex;">${box(c.rbi_dateOfOpening?.split('-')[2] || '', 2)} / ${box(c.rbi_dateOfOpening?.split('-')[1] || '', 2)} / ${box(c.rbi_dateOfOpening?.split('-')[0] || '', 4)}</div></div>
                    </div>

                    <div class="sec-row" style="margin-top: 15px; margin-left: 30px;">
                        <div class="sec-num">9.7.</div><div class="sec-lbl">Part-I code of linked currency chest : ${box(c.rbi_currencyChestPartICode, 7)}</div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">10.</div><div class="sec-lbl">MICR Code : ${box(c.rbi_micrCode, 9)}</div>
                    </div>

                    <div class="sec-row">
                        <div class="sec-num">11.</div><div class="sec-lbl">IFSC Code : ${box(c.rbi_ifscCode, 11)}</div>
                    </div>

                    <div class="sec-row">
                        <div class="sec-num">12.</div><div class="sec-lbl">Internal CBS Code : ${box(c.rbi_cbsCode, 15)}</div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">13.</div><div class="sec-lbl">Location details</div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">13.2.</div><div class="sec-lbl">State : <span class="underscore">${val(c.rbi_state)}</span> District : <span class="underscore">${val(c.rbi_district)}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">13.4.</div><div class="sec-lbl">Sub-District : <span class="underscore">${val(c.rbi_subDistrict)}</span> Centre: <span class="underscore">${val(c.rbi_revenueCentre)}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">13.6.</div><div class="sec-lbl">Address: <span class="underscore" style="min-width: 400px;">${val(c.rbi_addressLine1)}, ${val(c.rbi_addressLine2)}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">13.6.4.</div><div class="sec-lbl">Pin Code : ${box(c.rbi_pinCode, 6)} PO: <span class="underscore">${val(c.rbi_postOfficeName)}</span></div>
                    </div>

                    <div class="sec-row" style="margin-top: 15px;">
                        <div class="sec-num">13.7.</div><div class="sec-lbl">Geo-coordinates</div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">13.7.1.</div><div class="sec-lbl">Long: ${box(c.rbi_longitude, 10)} Lat: ${box(c.rbi_latitude, 10)}</div>
                    </div>

                    <div class="page-footer">Proforma - Page 4 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 5 -->
                    <div class="sec-row" style="margin-top: 20px;">
                         <div class="sec-num">13.8.</div><div class="sec-lbl">Communication Details:</div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                         <div class="sec-lbl">Tel: ${box(c.rbi_telephone, 10)} Mob: ${box(c.rbi_mobile, 10)} Email: <span class="underscore">${val(c.rbi_email)}</span></div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">14.</div><div class="sec-lbl">Working Days/ Hours</div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">14.1.</div><div class="sec-lbl">Full Time <span class="cb-sq">${check(c.rbi_workingType, 'FULL_TIME')}</span> OR Part Time <span class="cb-sq">${check(c.rbi_workingType, 'PART_TIME')}</span></div>
                    </div>

                    <style>
                        .hrs-tbl { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
                        .hrs-tbl th, .hrs-tbl td { border: 1px solid #000; padding: 3px; }
                        .hrs-tbl .day-col { width: 25%; }
                    </style>
                    <table class="hrs-tbl">
                        <thead>
                            <tr><th>Days</th><th>From</th><th>To</th></tr>
                        </thead>
                        <tbody>
                            ${Object.entries((c.rbi_schedule as any) || {}).map(([day, slots]: any) => `
                                <tr>
                                    <td>${day.toUpperCase()} <span class="cb-sq">☒</span></td>
                                    <td>${box(slots.from1 || '', 5)} Hr. ${slots.from2 ? '<br/>' + box(slots.from2, 5) : ''}</td>
                                    <td>${box(slots.to1 || '', 5)} Hr. ${slots.to2 ? '<br/>' + box(slots.to2, 5) : ''}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">15.</div><div class="sec-lbl">Additional centres served: <span class="underscore" style="min-width: 350px;">${val(c.rbi_additionalCentres)}</span></div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">16.</div><div class="sec-lbl bold">Service Offered</div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">16.1.</div><div class="sec-lbl">Customer services offered:</div>
                    </div>
                    <div class="sec-row" style="margin-left: 60px;">
                        <div class="sec-num">16.1.1.</div><div class="sec-lbl">General banking <span class="cb-sq">${svc.rbi_svc_generalBanking ? '☒' : '☐'}</span> 16.1.4. Locker <span class="cb-sq">${svc.rbi_svc_lockerFacility ? '☒' : '☐'}</span></div>
                    </div>

                    <div class="page-footer">Proforma - Page 5 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 6 -->
                    <div class="sec-row" style="margin-top: 20px; margin-left: 30px;">
                        <div class="sec-num">16.1.5.</div><div class="sec-lbl">Money Transfer <span class="cb-sq">${svc.rbi_svc_moneyTransfer ? '☒' : '☐'}</span> 16.1.6. Currency Chest <span class="cb-sq">${svc.rbi_svc_currencyChest ? '☒' : '☐'}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">16.1.8.</div><div class="sec-lbl">Specialised: Agri <span class="cb-sq">${svc.rbi_svc_agriFinance ? '☒' : '☐'}</span> MSME <span class="cb-sq">${svc.rbi_svc_msmeFinance ? '☒' : '☐'}</span> Corp <span class="cb-sq">${svc.rbi_svc_corporateFinance ? '☒' : '☐'}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">16.1.9.</div><div class="sec-lbl">Forex <span class="cb-sq">${svc.rbi_svc_forexBusiness ? '☒' : '☐'}</span> 16.1.10. Capital Market <span class="cb-sq">${svc.rbi_svc_capitalMarket ? '☒' : '☐'}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">16.1.12.</div><div class="sec-lbl">Govt: PPF <span class="cb-sq">${svc.rbi_svc_ppfAccount ? '☒' : '☐'}</span> Pension <span class="cb-sq">${svc.rbi_svc_pensionAccount ? '☒' : '☐'}</span> Tax <span class="cb-sq">${svc.rbi_svc_taxCollection ? '☒' : '☐'}</span></div>
                    </div>

                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">17.</div><div class="sec-lbl bold">Forex activity (if any)</div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">17.1.</div><div class="sec-lbl">AD Category : A <span class="cb-sq">${check(c.rbi_forexADCategory, 'A')}</span> B <span class="cb-sq">${check(c.rbi_forexADCategory, 'B')}</span> C <span class="cb-sq">${check(c.rbi_forexADCategory, 'C')}</span></div>
                    </div>
                    <div class="sec-row" style="margin-left: 30px;">
                        <div class="sec-num">17.2.</div><div class="sec-lbl">Auth Date : <div class="date-boxes" style="display:inline-flex;">${box(c.rbi_forexAuthDate?.split('-')[2] || '', 2)} / ${box(c.rbi_forexAuthDate?.split('-')[1] || '', 2)} / ${box(c.rbi_forexAuthDate?.split('-')[0] || '', 4)}</div></div>
                    </div>

                    <div class="page-footer">Proforma - Page 6 of 7</div>
                    <div class="page-break"></div>

                    <!-- PAGE 7 -->
                    <div class="sec-row" style="margin-top: 20px;">
                        <div class="sec-num">19.</div><div class="sec-lbl">Remarks : <div style="border: 1px solid #000; min-height: 100px; padding: 5px; margin-top: 5px;">${val(c.rbi_remarks)}</div></div>
                    </div>

                    <div class="sec-row" style="margin-top: 30px;">
                        <div class="sec-num">20.</div><div class="sec-lbl">Uniform Part-I : ${box('', 16)} (Auto)</div>
                        <div class="sec-num">21.</div><div class="sec-lbl">Part-II : ${box('', 7)} (Auto)</div>
                    </div>

                    <div class="page-footer">Proforma - Page 7 of 7</div>
                </div>
            `;} else {
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
        const isProforma = ['PROFORMA_BRANCH_CODE', 'RBI_BO_PROFORMA'].includes(note.type);
        
        let pdfTitle = note.titleEn;
        let pdfSubTitle = undefined;

        if (note.type === 'PROFORMA_BRANCH_CODE') {
            pdfTitle = 'PROFORMA FOR OBTENTION OF BRANCH CODE';
            pdfSubTitle = 'கிளைக் குறியீடு பெறுவதற்கான படிவம் / शाखा कोड प्राप्त करने के लिए प्रोफார்மா';
        } else if (note.type === 'RBI_BO_PROFORMA') {
            pdfTitle = 'PROFORMA FOR REPORTING TO RBI - ANNEX-I';
            pdfSubTitle = 'भारतीय रिज़र्व बैंक को रिपोर्ट करने के लिए प्रोफार्मा / ரிசர்வ் வங்கிக்கு சமர்ப்பிப்பதற்கான படிவம்';
        }

        const isPlanningOrProforma = isProforma || (note as any).deptName === 'Planning Department' || (note.contentJson && JSON.parse(note.contentJson).deptName === 'Planning Department');
        const signatoryName = isPlanningOrProforma ? 'NIRAJ KUMAR' : note.preparer.fullNameEn;
        const signatoryTitleEn = isPlanningOrProforma ? 'Chief Manager' : (note.preparer.role === 'ADMIN' ? 'Administrator' : 'Preparer');
        const signatoryTitleHi = isPlanningOrProforma ? 'मुख्य प्रबंधक' : (note.preparer.role === 'ADMIN' ? 'प्रशासक' : 'तैयारकर्ता');
        const signatoryTitleTa = isPlanningOrProforma ? 'தலைமை மேலாளர்' : (note.preparer.role === 'ADMIN' ? 'நிர்வாகி' : 'தயாரித்தவர்');

        const html = buildPremiumLayout({
            title: pdfTitle,
            subTitle: pdfSubTitle,
            refNo,
            date: noteDate,
            bodyHtml,
            signatoryName,
            signatoryTitleEn,
            signatoryTitleHi,
            signatoryTitleTa,
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
