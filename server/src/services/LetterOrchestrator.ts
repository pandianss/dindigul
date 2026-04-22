import prisma from '../lib/prisma';
import { HardenedLetterDataBuilder } from '../builders/HardenedLetterDataBuilder';
import { HardenedTemplateRenderer } from '../renderers/HardenedTemplateRenderer';
import { PDFRenderer } from '../renderers/PDFRenderer';
import { ReferenceGenerator } from '../infra/ReferenceGenerator';
import { FactRepository } from '../infra/FactRepository';
import { AuditManager } from '../utils/AuditManager';
import { IdempotencyManager } from '../utils/IdempotencyManager';
import { logger } from '../utils/logger';

/**
 * Orchestrator Layer: Hardened workflow coordination for Letters.
 * Incorporates Validation, Audit, and Idempotency.
 */
export class LetterOrchestrator {
    
    /**
     * Complete workflow to generate a PDF for a letter.
     * Hardened with Audit, Validation, and Idempotency.
     */
    static async generateLetterPdf(letterId: string): Promise<Buffer> {
        try {
            // 1. BUILD & VALIDATE
            const payload = await HardenedLetterDataBuilder.buildFromEntity(letterId);
            
            // 2. IDEMPOTENCY CHECK
            const existingUrl = await IdempotencyManager.checkAndAcquire(payload, letterId);
            if (existingUrl) {
                logger.info('LETTER_GEN_IDEMPOTENT_HIT', { letterId, fileUrl: existingUrl });
                // In a real system, we'd return the file from FS/S3 here. 
                // For now, we continue to fulfill the request but log the hit.
            }

            // 3. RENDER
            const html = await HardenedTemplateRenderer.render('premiumLayout', payload);
            
            // 4. PDF GENERATION
            const pdfBuffer = await PDFRenderer.generate(html);

            // 5. AUDIT SUCCESS
            AuditManager.logGeneration({
                branchId: payload.recipient.branchCode || 'SYSTEM',
                letterId,
                payload,
                status: 'SUCCESS'
            });

            // 6. RECORD IDEMPOTENCY (Async)
            const hash = AuditManager.hashPayload(payload);
            IdempotencyManager.recordSuccess(hash, letterId, `/generated/${letterId}.pdf`).catch(err => {
                logger.error('IDEMPOTENCY_SAVE_FAILURE', err, { letterId });
            });

            return pdfBuffer;
        } catch (err: any) {
            // AUDIT FAILURE
            AuditManager.logGeneration({
                branchId: 'UNKNOWN',
                letterId,
                payload: { error: err.message },
                status: 'FAILURE',
                error: err.message
            });
            throw err;
        }
    }

    /**
     * Workflow for creating a manual letter with reference generation.
     */
    static async createManualLetter(user: any, data: any) {
        const refNo = await ReferenceGenerator.generate('LETTER', user.section || 'General');
        const orgMeta = await FactRepository.getRegionalOfficeConfig();

        return await prisma.letter.create({
            data: {
                ...data,
                referenceNo: refNo,
                status: 'DRAFT',
                authorId: user.id,
                orgMeta: orgMeta as any,
                version: 1
            }
        });
    }

    /**
     * Workflow for updating an existing letter entity.
     */
    static async updateLetter(id: string, data: any) {
        return await prisma.letter.update({
            where: { id },
            data: {
                ...data,
                version: { increment: 1 }
            }
        });
    }
}
