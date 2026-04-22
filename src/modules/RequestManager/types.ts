export interface BranchRequest {
    id: string;
    titleEn: string;
    contentEn: string;
    category: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    branch: { nameEn: string, code: string };
    user: { fullNameEn: string };
    assignedSection?: string;
    contentJson?: any;
    resolutionNotes?: string;
    createdAt: string;
    comments: RequestComment[];
}

export interface RequestComment {
    id: string;
    content: string;
    user: { fullNameEn: string };
    createdAt: string;
}

export interface RequestForm {
    titleEn: string;
    contentEn: string;
    category: string;
    priority: string;
    assignedSection: string;
    contentJson: any;
}
