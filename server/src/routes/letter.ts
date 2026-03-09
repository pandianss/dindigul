import { Router } from 'express';
import { prisma } from '../index';
import { authenticateToken } from '../middleware/auth';
import { createNotification } from '../services/notificationService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { parsePagination } from '../utils/pagination';
import { z } from 'zod';
import { validate } from '../lib/validate';
import { letterService } from '../services/letterService';
import { generatePDF } from '../services/pdfService';
import { generateLettersForPeriod } from '../services/letterCriteriaService';

const router = Router();

// Configure multer for scanned letter uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'letters');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `signed-letter-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB hard cap
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: PDF, JPG, PNG`));
    }
  },
});

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// GET /api/letters/criteria  — read current generation criteria
router.get('/criteria', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
  try {
    const rows = await prisma.systemConfig.findMany({ where: { group: 'LETTER_CRITERIA' } });
    const config = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Failed to fetch criteria' });
  }
});

// PUT /api/letters/criteria  — update generation criteria
router.put('/criteria', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });

  const allowed = [
    'LETTER_ENABLED_PARAMS', 'LETTER_APPRECIATION_TOP_N', 'LETTER_EXPLANATION_BOTTOM_N',
    'LETTER_APPRECIATION_THRESHOLD', 'LETTER_EXPLANATION_THRESHOLD',
    'LETTER_INVERT_PARAMS', 'LETTER_OPRISK_FROM_EXCEPTIONS'
  ];

  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      if (!allowed.includes(key)) continue;
      await prisma.systemConfig.update({ where: { key }, data: { value: String(value) } });
    }
    res.json({ message: 'Letter criteria updated successfully' });
  } catch {
    res.status(500).json({ error: 'Failed to update criteria' });
  }
});

// Upload scanned signed copy of a letter
router.post('/:id/upload-scan', authenticateToken, upload.single('document'), async (req: any, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded' });
    }

    const scannedCopyUrl = `/uploads/letters/${req.file.filename}`;

    const letter = await prisma.letter.update({
      where: { id },
      data: { scannedCopyUrl }
    });

    res.json({ message: 'Scanned document uploaded successfully', letter });
  } catch (error) {
    console.error('Error uploading scanned letter:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get all letters — BRANCH_USER sees only their branch (GAP 03)
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const { branchId, type } = req.query;
    const scopedBranchId = req.user?.role === 'BRANCH_USER'
      ? req.user.branchId
      : (branchId ? String(branchId) : undefined);
    const whereClause = {
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      ...(type ? { type: String(type) } : {})
    };
    const { skip, take, page, limit } = parsePagination(req);

    const response = await letterService.getLetters(req.user, branchId, type, skip, take, page, limit);

    res.json(response);
  } catch (error) {
    console.error('Error fetching letters:', error);
    res.status(500).json({ error: 'Failed to fetch letters' });
  }
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.string().min(1, 'Status is required')
  })
});

// Update letter status
router.patch('/:id/status', authenticateToken, validate(updateStatusSchema), async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const letter = await letterService.updateStatus(id, status);
    res.json(letter);
  } catch (error) {
    console.error('Error updating letter status:', error);
    res.status(500).json({ error: 'Failed to update letter status' });
  }
});

// GAP 19: Update letter with versioning
router.put('/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  const { titleEn, contentEn } = req.body;
  try {
    const letterOrUpdated = await letterService.updateLetter(id, titleEn, contentEn);
    if ('version' in letterOrUpdated && letterOrUpdated.version > 1 && letterOrUpdated.status === 'DRAFT') {
      res.json({ message: 'New version created', letter: letterOrUpdated });
    } else {
      res.json(letterOrUpdated);
    }
  } catch (err) {
    console.error('Update letter error:', err);
    res.status(500).json({ error: 'Failed to update letter' });
  }
});

const generateLetterSchema = z.object({
  body: z.object({
    period: z.string().min(1, 'Period is required')
  })
});

// POST /api/letters/generate
router.post('/generate', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Only ADMIN users may generate letters' });
  }

  const { period } = req.body;
  if (!period) return res.status(400).json({ error: 'period is required (e.g. "Aug 2025")' });

  try {
    const result = await generateLettersForPeriod(period);
    res.json({
      message: `Generated ${result.created} letter(s) for ${period}. ${result.skipped} skipped (already exist).`,
      ...result
    });
  } catch (error) {
    console.error('[Letters] Generation failed:', error);
    res.status(500).json({ error: 'Failed to generate letters' });
  }
});

function fontToBase64(filename: string): string {
  try {
    const fontPath = path.join(process.cwd(), '..', 'public', 'fonts', filename);
    const buffer = fs.readFileSync(fontPath);
    return buffer.toString('base64');
  } catch {
    return '';
  }
}

function imageToBase64(assetRelPath: string): string {
  try {
    const fullPath = path.join(process.cwd(), '..', 'public', assetRelPath);
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(assetRelPath).slice(1).toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return '';
  }
}

function buildLetterHtml(letter: any): string {
  const org = letter.orgMeta || {};

  // ── Fonts ────────────────────────────────────────────────────────────────
  const interRegular = fontToBase64('inter-400.ttf');
  const interBold = fontToBase64('inter-700.ttf');
  const notoHindi400 = fontToBase64('noto-hindi-400.ttf');
  const notoHindi700 = fontToBase64('noto-hindi-700.ttf');
  const notoTamil400 = fontToBase64('noto-tamil-400.ttf');
  const notoTamil700 = fontToBase64('noto-tamil-700.ttf');

  // ── Images ───────────────────────────────────────────────────────────────
  const emblemSrc = imageToBase64('assets/logo_center.svg');
  const watermarkSrc = imageToBase64('assets/logo_center.svg');

  // ── Org data (fall back to DB values) ────────────────────────────────────
  const bankNameEn = (org.bankNameEn || letter.branch?.bankNameEn || 'Indian Overseas Bank').toLowerCase();
  const bankNameHi = org.bankNameHi || letter.branch?.bankNameHi || 'इंडियन ओवरसीज बैंक';
  const bankNameTa = org.bankNameTa || letter.branch?.bankNameTa || 'இந்தியன் ஓவர்சீஸ் வங்கி';
  const officeNameEn = (org.officeNameEn || 'Regional Office, Dindigul').toLowerCase();
  const officeNameHi = org.officeNameHi || 'क्षेत्रीय कार्यालय, डिंडीगुल';
  const officeNameTa = org.officeNameTa || 'மண்டல அலுவலகம், திண்டுக்கல்';
  const addressEn = org.address || 'Regional Office, 123 Madurai Road, Dindigul - 624001, Tamil Nadu';
  const addressHi = org.addressHi || 'क्षेत्रीय कार्यालय, 123 मदुरै रोड, डिंडीगुल - 624001, तमिलनाडु';
  const addressTa = org.addressTa || 'மண்டல அலுவலகம், 123 மதுரை ரோடு, திண்டுக்கல் - 624001, தமிழ்நாடு';
  const phone = org.phone || '';
  const email = org.email || '';
  const signatoryName = org.signatoryName || '';
  const signingAuthEn = (org.signingAuthEn || 'Regional Manager').toLowerCase();
  const signingAuthHi = org.signingAuthHi || 'क्षेत्रीय प्रबंधक';
  const signingAuthTa = org.signingAuthTa || 'மண்டல மேலாளர்';

  const branchHead = letter.branch?.headUser;
  const isFemale = branchHead?.gender === 'F';
  const salEnglish = isFemale ? 'Smt.' : 'Shri.';
  const salHindi = isFemale ? 'श्रीमती.' : 'श्री.';
  const salTamil = isFemale ? 'திருமதி.' : 'திரு.';

  const toTitleCase = (s: string) =>
    (s || '').toLowerCase().split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const dateStr = new Date(letter.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, '.');

  // ── Body paragraphs ──────────────────────────────────────────────────────
  const bodyHtml = letter.contentEn.split('\n\n').map((para: string) => {
    if (para.trim() === '[PERFORMANCE_TABLE]') {
      const pd = org.performanceData;
      if (!pd) return '';
      const fyGrowth = pd.latest - pd.march31st;
      const growthColor = fyGrowth < 0 ? '#b91c1c' : '#15803d';
      const gapColor = pd.gap < 0 ? '#b91c1c' : '#15803d';
      const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      return `
            <div style="margin:24px 16px;">
              <table style="width:100%;border-collapse:collapse;font-size:10px;text-align:center;">
                <thead>
                  <tr style="background:#f1f5f9;color:#1e3a5f;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">
                    <th style="border:1px solid #94a3b8;padding:6px 4px;">March 31 Actuals</th>
                    <th style="border:1px solid #94a3b8;padding:6px 4px;">Latest Actuals</th>
                    <th style="border:1px solid #94a3b8;padding:6px 4px;">FY Growth</th>
                    <th style="border:1px solid #94a3b8;padding:6px 4px;">Budget</th>
                    <th style="border:1px solid #94a3b8;padding:6px 4px;">Gap to Budget</th>
                    <th style="border:1px solid #94a3b8;padding:6px 4px;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="font-size:12px;">
                    <td style="border:1px solid #94a3b8;padding:6px 4px;">₹ ${fmt(pd.march31st)} Cr</td>
                    <td style="border:1px solid #94a3b8;padding:6px 4px;font-weight:700;color:#1e3a5f;">₹ ${fmt(pd.latest)} Cr</td>
                    <td style="border:1px solid #94a3b8;padding:6px 4px;font-weight:700;color:${growthColor};">${fyGrowth < 0 ? '-' : '+'}₹ ${fmt(Math.abs(fyGrowth))} Cr</td>
                    <td style="border:1px solid #94a3b8;padding:6px 4px;">₹ ${fmt(pd.budget)} Cr</td>
                    <td style="border:1px solid #94a3b8;padding:6px 4px;font-weight:700;color:${gapColor};">${pd.gap < 0 ? '-' : '+'}₹ ${fmt(Math.abs(pd.gap))} Cr</td>
                    <td style="border:1px solid #94a3b8;padding:6px 4px;font-weight:700;color:${gapColor};">${pd.status === '-ve' ? 'SHORTFALL' : 'ACHIEVED'}</td>
                  </tr>
                </tbody>
              </table>
            </div>`;
    }
    return `<p style="margin-bottom:16px;text-align:justify;line-height:1.7;">${para}</p>`;
  }).join('');

  // ── Full HTML document ───────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @font-face { font-family:'Inter'; font-weight:400; src:url('data:font/truetype;base64,${interRegular}') format('truetype'); }
  @font-face { font-family:'Inter'; font-weight:700; src:url('data:font/truetype;base64,${interBold}') format('truetype'); }
  @font-face { font-family:'NotoHindi'; font-weight:400; src:url('data:font/truetype;base64,${notoHindi400}') format('truetype'); }
  @font-face { font-family:'NotoHindi'; font-weight:700; src:url('data:font/truetype;base64,${notoHindi700}') format('truetype'); }
  @font-face { font-family:'NotoTamil'; font-weight:400; src:url('data:font/truetype;base64,${notoTamil400}') format('truetype'); }
  @font-face { font-family:'NotoTamil'; font-weight:700; src:url('data:font/truetype;base64,${notoTamil700}') format('truetype'); }

  @page { size: A4; margin: 20mm 15mm; }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 12px;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.6;
  }

  .hindi  { font-family: 'NotoHindi', sans-serif; }
  .tamil  { font-family: 'NotoTamil', sans-serif; }

  .page {
    width: 210mm;
    min-height: 297mm;
    position: relative;
    background: #fff;
  }

  .watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.04;
    pointer-events: none;
    z-index: 0;
  }

  .watermark img { width: 480px; }

  .content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-height: 297mm;
  }

  /* ── Header ── */
  .header { border-bottom: 1.5px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 24px; }
  .header-top { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
  .header-top img { height: 65px; width: 65px; object-fit: contain; }
  .bank-names { display: flex; flex-direction: column; gap: 3px; }
  .bank-names h1 { color: #1e3a5f; line-height: 1.1; }

  .col-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; width: 100%; color: #1e3a5f; margin-top: 12px; }
  .col-grid .col { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 0 8px; }
  .col-grid .col + .col { border-left: 1px solid rgba(30,58,95,0.2); }
  .col-name  { font-weight: 700; font-size: 13px; text-align: center; line-height: 1.3; }
  .col-addr  { font-size: 11px; text-align: center; line-height: 1.5; opacity: 0.9; }
  .col-addr.hindi { font-size: 12.0px; }

  .contact-row {
    display: flex; justify-content: center; gap: 32px;
    font-size: 11.5px; font-weight: 700; color: #1e3a5f;
    margin-top: 10px; padding-top: 8px;
    border-top: 1px solid rgba(30,58,95,0.1);
  }

  /* ── Date ── */
  .date-line { text-align: right; margin-bottom: 32px; font-size: 11.5px; font-weight: 700; color: #1e293b; }

  /* ── Addressee ── */
  .addressee { margin-bottom: 32px; }
  .addressee p { line-height: 1.6; }

  /* ── Subject ── */
  .subject {
    text-align: center; font-weight: 700; font-size: 18px;
    text-decoration: underline; text-transform: uppercase;
    letter-spacing: 0.08em; color: #1e3a5f;
    margin-bottom: 32px;
  }

  /* ── Body ── */
  .body { flex-grow: 1; color: #1e293b; }

  /* ── Signature ── */
  .signature { margin-top: 80px; display: flex; justify-content: flex-end; }
  .signature-block { text-align: center; min-width: 220px; }
  .sig-line { border-top: 1.5px solid #9ca3af; margin-bottom: 4px; padding-top: 4px; }
  .sig-name { font-weight: 700; color: #1e3a5f; font-size: 15px; margin-bottom: 4px; }
  .sig-titles { display: flex; flex-direction: column; gap: 3px; }
  .sig-titles p { font-weight: 700; color: #1e3a5f; }
</style>
</head>
<body>
<div class="page">
  <div class="watermark"><img src="${watermarkSrc}" alt=""/></div>

  <div class="content">

    <!-- HEADER -->
    <div class="header">
      <div class="header-top">
        <img src="${emblemSrc}" alt="Bank Logo"/>
        <div class="bank-names">
          <h1 class="hindi" style="font-size:17px;">${bankNameHi}</h1>
          <h1 class="tamil" style="font-size:16px;">${bankNameTa}</h1>
          <h1 style="font-size:17px;text-transform:capitalize;">${bankNameEn}</h1>
        </div>
      </div>

      <div class="col-grid">
        <div class="col">
          <p class="col-name hindi">${officeNameHi}</p>
          <p class="col-addr hindi">${addressHi}</p>
        </div>
        <div class="col">
          <p class="col-name tamil">${officeNameTa}</p>
          <p class="col-addr tamil">${addressTa}</p>
        </div>
        <div class="col">
          <p class="col-name" style="text-transform:capitalize;">${officeNameEn}</p>
          <p class="col-addr">${addressEn}</p>
        </div>
      </div>

      <div class="contact-row">
        <span><span style="opacity:0.7;">Phone:</span> ${phone}</span>
        <span><span style="opacity:0.7;">Email:</span> ${email}</span>
      </div>
    </div>

    <!-- DATE -->
    <div class="date-line">
      <span class="hindi" style="font-size:12.5px;">दिनांक</span> /
      <span class="tamil" style="font-size:10.5px;">தேதி</span> /
      Date: ${dateStr}
    </div>

    <!-- ADDRESSEE -->
    <div class="addressee">
      <p style="font-weight:700;">To,</p>
      ${branchHead ? `
        <p style="font-weight:700;">
          ${branchHead.fullNameHi ? `<span class="hindi" style="font-size:13px;">${salHindi} ${branchHead.fullNameHi} / </span>` : ''}
          ${branchHead.fullNameTa ? `<span class="tamil" style="font-size:11px;">${salTamil} ${branchHead.fullNameTa} / </span>` : ''}
          <span>${salEnglish} ${toTitleCase(branchHead.fullNameEn)}</span>
        </p>
        <p style="font-weight:700;">
          ${branchHead.designation?.nameHi ? `<span class="hindi" style="font-size:13px;">${branchHead.designation.nameHi} / </span>` : ''}
          ${branchHead.designation?.nameTa ? `<span class="tamil" style="font-size:11px;">${branchHead.designation.nameTa} / </span>` : ''}
          <span>${toTitleCase(branchHead.designation?.nameEn || 'Branch Head')}</span>
        </p>` : `<p style="font-weight:700;">The Branch Manager</p>`}
      <div style="margin-top:6px;">
        <p style="text-transform:capitalize;">${bankNameEn}</p>
        <p style="font-weight:700;">${letter.branch?.nameEn || ''} Branch</p>
      </div>
    </div>

    <!-- SUBJECT -->
    <div class="subject">${letter.titleEn}</div>

    <!-- BODY -->
    <div class="body">${bodyHtml}</div>

    <!-- SIGNATURE -->
    <div class="signature">
      <div class="signature-block">
        <div class="sig-line"></div>
        <p class="sig-name">(${toTitleCase(signatoryName)})</p>
        <div class="sig-titles">
          <p class="hindi" style="font-size:14px;">${signingAuthHi}</p>
          <p class="tamil" style="font-size:11px;">${signingAuthTa}</p>
          <p style="font-size:12px;text-transform:capitalize;">${signingAuthEn}</p>
        </div>
      </div>
    </div>

  </div>
</div>
</body>
</html>`;
}

// GET /api/letters/:id/pdf
router.get('/:id/pdf', authenticateToken, async (req: any, res) => {
  try {
    const letter = await (prisma as any).letter.findUnique({
      where: { id: req.params.id },
      include: {
        branch: {
          include: {
            headUser: {
              include: { designation: true }
            }
          }
        },
        parameter: true
      }
    });

    if (!letter) {
      return res.status(404).json({ error: 'Letter not found' });
    }

    // Branch users may only download their own branch letters
    if (req.user.role === 'BRANCH_USER' && letter.branchId !== req.user.branchId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const html = buildLetterHtml(letter);
    const pdfBuffer = await generatePDF(html);

    const safeTitle = letter.titleEn
      .replace(/\\s+/g, '_')
      .replace(/[^a-zA-Z0-9_\-]/g, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename = "${safeTitle}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('[PDF] Generation failed:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

export default router;
