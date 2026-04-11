import { z } from 'zod';

/**
 * DICGC Return - JSON Schema and Validation Rules
 * Focuses on FORM DI-01 and FORMAT-1 (Sundry Creditors Summary)
 */

export const DicgcBracketSchema = z.object({
    bracket: z.string(),
    accountCount: z.number().min(0, "Account count cannot be negative"),
    amount: z.number().min(0, "Amount cannot be negative"),
});

export const DicgcFormat1Schema = z.object({
    clearingDifference: z.number().min(0),
    clearingNextDay: z.number().min(0),
    deposits: z.number().min(0),
    ecgcDicgcClaims: z.number().min(0),
    suitFiledCourt: z.number().min(0),
    itStAttachment: z.number().min(0),
    tds: z.number().min(0),
    excessCash: z.number().min(0),
    vigilanceCases: z.number().min(0),
    others: z.number().min(0),
});

export const DicgcReturnSchema = z.object({
    header: z.object({
        regionalOfficeName: z.string().min(1, "Regional Office Name is required"),
        returnDate: z.string().default("2026-03-31"),
    }),
    di01: z.object({
        item1: z.number().min(0),
        item1a: z.number().min(0).default(0), // Foreign Gov
        item1b: z.number().min(0).default(0), // Central Gov
        item1c: z.number().min(0).default(0), // State Gov
        item1d: z.number().min(0).default(0), // Inter Bank
        item1e: z.number().min(0).default(0), // Exempted By DICGC
        item2: z.number().min(0).default(0),  // Not clubbed under 'Deposits'
        item3: z.number().min(0),             // Auto-calculated in UI: 1 - (1a+b+c+d+e) + 2
        item4: z.number().min(0).default(0),  // Sundry Creditors Relation
        item5: z.number().min(0).default(0),
        item6: z.number().min(0).default(0),
        item7: z.number().min(0).default(0),
        item8: z.number().min(0).default(0),
        item9: z.number().min(0).default(0),
        item10: z.number().min(0).default(0),
        item11: z.number().min(0).default(0),
        item12: z.number().min(0).default(0),
    }),
    item13: z.object({
        bracket1: DicgcBracketSchema, // Upto 5L
        bracket2: DicgcBracketSchema, // 5L - 7.5L
        bracket3: DicgcBracketSchema, // 7.5L - 10L
        bracket4: DicgcBracketSchema, // Over 10L
    }),
    format1: DicgcFormat1Schema,
}).refine((data) => {
    // Validation Rule: Item 13 sum must equal Item 3
    const bracketTotal = 
        data.item13.bracket1.amount + 
        data.item13.bracket2.amount + 
        data.item13.bracket3.amount + 
        data.item13.bracket4.amount;
    
    // Allow for small floating point discrepancies if any, but since these are '000 units, exact match is preferred
    return Math.abs(bracketTotal - data.di01.item3) < 0.01;
}, {
    message: "The sum of 'Assessable Deposits' in Item 13 must exactly equal 'Assessable Deposits' in Item 3 of DI-01.",
    path: ["item13"],
});

export interface DicgcReturnData extends z.infer<typeof DicgcReturnSchema> {}
export type DicgcFormat1Data = z.infer<typeof DicgcFormat1Schema>;
export type DicgcBracketData = z.infer<typeof DicgcBracketSchema>;

/**
 * Backend API Payload Structure (Draft)
 * POST /api/returns/dicgc
 */
export interface DicgcApiPayload {
    data: DicgcReturnData;
    submittedAt: string;
    submittedBy: string; // user ID
}
