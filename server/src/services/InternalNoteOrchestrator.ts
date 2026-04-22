import prisma from '../lib/prisma';
import { HardenedLetterDataBuilder } from '../builders/HardenedLetterDataBuilder';
import { HardenedTemplateRenderer } from '../renderers/HardenedTemplateRenderer';
import { PDFRenderer } from '../renderers/PDFRenderer';
import { InternalNoteRepository } from '../infra/InternalNoteRepository';
import { AuditManager } from '../utils/AuditManager';
import { logger } from '../utils/logger';

/**
 * Orchestrator Layer: Workflow for Internal Office Notes.
 */
export class InternalNoteOrchestrator {
    
    /**
     * Generates a PDF for an internal note.
     */
    static async generateNotePdf(noteId: string): Promise<Buffer> {
        logger.info('NOTE_GEN_START', { noteId });

        try {
            // Internal notes use a similar builder as letters for now
            const payload = await HardenedLetterDataBuilder.buildFromEntity(noteId);
            
            // Hardened rendering
            const html = await HardenedTemplateRenderer.render('premiumLayout', payload);
            
            const pdf = await PDFRenderer.generate(html);

            AuditManager.logGeneration({
                branchId: 'INTERNAL',
                letterId: noteId,
                payload,
                status: 'SUCCESS'
            });

            return pdf;
        } catch (err: any) {
            logger.error('NOTE_GEN_FAILURE', err, { noteId });
            throw err;
        }
    }

    /**
     * Creates and routes a new office note.
     */
    static async createNote(preparerId: string, data: any) {
        return await InternalNoteRepository.create({
            ...data,
            preparerId,
            status: 'DRAFT',
            version: 1
        });
    }
}
