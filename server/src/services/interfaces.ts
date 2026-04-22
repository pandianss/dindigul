import { Branch, User, OrganizationConfig } from '@prisma/client';

/**
 * Trilingual string representation for standardized regional support.
 */
export interface TrilingualString {
    en: string;
    ta?: string;
    hi?: string;
}

/**
 * Standardized Regional Office Metadata.
 */
export interface RegionalOfficeConfig {
    bankName: TrilingualString;
    officeName: TrilingualString;
    address: TrilingualString;
    phone: string;
    email: string;
    website: string;
}

/**
 * Recipient metadata for single-entry rendering.
 */
export interface RecipientMetadata {
    name?: string;
    designation?: string;
    branchName?: string;
    branchCode?: string;
    isExternal: boolean;
    address?: string;
    salutation?: string;
}

/**
 * Signatory metadata with trilingual support.
 */
export interface SignatoryMetadata {
    name: TrilingualString;
    title: TrilingualString;
    userId?: string;
}

/**
 * MIS Cash Data sub-payload.
 */
export interface CashDataPayload {
    totalCashOnHand: number;
    retentionLimit: number;
    excessCash: number;
    bnaCash?: number;
    atmCash?: number;
    asOfDate: Date;
}

/**
 * Performance metrics for the letter body.
 */
export interface PerformanceStats {
    parameter: string;
    displayName: string;
    actual: number;
    budget: number;
    achievement: number;
    gap: number;
    unit: string;
}

/**
 * THE SINGLE SOURCE OF TRUTH: Unified Letter Payload.
 * This object is immutable and flows from Builder to Renderer.
 */
export interface UnifiedLetterPayload {
    metadata: {
        referenceNo: string;
        letterDate: string;
        generatedAt: Date;
        type: 'MANUAL' | 'OP_RISK' | 'BUDGET_ALLOTMENT' | 'PERFORMANCE' | 'APPRECIATION' | 'EXPLANATION';
        category: 'APPRECIATION' | 'EXPLANATION' | 'GENERAL';
        version: number;
    };
    organization: RegionalOfficeConfig;
    recipient: RecipientMetadata;
    signatory: SignatoryMetadata;
    content: {
        title: TrilingualString;
        bodyHtml: string;
    };
    cash?: CashDataPayload; 
    stats?: PerformanceStats[];
    deptSealPath?: string;
}

/**
 * Monthly Performance Monitoring Types
 */
export type PerformanceBucketCode =
    | 'DEPOSITS'
    | 'CORE_RETAIL'
    | 'CORE_SME'
    | 'CORE_AGRI'
    | 'NPA_MANAGEMENT'
    | 'ACCOUNT_OPENING'
    | 'CASH';

export interface PerformanceStat {
    parameter: string;
    displayName: string;
    latest: number;
    budget: number;
    march31st: number;
    latestDate: Date;
    march31stDate: Date;
    gap: number;
    unit: string;
    isInverted: boolean;
    achievement: number;
    branchCode: string;
    branchName: string;
}

/**
 * Budget Allotment Configuration
 */
export type AllotmentStrategy = 'SIZE_BASED' | 'POPULATION_BASED' | 'UPLOAD_BASED';

export interface BudgetAllotmentConfig {
    budgetType: string;
    strategy: AllotmentStrategy;
    financialYear: string;
    emailDate: string;
    amounts: Record<string, number>;
    customAllotments?: Record<string, number>;
    customIntro?: string;
    customOutro?: string;
    specificDirective?: string;
}
