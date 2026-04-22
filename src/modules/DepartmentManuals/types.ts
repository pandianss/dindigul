export interface Activity {
    id: string;
    titleEn: string;
    titleTa?: string;
    titleHi?: string;
    description?: string;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'ADHOC';
    dueDate?: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface Manual {
    id: string;
    titleEn: string;
    titleTa?: string;
    titleHi?: string;
    description?: string;
    departmentId: string;
    department?: { 
        nameEn: string; 
        code: string; 
    };
    activities: Activity[];
    updatedAt: string;
    createdAt: string;
}

export interface Department {
    id: string;
    nameEn: string;
    code: string;
}

export interface ManualForm {
    titleEn: string;
    titleTa: string;
    titleHi: string;
    description: string;
    departmentId: string;
}

export interface ActivityForm {
    titleEn: string;
    titleTa: string;
    titleHi: string;
    description: string;
    frequency: string;
    dueDate: string;
    status: string;
}
