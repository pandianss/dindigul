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
import { generatePDF, buildPremiumLayout, getRegionalOfficeData } from '../services/pdfService';
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

// GET /api/letters/criteria
router.get('/criteria', authenticateToken, async (req: any, res) => {
  const isPlanning = req.user.section?.toLowerCase() === 'planning';
  if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });
  try {
    const rows = await prisma.systemConfig.findMany({ where: { group: 'LETTER_CRITERIA' } });
    const config = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Failed to fetch criteria' });
  }
});

// PUT /api/letters/criteria
router.put('/criteria', authenticateToken, async (req: any, res) => {
  const isPlanning = req.user.section?.toLowerCase() === 'planning';
  if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });
  const allowed = [
    'LETTER_ENABLED_PARAMS', 'LETTER_APPRECIATION_TOP_N', 'LETTER_EXPLANATION_BOTTOM_N',
    'LETTER_APPRECIATION_THRESHOLD', 'LETTER_EXPLANATION_THRESHOLD',
    'LETTER_INVERT_PARAMS', 'LETTER_OPRISK_FROM_EXCEPTIONS', 'LETTER_OPRISK_SEVERITIES'
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

// Upload scanned signed copy
router.post('/:id/upload-scan', authenticateToken, upload.single('document'), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No document file uploaded' });
    const scannedCopyUrl = `/uploads/letters/${req.file.filename}`;
    const letter = await prisma.letter.update({
      where: { id },
      data: { scannedCopyUrl }
    });
    res.json({ message: 'Scanned document uploaded successfully', letter });
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get all letters
router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const { branchId, type } = req.query;
    const { skip, take, page, limit } = parsePagination(req);
    const response = await letterService.getLetters(req.user, branchId, type, skip, take, page, limit);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch letters' });
  }
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.string().min(1, 'Status is required')
  })
});

router.patch('/:id/status', authenticateToken, validate(updateStatusSchema), async (req: any, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const letter = await letterService.updateStatus(id, status);
    res.json(letter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update letter status' });
  }
});

router.get('/templates', authenticateToken, async (req: any, res) => {
  try {
    const { category } = req.query;
    const templates = await letterService.getTemplates(category as string);
    res.json(templates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.post('/templates', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
  try {
    const template = await letterService.createTemplate(req.body);
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const letter = await letterService.createManualLetter(req.user, req.body);
    res.json(letter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create manual letter' });
  }
});

router.put('/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const letterOrUpdated = await letterService.updateLetter(id, req.body);
    res.json(letterOrUpdated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update letter' });
  }
});

router.post('/generate', authenticateToken, async (req: any, res) => {
  const isPlanningDept = req.user.role === 'RO_USER' && req.user.section === 'Planning';
  if (req.user.role !== 'ADMIN' && !isPlanningDept) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const { period, date, type } = req.body;
  if (!period) return res.status(400).json({ error: 'period is required' });
  try {
    const result = await generateLettersForPeriod(period, { date, type });
    res.json({ message: `Generated ${result.created} letter(s).`, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate letters' });
  }
});

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

    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (req.user.role === 'BRANCH_USER' && letter.branchId !== req.user.branchId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const RO_DATA = await getRegionalOfficeData();
    const { imageToBase64 } = require('../services/pdfService');
    const planningDept = await prisma.department.findFirst({ 
      where: { OR: [{ nameEn: 'Planning' }, { code: 'PLNG' }] } 
    });
    const deptSealPath = planningDept?.sealPath;
    const deptSealSrc = deptSealPath ? imageToBase64(deptSealPath) : undefined;
    const org = letter.orgMeta || {};
    
    // Inject CURRENT RO data into context
    const isOpRisk = letter.type === 'OP_RISK';
    const signatoryName = isOpRisk ? 'NIRAJ KUMAR' : (org.signatoryName || RO_DATA.signatoryName || 'Regional Manager');
    const signatoryTitleEn = isOpRisk ? 'Chief Manager' : (org.signingAuthEn || RO_DATA.signingAuthEn || 'Regional Manager');
    const signatoryTitleHi = isOpRisk ? 'मुख्य प्रबंधक' : (org.signingAuthHi || RO_DATA.signingAuthHi || 'क्षेत्रीय प्रबंधक');
    const signatoryTitleTa = isOpRisk ? 'தலைமை மேலாளர்' : (org.signingAuthTa || RO_DATA.signingAuthTa || 'மண்டல மேலாளர்');

    const html = buildPremiumLayout({
      title: letter.titleEn,
      titleHi: letter.titleHi || undefined,
      titleTa: letter.titleTa || undefined,
      refNo: letter.referenceNo || `RO/ADMIN/${new Date(letter.createdAt).getFullYear()}/${letter.id.slice(-4).toUpperCase()}`,
      date: new Date(letter.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      }).replace(/\//g, '.'),
      bodyHtml: buildLetterBodyHtml(letter, RO_DATA),
      signatoryName,
      signatoryTitleEn,
            signatoryTitleHi,
            signatoryTitleTa,
            organization: RO_DATA,
            deptSealSrc,
            isAdvisory: isOpRisk
        });

    const pdfBuffer = await generatePDF(html);
    const safeTitle = letter.titleEn.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[PDF] Generation failed:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

function buildLetterBodyHtml(letter: any, RO_DATA: any): string {
  if (letter.isExternal) {
    const contentEn = letter.contentEn || '';
    const paragraphs = contentEn.split('\n\n');
    let body = `
      <div style="margin-bottom: 25px;">
        <p style="font-weight:700;">To,</p>
        <p style="font-weight:700;">${letter.recipientName || ''}</p>
        <div style="white-space: pre-wrap; font-weight:700; line-height: 1.5;">${letter.recipientAddress || ''}</div>
      </div>
      <div style="margin-top: 15px; text-align: justify;">
        <p style="font-weight:700; margin-bottom: 15px;">${letter.salutation || 'Sir/Madam,'}</p>
    `;

    if (letter.contentHi || letter.contentTa) {
        body += `
          <div style="margin-top: 15px; margin-bottom: 20px;">
            ${letter.contentHi ? `<p class="hindi" style="margin-bottom:10px;text-align:justify;font-size:12px;">${letter.contentHi.replace(/\n/g, '<br/>')}</p>` : ''}
            ${letter.contentTa ? `<p class="tamil" style="margin-bottom:10px;text-align:justify;font-size:10px;">${letter.contentTa.replace(/\n/g, '<br/>')}</p>` : ''}
          </div>
        `;
    }

    for (const para of paragraphs) {
        if (!para.trim()) continue;
        body += `<p style="margin-bottom: 12px;">${para.replace(/\n/g, '<br/>')}</p>`;
    }

    body += `</div>`;
    return body;
  }

  const org = letter.orgMeta || {};
  const pd = org.performanceData;
  const branch = letter.branch;
  const head = branch?.headUser;

  // Personalized Salutation
  const isFemale = head?.gender === 'F';
  const salEn = isFemale ? 'Smt.' : 'Shri.';
  const salHi = isFemale ? 'श्रीमती.' : 'श्री.';
  const salTa = isFemale ? 'திருமதி.' : 'திரு.';

  const headName = head ? `${salEn} ${toTitleCase(head.fullNameEn)}` : 'The Branch Manager';
  const headDesig = toTitleCase(head?.designation?.nameEn || 'Branch Head');

  const isBranch = branch?.type !== 'REGIONAL OFFICE';
  const scale = isBranch ? 100 : 1;
  const unitLabel = isBranch ? 'Lakhs' : 'Cr';

  let bodyHtml = `
    <div style="margin-bottom: 25px;">
      <p style="font-weight:700;">To,</p>
      <p style="font-weight:700;">${headName}</p>
      <p style="font-weight:700;">${headDesig}</p>
      <p>${RO_DATA.bankNameEn}</p>
      <p style="font-weight:700;">${branch?.nameEn || ''} Branch</p>
    </div>
  `;

  if (letter.contentHi || letter.contentTa) {
    bodyHtml += `
      <div style="margin-top: 15px;">
        ${letter.contentHi ? `<p class="hindi" style="margin-bottom:10px;text-align:justify;font-size:12px;">${letter.contentHi.replace(/\n/g, '<br/>')}</p>` : ''}
        ${letter.contentTa ? `<p class="tamil" style="margin-bottom:10px;text-align:justify;font-size:10px;">${letter.contentTa.replace(/\n/g, '<br/>')}</p>` : ''}
      </div>
    `;
  }

  const paragraphs = (letter.contentEn || '').split('\n\n');
  for (const para of paragraphs) {
    if (!para.trim()) continue;
    
    if (para.trim() === '[PERFORMANCE_TABLE]' && pd) {
      // ... (rest of the performance table logic remains the same)
      const fyGrowth = pd.latest - pd.march31st;
      const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      
      // ULTRA-NUCLEAR DETECTION
      const forceInverted = String(letter.titleEn).toUpperCase().includes('NPA') || 
                           String(letter.parameter?.code).toUpperCase().includes('NPA') || 
                           pd.isInverted === true;
      
      const debugText = forceInverted ? 'INVERTED' : 'NORMAL';
      const isAchieved = forceInverted ? (pd.latest <= pd.budget) : (pd.latest >= pd.budget);
      const gapAbs = Math.abs(pd.gap);
      const gapColor = isAchieved ? 'green' : 'red';
      const gapLabel = forceInverted ? (pd.latest <= pd.budget ? 'Reduction' : 'Overrun') : (pd.latest >= pd.budget ? 'Surplus' : 'Shortfall');

      const marchHeader = pd.march31stDate ? new Date(pd.march31stDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'Baseline';
      const latestHeader = pd.latestDate ? new Date(pd.latestDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.') : 'Current';
      const growthColor = forceInverted ? (fyGrowth <= 0 ? 'green' : 'red') : (fyGrowth >= 0 ? 'green' : 'red');

      bodyHtml += `
        <div style="margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:center;">
            <tr style="background:#f1f5f9;font-weight:700;">
              <th style="border:1px solid #94a3b8;padding:8px;">${marchHeader} ACTUALS</th>
              <th style="border:1px solid #94a3b8;padding:8px;">${latestHeader} ACTUALS</th>
              <th style="border:1px solid #94a3b8;padding:8px;">FY GROWTH</th>
              <th style="border:1px solid #94a3b8;padding:8px;">${latestHeader} BUDGET</th>
              <th style="border:1px solid #94a3b8;padding:8px;">GAP TO BUDGET</th>
              <th style="border:1px solid #94a3b8;padding:8px;">STATUS</th>
            </tr>
            <tr>
              <td style="border:1px solid #94a3b8;padding:8px;">₹ ${fmt(pd.march31st * scale)} ${unitLabel}</td>
              <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;">₹ ${fmt(pd.latest * scale)} ${unitLabel}</td>
              <td style="border:1px solid #94a3b8;padding:8px;color:${growthColor}">${fyGrowth >= 0 ? '+' : ''}₹ ${fmt(Math.abs(fyGrowth) * scale)} ${unitLabel}</td>
              <td style="border:1px solid #94a3b8;padding:8px;">₹ ${fmt(pd.budget * scale)} ${unitLabel}</td>
              <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;color:${gapColor}">${pd.gap >= 0 ? '+' : ''}₹ ${fmt(gapAbs * scale)} ${unitLabel} (${gapLabel})</td>
              <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;color:${gapColor}">${isAchieved ? 'ACHIEVED' : 'SHORTFALL'}</td>
            </tr>
          </table>
        </div>
      `;
    } else if (para.includes('[EXCEPTION_TABLE]') && org.exceptions) {
      bodyHtml += `
        <div style="margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
            <tr style="background:#f1f5f9;font-weight:700;">
              <th style="border:1px solid #94a3b8;padding:8px;width:120px;">RULE ID</th>
              <th style="border:1px solid #94a3b8;padding:8px;width:120px;">PARAMETER</th>
              <th style="border:1px solid #94a3b8;padding:8px;">OBSERVATION / EXCEPTION</th>
            </tr>
            ${(org.exceptions || []).map((ex: any) => `
              <tr>
                <td style="border:1px solid #94a3b8;padding:8px;font-family:monospace;font-size:10px;">${ex.ruleId || 'N/A'}</td>
                <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;">${ex.parameter || 'N/A'}</td>
                <td style="border:1px solid #94a3b8;padding:8px;text-align:justify;">${ex.message || ex.observation || 'N/A'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
    } else if (para.includes('[MOVEMENT_TABLE]') && org.dailyMovement) {
      const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      bodyHtml += `
        <div style="margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;font-size:10px;text-align:center;">
            <tr style="background:#f1f5f9;font-weight:700;">
              <th style="border:1px solid #94a3b8;padding:8px;text-align:left;">PARAMETER</th>
              <th style="border:1px solid #94a3b8;padding:8px;">PREVIOUS DAY</th>
              <th style="border:1px solid #94a3b8;padding:8px;">LATEST REPORT</th>
              <th style="border:1px solid #94a3b8;padding:8px;">MOVEMENT</th>
              <th style="border:1px solid #94a3b8;padding:8px;">% CHANGE</th>
            </tr>
            ${(org.dailyMovement || []).map((m: any) => {
              const color = m.movement >= 0 ? (m.parameter === 'Gross NPA' ? 'red' : 'green') : (m.parameter === 'Gross NPA' ? 'green' : 'red');
              return `
                <tr>
                  <td style="border:1px solid #94a3b8;padding:8px;text-align:left;font-weight:700;">${m.parameter}</td>
                  <td style="border:1px solid #94a3b8;padding:8px;">₹ ${fmt(m.previousValue * scale)} ${unitLabel}</td>
                  <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;">₹ ${fmt(m.latestValue * scale)} ${unitLabel}</td>
                  <td style="border:1px solid #94a3b8;padding:8px;color:${color};font-weight:700;">${m.movement >= 0 ? '+' : ''}₹ ${fmt(m.movement * scale)} ${unitLabel}</td>
                  <td style="border:1px solid #94a3b8;padding:8px;color:${color};">${m.pct.toFixed(2)}%</td>
                </tr>
              `;
            }).join('')}
          </table>
        </div>
      `;
    } else {
      bodyHtml += `<p style="margin-bottom:15px;text-align:justify;">${para.replace(/\n/g, '<br/>')}</p>`;
    }
  }

  return bodyHtml;
}

export default router;
