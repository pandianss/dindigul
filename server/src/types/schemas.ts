import { z } from 'zod';

/**
 * Trilingual Schema for trilingual fields.
 */
export const TrilingualSchema = z.object({
    en: z.string().min(1),
    ta: z.string().optional(),
    hi: z.string().optional(),
});

/**
 * MIS Cash Data Schema (Strict Validation).
 */
export const CashDataSchema = z.object({
    totalCashOnHand: z.number().min(0),
    retentionLimit: z.number().min(0).optional().default(0),
    excessCash: z.number(),
    bnaCash: z.number().optional().default(0),
    atmCash: z.number().optional().default(0),
    asOfDate: z.coerce.date(),
});

/**
 * Recipient Metadata Schema.
 */
export const RecipientSchema = z.object({
    name: z.string().optional(),
    designation: z.string().optional(),
    branchName: z.string().optional(),
    branchCode: z.string().optional(),
    isExternal: z.boolean().default(false),
    address: z.string().optional(),
    salutation: z.string().optional(),
});

/**
 * Unified Letter Payload Schema (The Core Model).
 */
export const UnifiedLetterPayloadSchema = z.object({
    metadata: z.object({
        referenceNo: z.string(),
        letterDate: z.string(),
        generatedAt: z.coerce.date(),
        type: z.enum(['MANUAL', 'OP_RISK', 'BUDGET_ALLOTMENT', 'PERFORMANCE', 'APPRECIATION', 'EXPLANATION']),
        category: z.enum(['APPRECIATION', 'EXPLANATION', 'GENERAL']),
        version: z.number(),
    }),
    organization: z.object({
        bankName: TrilingualSchema,
        officeName: TrilingualSchema,
        address: TrilingualSchema,
        phone: z.string(),
        email: z.string().email(),
        website: z.string().url(),
    }),
    recipient: RecipientSchema,
    signatory: z.object({
        name: TrilingualSchema,
        title: TrilingualSchema,
        userId: z.string().optional(),
    }),
    content: z.object({
        title: TrilingualSchema,
        bodyHtml: z.string().min(1),
    }),
    cash: CashDataSchema.optional(),
    deptSealPath: z.string().optional(),
});

export type ValidatedLetterPayload = z.infer<typeof UnifiedLetterPayloadSchema>;
export type ValidatedCashData = z.infer<typeof CashDataSchema>;
