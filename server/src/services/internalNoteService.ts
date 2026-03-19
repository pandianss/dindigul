import prisma from '../lib/prisma';
import { generatePDF, renderTemplate, getRegionalOfficeData } from './pdfService';
import fs from 'fs/promises';
import path from 'path';

export async function createInternalNote(data: {
    refNo: string;
    department: string;
    departmentTa?: string;
    departmentHi?: string;
    subject: string;
    classification: string;
    createdBy: string;
    bodyHtml: string;
    date?: string; // Optional manual date
    creatorBranchId?: string;
}) {
    console.log('[InternalNoteService] Starting creation process for:', data.refNo);

    // 1. Prepare logo base64 if available
    let logoBase64 = '';
    const logoPath = path.join(process.cwd(), '..', 'public', 'assets', 'logo_center.svg');
    try {
        console.log('[InternalNoteService] Loading logo from:', logoPath);
        const logoBuffer = await fs.readFile(logoPath);
        logoBase64 = logoBuffer.toString('base64');
        console.log('[InternalNoteService] Logo loaded successfully');
    } catch (err) {
        console.warn('[InternalNoteService] Logo not found at expected path:', logoPath, ' Proceeding without it');
    }

    const RO_DATA = await getRegionalOfficeData();

    let officeTitleEn = RO_DATA.officeNameEn;
    let officeTitleTa = RO_DATA.officeNameTa;
    let officeTitleHi = RO_DATA.officeNameHi;

    if (data.creatorBranchId) {
        const creatorBranch = await prisma.branch.findUnique({
            where: { id: data.creatorBranchId }
        });

        if (creatorBranch) {
            const typeLower = (creatorBranch.type || '').toLowerCase();
            const isROBranch = typeLower === 'ro' || typeLower === 'regional office' || typeLower === 'regional_office';

            if (!isROBranch) {
                officeTitleEn = `${creatorBranch.nameEn} Branch`;
                officeTitleTa = `${creatorBranch.nameTa || creatorBranch.nameEn} கிளை`;
                officeTitleHi = `${creatorBranch.nameHi || creatorBranch.nameEn} शाखा`;
            } else {
                officeTitleEn = creatorBranch.nameEn || RO_DATA.officeNameEn;
                officeTitleTa = creatorBranch.nameTa || RO_DATA.officeNameTa;
                officeTitleHi = creatorBranch.nameHi || RO_DATA.officeNameHi;
            }
        }
    }

    console.log('[InternalNoteService] Final Titles:', { officeTitleEn, officeTitleTa, officeTitleHi });

    const noteDate = data.date || new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });

    // 4. Render HTML
    console.log('[InternalNoteService] Rendering template...');
    const html = await renderTemplate('internal-note', {
        ...data,
        logoBase64,
        date: noteDate,
        officeTitleEn,
        officeTitleTa,
        officeTitleHi,
        roAddressEn: RO_DATA.addressEn,
        roAddressTa: RO_DATA.addressTa,
        roAddressHi: RO_DATA.addressHi,
        roPhone: RO_DATA.phone,
        roEmail: RO_DATA.email
    });
    console.log('[InternalNoteService] HTML Rendered');

    // 3. Generate PDF
    const pdfBuffer = await generatePDF(html);

    // 4. Save to database
    const { date, creatorBranchId, ...dbData } = data; // Don't save manual date or branchId to DB if not in schema
    const note = await prisma.internalNote.create({
        data: {
            refNo: data.refNo,
            department: data.department,
            departmentTa: data.departmentTa,
            departmentHi: data.departmentHi,
            subject: data.subject,
            classification: data.classification,
            createdBy: data.createdBy,
            bodyHtml: data.bodyHtml,
            fileUrl: ''
        }
    });

    // 5. Save PDF to disk with new filename format: [date]_[refNo].pdf
    // Sanitize refNo and date for filename
    const safeRefNo = data.refNo.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeDate = noteDate.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    try {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'internal-notes');
        await fs.mkdir(uploadsDir, { recursive: true });
        const fileName = `${safeDate}_${safeRefNo}.pdf`;
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, pdfBuffer);

        // Update fileUrl
        const updatedNote = await prisma.internalNote.update({
            where: { id: note.id },
            data: { fileUrl: `/uploads/internal-notes/${fileName}` }
        });
        return { note: updatedNote, pdfBuffer };
    } catch (fsErr) {
        console.error('[InternalNoteService] Error saving PDF:', fsErr);
        throw fsErr;
    }
}

export async function getInternalNoteById(id: string) {
    return await prisma.internalNote.findUnique({
        where: { id }
    });
}
