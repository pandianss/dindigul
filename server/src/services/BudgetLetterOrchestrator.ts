import prisma from '../lib/prisma';
import { LetterOrchestrator } from './LetterOrchestrator';
import { ExpenditureRepository } from '../infra/ExpenditureRepository';
import { logger } from '../utils/logger';

/**
 * Orchestrator Layer: Workflow for Budget Allotment Letters.
 */
export class BudgetLetterOrchestrator {
    
    /**
     * Issues a budget allotment letter for a branch.
     */
    static async issueAllotment(branchId: string, financialYear: string, amount: number) {
        logger.info('BUDGET_ALLOTMENT_START', { branchId, financialYear, amount });

        try {
            // 1. Transactional Update
            const budget = await ExpenditureRepository.allocateBudget('GENERAL', financialYear, amount);
            
            // 2. Create Letter Entity
            const letter = await prisma.letter.create({
                data: {
                    type: 'BUDGET_ALLOTMENT',
                    status: 'APPROVED',
                    titleEn: `Budget Allotment for FY ${financialYear}`,
                    contentEn: `<p>We are pleased to inform you that an amount of ₹${amount.toLocaleString()} has been allotted for your branch expenses.</p>`,
                    branchId,
                    valueAtTime: amount,
                    period: financialYear,
                    version: 1
                }
            });

            // 3. Generate PDF
            const pdf = await LetterOrchestrator.generateLetterPdf(letter.id);

            logger.info('BUDGET_ALLOTMENT_SUCCESS', { letterId: letter.id });
            return { letter, pdf };
        } catch (err: any) {
            logger.error('BUDGET_ALLOTMENT_FAILURE', err, { branchId });
            throw err;
        }
    }
}
