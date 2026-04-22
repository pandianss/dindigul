export interface OfficeNote {
    id: string;
    type: string;
    status: string;
    titleEn: string;
    isFrozen?: boolean;
    contentJson: string;
    referenceNo?: string;
    scannedCopyUrl?: string;
    preparer: { 
        id: string; 
        fullNameEn: string; 
        username: string; 
        branchId?: string;
        department?: {
            nameEn: string;
            sealPath?: string;
        };
    };
    createdAt: string;
}

export interface OfficeNoteFormState {
    type: string;
    titleEn: string;
    titleTa: string;
    titleHi: string;
    deptName: string;
    referenceNo: string;
    preparerId: string;
    approverId?: string;
    reviewerIds?: string[];
    contentJson: Record<string, any>;
}
