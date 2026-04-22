import prisma from '../lib/prisma';

export class BudgetService {
    static async processBudgets(csvContent: string, uploaderId: string, filename: string) {
        return { count: 0, status: 'MOCK' };
    }
}
