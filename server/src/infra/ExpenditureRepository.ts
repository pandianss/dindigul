import prisma from '../lib/prisma';

/**
 * Infrastructure Layer: Data access for Budgets and Expense Sanctions.
 */
export class ExpenditureRepository {
    
    static async getBudgets() {
        return await prisma.budget.findMany({
            include: {
                _count: {
                    select: { sanctions: true }
                }
            }
        });
    }

    static async getSanctions(filters: { section?: string, status?: string }) {
        const where: any = {};
        if (filters.section) where.section = filters.section;
        if (filters.status) where.status = filters.status;

        return await prisma.expenseSanction.findMany({
            where,
            include: { budget: true },
            orderBy: { sanctionDate: 'desc' }
        });
    }

    /**
     * Creates a sanction and updates the linked budget in a single transaction.
     */
    static async createSanction(data: any) {
        return await prisma.$transaction(async (tx) => {
            const sanction = await tx.expenseSanction.create({
                data: {
                    title: data.title,
                    sanctionDate: data.sanctionDate ? new Date(data.sanctionDate) : new Date(),
                    amount: data.amount,
                    section: data.section,
                    vendorName: data.vendorName,
                    billNo: data.billNo,
                    status: data.status,
                    type: data.type,
                    budgetId: data.budgetId
                }
            });

            await tx.budget.update({
                where: { id: data.budgetId },
                data: {
                    spentAmount: {
                        increment: data.amount
                    }
                }
            });

            return sanction;
        });
    }

    /**
     * Explicitly allocates/updates budget for a department or purpose.
     */
    static async allocateBudget(section: string, financialYear: string, amount: number) {
        return await prisma.budget.upsert({
            where: {
                section_financialYear: { section, financialYear }
            },
            update: { allocationAmount: amount },
            create: { section, financialYear, allocationAmount: amount }
        });
    }
}
