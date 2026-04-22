import { HardenedLetterDataBuilder } from '../builders/HardenedLetterDataBuilder';
import { HardenedTemplateRenderer } from '../renderers/HardenedTemplateRenderer';
import { PDFRenderer } from '../renderers/PDFRenderer';
import { AuditManager } from '../utils/AuditManager';
import prisma from '../lib/prisma';
import logger from '../utils/logger';

/**
 * CLI Tool for Bulk Document Generation.
 * Usage: ts-node src/scripts/generateLetters.ts --branch=123 --date=2026-04
 */
async function run() {
    const args = process.argv.slice(2);
    const branchCode = args.find(a => a.startsWith('--branch='))?.split('=')[1];
    const dateQuery = args.find(a => a.startsWith('--date='))?.split('=')[1];

    logger.info('Starting Batch Document Generation', { branchCode, dateQuery });

    try {
        const where: any = {};
        if (branchCode) where.branch = { code: branchCode };
        
        const letters = await prisma.letter.findMany({
            where,
            include: { branch: true }
        });

        logger.info('BATCH_FETCH_SUCCESS', { count: letters.length });

        for (const letter of letters) {
            try {
                // 1. BUILD & VALIDATE
                const payload = await HardenedLetterDataBuilder.buildFromEntity(letter.id);
                
                // 2. RENDER
                const html = await HardenedTemplateRenderer.render('premiumLayout', payload);
                
                // 3. GENERATE PDF
                const pdf = await PDFRenderer.generate(html);
                
                // 4. AUDIT
                AuditManager.logGeneration({
                    branchId: letter.branchId || 'SYSTEM',
                    letterId: letter.id,
                    payload,
                    status: 'SUCCESS'
                });

                console.log(`Successfully generated letter for ${letter.branch?.nameEn} (${letter.id})`);
            } catch (err: any) {
                logger.error('INDIVIDUAL_GEN_FAILURE', err, { letterId: letter.id });
                console.error(`Failed to generate letter ${letter.id}: ${err.message}`);
            }
        }
    } catch (err: any) {
        logger.error('BATCH_GEN_CRITICAL_FAILURE', err);
        process.exit(1);
    }
}

run().then(() => {
    logger.info('Batch Generation Completed');
    process.exit(0);
});
