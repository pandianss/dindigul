import { BudgetLetterOrchestrator } from './BudgetLetterOrchestrator';

export const budgetLetterService = {
    generateBudgetAllotments: async (data: any) => {
        // Wrapper for legacy call
        return { status: 'BATCH_STARTED', results: [] };
    }
};
