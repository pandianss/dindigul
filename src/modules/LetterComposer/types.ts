export interface Template {
    id: string;
    name: string;
    code: string;
    subjectEn: string;
    subjectHi?: string;
    subjectTa?: string;
    bodyEn: string;
    bodyHi?: string;
    bodyTa?: string;
}

export interface Branch {
    id: string;
    nameEn: string;
    code: string;
}

export interface Signatory {
    id: string;
    fullNameEn: string;
    designation?: {
        nameEn: string;
    };
}

export interface LetterForm {
    titleEn: string;
    titleHi: string;
    titleTa: string;
    contentEn: string;
    contentHi: string;
    contentTa: string;
    period: string;
    isExternal: boolean;
    recipientName: string;
    recipientAddress: string;
    salutation: string;
}
