export interface Budget {
    id: string;
    section: string;
    financialYear: string;
    allocationAmount: number;
    spentAmount: number;
    _count: { sanctions: number };
}

export interface ExpenseSanction {
    id: string;
    title: string;
    sanctionDate: string;
    amount: number;
    section: string;
    vendorName?: string;
    billNo?: string;
    status: string;
    type: string;
    budget: Budget;
}

export interface SanctionFormState {
    title: string;
    amount: number;
    section: string;
    vendorName: string;
    billNo: string;
    date: string;
    type: string;
    budgetId: string;
}
