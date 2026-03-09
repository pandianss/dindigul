import { Request } from 'express';

export interface AuthUser {
    id: string;
    username: string;
    role: string;
    fullNameEn: string;
    branchId?: string | null;
    branchCode?: string | null;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
