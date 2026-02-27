import prisma from '../lib/prisma';
import { generatePDF, renderTemplate } from './pdfService';
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

    // 2. Fetch Regional Office details for contact info
    const roLookupCode = '3933';
    const ro = await (prisma as any).branch.findUnique({
        where: { code: roLookupCode }
    });
    console.log('[InternalNoteService] RO Branch Lookup Result:', ro ? 'Found' : 'Not Found');

    // 3. Determine dynamic office title based on creator's branch
    let officeTitleEn = 'Dindigul Regional Office';
    let officeTitleTa = 'திண்டுக்கல் மண்டல அலுவலகம்';
    let officeTitleHi = 'दिण्डुक्कल क्षेत्रीय कार्यालय';

    console.log('[InternalNoteService] Creator Branch ID:', data.creatorBranchId);

    if (data.creatorBranchId) {
        const creatorBranch = await (prisma as any).branch.findUnique({
            where: { id: data.creatorBranchId }
        });

        if (creatorBranch) {
            console.log('[InternalNoteService] Found Creator Branch:', creatorBranch.nameEn, 'Type:', creatorBranch.type);
            const typeLower = (creatorBranch.type || '').toLowerCase();
            const isROBranch = typeLower === 'ro' || typeLower === 'regional office' || typeLower === 'regional_office';

            if (isROBranch) {
                officeTitleEn = creatorBranch.nameEn || 'Dindigul Regional Office';
                officeTitleTa = creatorBranch.nameTa || 'திண்டுக்கல் மண்டல அலுவலகம்';
                officeTitleHi = creatorBranch.nameHi || 'दिण्डुक्कल क्षेत्रीय कार्यालय';
            } else {
                officeTitleEn = `${creatorBranch.nameEn} Branch`;
                officeTitleTa = `${creatorBranch.nameTa || creatorBranch.nameEn} கிளை`;
                officeTitleHi = `${creatorBranch.nameHi || creatorBranch.nameEn} शाखा`;
            }
        } else {
            console.log('[InternalNoteService] Creator Branch NOT found for ID:', data.creatorBranchId);
        }
    } else {
        console.log('[InternalNoteService] No Creator Branch ID provided, using RO defaults');
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
        roAddressEn: ro?.address || 'Regional Office, Dindigul',
        roAddressTa: ro?.addressTa || '',
        roAddressHi: ro?.addressHi || '',
        roPhone: '0451-2423344',
        roEmail: 'rodindigul@iob.in'
    });
    console.log('[InternalNoteService] HTML Rendered');

    // 3. Generate PDF
    const pdfBuffer = await generatePDF(html);

    // 4. Save to database
    const { date, ...dbData } = data; // Don't save manual date to DB if not in schema, or adjust schema
    const note = await (prisma as any).internalNote.create({
        data: {
            ...dbData,
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
        const updatedNote = await (prisma as any).internalNote.update({
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
    return await (prisma as any).internalNote.findUnique({
        where: { id }
    });
}
