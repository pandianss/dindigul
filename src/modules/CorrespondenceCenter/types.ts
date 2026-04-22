export interface Letter {
    id: string;
    type: 'APPRECIATION' | 'EXPLANATION' | 'OP_RISK' | 'MANUAL' | 'BUDGET_ALLOTMENT';
    status: 'DRAFT' | 'SENT' | 'ACKNOWLEDGED';
    titleEn: string;
    titleHi?: string | null;
    titleTa?: string | null;
    contentEn: string;
    contentHi?: string | null;
    contentTa?: string | null;
    branch: {
        nameEn: string;
        type: string;
        code?: string;
        size?: string;
        headUser?: {
            fullNameEn: string;
            fullNameHi?: string | null;
            fullNameTa?: string | null;
            gender?: string;
            designation?: {
                nameEn: string;
                nameHi?: string | null;
                nameTa?: string | null;
            };
        };
    };
    period: string;
    parameterId?: string;
    createdAt: string;
    orgMeta?: any;
    scannedCopyUrl?: string;
    referenceNo?: string;
    contentJson?: any;
    signatory?: {
        fullNameEn: string;
        fullNameHi?: string | null;
        fullNameTa?: string | null;
        designation?: {
            nameEn: string;
            nameHi?: string | null;
            nameTa?: string | null;
        };
    } | null;
    author?: {
        fullNameEn: string;
        fullNameHi?: string | null;
        fullNameTa?: string | null;
        designationEn?: string;
        designationHi?: string | null;
        designationTa?: string | null;
    } | null;
}

export interface CorrespondenceMetadata {
    regionHeadName: string;
    regionHeadDesignation: string;
    organization?: {
        bankNameEn: string;
        bankNameTa: string;
        bankNameHi: string;
        officeNameEn: string;
        officeNameTa: string;
        officeNameHi: string;
        address: string;
        phone: string;
        email: string;
        signingAuthEn: string;
        signingAuthTa: string;
        signingAuthHi: string;
        signatoryName?: string;
        deptSealUrl?: string;
    };
}

export interface Department {
    id: string;
    nameEn: string;
    nameTa: string;
    nameHi: string;
}

export interface Signatory {
    id: string;
    fullNameEn: string;
    fullNameHi?: string;
    fullNameTa?: string;
}
