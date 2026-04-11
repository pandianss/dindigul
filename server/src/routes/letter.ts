import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { letterUpload as upload } from '../middleware/upload';
import path from 'path';
import { logger } from '../utils/logger';
import fs from 'fs';
import { parsePagination } from '../utils/pagination';
import { z } from 'zod';
import { validate } from '../lib/validate';
import { letterService } from '../services/letterService';
import { generateLettersForPeriod } from '../services/letterCriteriaService';
import { getBrowser } from '../services/pdfService';
import archiver from 'archiver';

const router = Router();

// upload configuration moved to centralized middleware

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
  } catch {
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

router.get('/', authenticateToken, async (req: any, res) => {
  try {
    const { branchId, type } = req.query;
    const { skip, take, page, limit } = parsePagination(req, 250);
    const response = await letterService.getLetters(req.user, branchId, type, skip, take, page, limit);
    res.json(response);
  } catch {
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
  } catch {
    res.status(500).json({ error: 'Failed to update letter status' });
  }
});

router.get('/templates', authenticateToken, async (req: any, res) => {
  try {
    const { category } = req.query;
    const templates = await letterService.getTemplates(category as string);
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.post('/templates', authenticateToken, async (req: any, res) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Unauthorized' });
  try {
    const template = await letterService.createTemplate(req.body);
    res.json(template);
  } catch {
    res.status(500).json({ error: 'Failed to create template' });
  }
});

router.post('/', authenticateToken, async (req: any, res) => {
  try {
    const letter = await letterService.createManualLetter(req.user, req.body);
    res.json(letter);
  } catch {
    res.status(500).json({ error: 'Failed to create manual letter' });
  }
});

router.put('/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.letter.findUnique({ where: { id } });
    if (existing?.status === 'SENT') {
      return res.status(403).json({ error: 'Cannot edit a frozen letter. Please open it for editing first.' });
    }
    const letterOrUpdated = await letterService.updateLetter(id, req.body);
    res.json(letterOrUpdated);
  } catch {
    res.status(500).json({ error: 'Failed to update letter' });
  }
});

router.patch('/:id', authenticateToken, async (req: any, res) => {
  const { id } = req.params;
  try {
    const existing = await prisma.letter.findUnique({ where: { id } });
    if (existing?.status === 'SENT') {
      return res.status(403).json({ error: 'Cannot edit a frozen letter. Please open it for editing first.' });
    }
    const updated = await (prisma as any).letter.update({
      where: { id },
      data: req.body
    });
    res.json(updated);
  } catch (err) {
    logger.error('[LetterPatch] Error:', err);
    res.status(500).json({ error: 'Failed to patch letter' });
  }
});

router.post('/generate', authenticateToken, async (req: any, res) => {
  const isPlanningDept = req.user.role === 'RO_USER' && req.user.section === 'Planning';
  if (req.user.role !== 'ADMIN' && !isPlanningDept) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  const { period, date, type, signatoryId } = req.body;
  if (!period) return res.status(400).json({ error: 'period is required' });
  try {
    const result = await generateLettersForPeriod(period, { date, type, signatoryId });
    res.json({ message: `Generated ${result.created} letter(s).`, ...result });
  } catch (error: any) {
    logger.error('[LetterGen] Error generating letters:', error);
    res.status(500).json({ error: error.message || 'Failed to generate letters' });
  }
});

router.get('/:id/pdf', authenticateToken, async (req: any, res) => {
  try {
    const letter = await letterService.getLetterById(req.params.id);
    if (!letter) return res.status(404).json({ error: 'Letter not found' });
    if (req.user.role === 'BRANCH_USER' && letter.branchId !== req.user.branchId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { pdfBuffer, safeFileName } = await letterService.generateLetterPdfBuffer(letter);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error('[PDF] Generation failed:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

router.post('/bulk-status', authenticateToken, async (req: any, res) => {
  const isPlanning = req.user.section?.toLowerCase() === 'planning';
  if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

  const { ids, status } = req.body;
  if (!ids || !Array.isArray(ids) || !status) {
    return res.status(400).json({ error: 'Missing ids or status' });
  }

  try {
    await prisma.letter.updateMany({
      where: { id: { in: ids } },
      data: { status }
    });
    res.json({ message: `Successfully updated ${ids.length} letters to ${status}` });
  } catch (error) {
    logger.error('[BulkStatus] Failed:', error);
    res.status(500).json({ error: 'Failed to update statuses' });
  }
});

router.post('/bulk-pdf-zip', authenticateToken, async (req: any, res) => {
  const isPlanning = req.user.section?.toLowerCase() === 'planning';
  if (req.user.role !== 'ADMIN' && !isPlanning) return res.status(403).json({ error: 'Unauthorized' });

  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: 'Missing ids' });

  try {
    const letters = await prisma.letter.findMany({
      where: { id: { in: ids } },
      include: {
        branch: {
          include: {
            headUser: { include: { designation: true } }
          }
        },
        parameter: true,
        signatory: {
          include: { designation: true }
        },
        author: {
          include: { designation: true }
        }
      }
    });

    if (letters.length === 0) return res.status(404).json({ error: 'No letters found' });

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Letters_${Date.now()}.zip"`);
    archive.pipe(res);

    const browser = await getBrowser();
    const concurrencyLimit = 5;
    const failures: string[] = [];

    try {
      for (let i = 0; i < letters.length; i += concurrencyLimit) {
        const batch = letters.slice(i, i + concurrencyLimit);
        await Promise.all(batch.map(async (letter) => {
          try {
            const { pdfBuffer, safeFileName } = await letterService.generateLetterPdfBuffer(letter, browser);
            archive.append(pdfBuffer, { name: safeFileName });
          } catch (pdfErr: any) {
            logger.error(`[BulkPDF] Individual generation failed for letter ${letter.id}:`, pdfErr);
            failures.push(`${letter.id} | ${letter.referenceNo || 'NO_REF'} | ${letter.titleEn} | ${pdfErr?.message || 'Unknown error'}`);
          }
        }));
      }
    } finally {
      await browser.close();
    }

    if (failures.length > 0) {
      archive.append(
        `The following letters failed during PDF generation:\n${failures.map((line) => `- ${line}`).join('\n')}\n`,
        { name: '_FAILED_LETTERS.txt' }
      );
    }

    await archive.finalize();
  } catch (err: any) {
    logger.error('[BulkPDF] Generation failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Bulk PDF generation failed' });
    }
  }
});

export default router;
