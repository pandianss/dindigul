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
                    include: { 
                        department: true,
                        branch: true
                    }
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

                    <div style="margin-top: 60px; display: flex; justify-content: space-between;">
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
            pdfSubTitle = 'கிளைக் குறியீடு பெறுவதற்கான படிவம் / शाखा कोड प्राप्त करने के लिए प्रोफार्मा';
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
            signatoryName: isProforma ? (RO_DATA.signatoryName || signatoryName) : signatoryName,
            signatoryTitleEn: isProforma ? (RO_DATA.signingAuthEn || signatoryTitleEn) : signatoryTitleEn,
            signatoryTitleHi: isProforma ? RO_DATA.signingAuthHi : (note.preparer.role === 'ADMIN' ? 'प्रशासक' : 'तैयाர்कर्ता'),
            signatoryTitleTa: isProforma ? (RO_DATA.signingAuthTa || signatoryTitleTa) : signatoryTitleTa,
            organization: RO_DATA,
            hideHeader: note.type === 'RBI_BO_PROFORMA',
            hideMeta: note.type === 'RBI_BO_PROFORMA',
            hideTitle: note.type === 'RBI_BO_PROFORMA'
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
