import { DicgcReturnData } from '../../types/dicgc';

export interface Branch {
    id: string;
    code: string;
    nameEn: string;
    type?: string;
}

export interface Visit {
    id: string;
    visitDate: string;
    branchId: string;
    purpose: string;
    observations?: string;
    visitorCategory: string;
    branch: { nameEn: string; code: string };
    visitor: { fullNameEn: string };
}

export interface User {
    id: string;
    fullNameEn: string;
}

export type { DicgcReturnData };
