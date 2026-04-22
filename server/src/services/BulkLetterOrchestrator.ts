import prisma from '../lib/prisma';
import { LetterOrchestrator } from './LetterOrchestrator';
import { logger } from '../utils/logger';

/**
 * Orchestrator Layer: Logic for processing letters in batches.
 */
export class BulkLetterOrchestrator {
    
    /**
     * Generates PDFs for all letters in a specific batch.
     */
    static async generateBatch(letterIds: string[]) {
        logger.info('BATCH_GEN_START', { count: letterIds.length });
        
        const results = [];
        for (const id of letterIds) {
            try {
                const pdf = await LetterOrchestrator.generateLetterPdf(id);
                results.push({ id, status: 'SUCCESS' });
            } catch (err: any) {
                logger.error('BATCH_GEN_ITEM_FAILURE', err, { letterId: id });
                results.push({ id, status: 'FAILURE', error: err.message });
            }
        }

        logger.info('BATCH_GEN_COMPLETE', { success: results.filter(r => r.status === 'SUCCESS').length });
        return results;
    }

    /**
     * Triggers generation for all letters from a specific department.
     */
    static async generateForDepartment(departmentId: string) {
        const letters = await prisma.letter.findMany({
            where: { author: { departmentId }, status: 'APPROVED' },
            select: { id: true }
        });

        return await this.generateBatch(letters.map(l => l.id));
    }

    static async generateMonthlyLetters(period: string) {
        const letters = await prisma.letter.findMany({
            where: { period, status: 'APPROVED' },
            select: { id: true }
        });

        return await this.generateBatch(letters.map(l => l.id));
    }
}
