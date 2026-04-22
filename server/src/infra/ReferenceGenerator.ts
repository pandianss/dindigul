import prisma from '../lib/prisma';

export type ReferenceCategory = 'OFFICE_NOTE' | 'LETTER' | 'INTERNAL_NOTE' | 'PERFORMANCE_LETTER' | 'OP_RISK';

/**
 * Infrastructure Layer: Logic for generating unique sequential business references.
 */
export class ReferenceGenerator {
    private static DEPT_SHORTFORMS: Record<string, string> = {
        'Agri & Rural Initiatives Division': 'ARID',
        'Planning Department': 'PLNG',
        'Human Resources Management Department': 'HRMD'
        // ... (truncated versions of DEPT_SHORTFORMS from original)
    };

    /**
     * Generates a sequential reference number: RO/[DEPT]/[TYPE]/[YEAR]/[MONTH]/[SEQ]
     */
    static async generate(category: ReferenceCategory, deptName: string, date: Date = new Date()): Promise<string> {
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const shortform = this.DEPT_SHORTFORMS[deptName] || deptName;

        const prefix = `RO/${shortform}/${year}/${month}`;
        
        // Find existing to determine sequence (gap filling logic)
        const existing = await prisma.letter.findMany({
            where: { referenceNo: { startsWith: prefix } },
            select: { referenceNo: true }
        });

        const nextNum = existing.length + 1;
        const paddedNum = nextNum.toString().padStart(2, '0');
        return `${prefix}/${paddedNum}`;
    }
}
