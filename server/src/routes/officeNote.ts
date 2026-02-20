import { Router } from 'express';
import { prisma } from '../index';
import { generatePDF } from '../services/pdfService';

const router = Router();

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
                status: 'APPROVED'
            }
        });
        res.json(note);
    } catch (error) {
        console.error('Error creating office note:', error);
        res.status(500).json({ error: 'Failed to create office note' });
    }
});

// Generate PDF for office note
router.get('/:id/pdf', async (req: any, res) => {
    const { id } = req.params;
    try {
        const note = await (prisma as any).officeNote.findUnique({
            where: { id },
            include: { preparer: true }
        });

        if (!note) return res.status(404).json({ error: 'Note not found' });

        const content = typeof note.contentJson === 'string' ? JSON.parse(note.contentJson) : note.contentJson;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
                    body { font-family: 'Inter', sans-serif; padding: 0; margin: 0; color: #333; }
                    .container { padding: 40px; }
                    .header { display: flex; justify-content: space-between; border-bottom: 3px solid #1B3A6B; padding-bottom: 20px; margin-bottom: 40px; }
                    .bank-logo { color: #1B3A6B; font-size: 28px; font-weight: 800; letter-spacing: -1px; }
                    .bank-name { font-size: 14px; font-weight: 700; color: #1B3A6B; text-transform: uppercase; }
                    .office-note-label { background: #1B3A6B; color: white; padding: 5px 15px; font-weight: 700; font-size: 18px; height: fit-content; }
                    
                    .metadata-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                    .metadata-table td { padding: 8px 0; border-bottom: 1px solid #eee; font-size: 13px; }
                    .metadata-table td.label { font-weight: 700; color: #666; width: 150px; text-transform: uppercase; font-size: 11px; }

                    .subject-box { background: #f8fafc; padding: 15px; border-left: 5px solid #1B3A6B; margin-bottom: 30px; }
                    .subject-title { font-size: 16px; font-weight: 700; color: #1B3A6B; margin-bottom: 5px; }
                    .subject-ta { font-size: 14px; color: #444; }

                    .main-content { line-height: 1.8; font-size: 14px; text-align: justify; min-height: 300px; }
                    .section-title { font-weight: 700; text-decoration: underline; margin-top: 20px; margin-bottom: 10px; color: #1B3A6B; }

                    .signature-area { margin-top: 60px; display: flex; justify-content: flex-end; }
                    .signature-box { text-align: center; width: 250px; }
                    .sig-line { border-top: 1px solid #333; margin-bottom: 10px; }
                    .sig-name { font-weight: 700; font-size: 14px; }
                    .sig-desc { font-size: 12px; color: #666; }

                    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100px; color: rgba(27, 58, 107, 0.03); font-weight: 800; z-index: -1; white-space: nowrap; }
                </style>
            </head>
            <body>
                <div class="watermark">INTERNAL ONLY</div>
                <div class="container">
                    <div class="header">
                        <div>
                            <div class="bank-logo">PANDIAN SS</div>
                            <div class="bank-name">Dindigul Regional Office</div>
                        </div>
                        <div class="office-note-label">OFFICE NOTE</div>
                    </div>

                    <table class="metadata-table">
                        <tr>
                            <td class="label">Reference No:</td>
                            <td>RO/ADMIN/${new Date(note.createdAt).getFullYear()}/${note.id.slice(-4).toUpperCase()}</td>
                            <td class="label">Date:</td>
                            <td>${new Date(note.createdAt).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td class="label">From:</td>
                            <td>${note.preparer.fullNameEn}</td>
                            <td class="label">Note Type:</td>
                            <td>${note.type.replace(/_/g, ' ')}</td>
                        </tr>
                    </table>

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

                    <div class="signature-area">
                        <div class="signature-box">
                            <div class="sig-line"></div>
                            <div class="sig-name">${note.preparer.fullNameEn}</div>
                            <div class="sig-desc">Prepared By (Employee ID: ${note.preparer.username})</div>
                            <div class="sig-desc">${new Date(note.createdAt).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const pdf = await generatePDF(html);
        res.contentType('application/pdf');
        res.send(pdf);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

export default router;
