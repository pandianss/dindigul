import prisma from '../lib/prisma';

export type ReferenceCategory = 'OFFICE_NOTE' | 'LETTER' | 'INTERNAL_NOTE';

// Mapping for standard shortforms
const DEPT_SHORTFORMS: Record<string, string> = {
    'Agri & Rural Initiatives Division': 'ARID',
    'Compliance Department': 'COMP',
    'Credit Monitoring Department': 'CRMD',
    'Financial Inclusion': 'FI',
    'General Administration Department': 'GAD',
    'Human Resources Management Department': 'HRMD',
    'Inspection Department': 'INSP',
    'Law Department': 'LAW',
    'Official Language Department': 'OLD',
    'Planning Department': 'PLNG',
    'MSME Division': 'MSME',
    'Vigilance Department': 'VIGIL',
    'Security Department': 'SEC',
    'Retail Division': 'RET',
    'Customer Service Department': 'CSD',
    'Government Accounts Division': 'GOVT',
    'Marketing and Development Department': 'MDD',
    'Public Relations Department': 'PRD',
    'Regional Computer Center': 'RCC'
};

/**
 * Generates a sequential reference number in the format: RO/[DEPT]/[YEAR]/BE[SEQ]
 * This implementation fills gaps (reuses numbers from deleted notes).
 * @param category Document category
 * @param deptName Full department name or code
 * @returns Formatted reference number
 */
export async function generateReference(category: ReferenceCategory, deptName: string): Promise<string> {
    const year = new Date().getFullYear();
    
    // Resolve shortform
    let shortform = DEPT_SHORTFORMS[deptName] || deptName;
    
    // Standardize some common aliases
    if (shortform.includes('ADMIN')) shortform = 'GAD';
    if (shortform.includes('PLANNING')) shortform = 'PLNG';
    if (shortform.includes('RETAIL')) shortform = 'RET';

    const prefix = `RO/${shortform}/${year}`;
    
    // Find all existing reference numbers with this prefix across all relevant tables
    const [notes, letters] = await Promise.all([
        prisma.officeNote.findMany({
            where: { referenceNo: { startsWith: prefix } },
            select: { referenceNo: true }
        }),
        prisma.letter.findMany({
            where: { referenceNo: { startsWith: prefix } },
            select: { referenceNo: true }
        })
    ]);

    // Extract numbers from formats like .../BE01, .../BE02
    const existingNumbers = new Set<number>();
    [...notes, ...letters].forEach(item => {
        if (item.referenceNo) {
            const parts = item.referenceNo.split('/BE');
            if (parts.length === 2) {
                const num = parseInt(parts[1]);
                if (!isNaN(num)) existingNumbers.add(num);
            }
        }
    });

    // Find the first gap starting from 1
    let nextNum = 1;
    while (existingNumbers.has(nextNum)) {
        nextNum++;
    }

    const paddedNum = nextNum.toString().padStart(2, '0');
    const finalRef = `${prefix}/BE${paddedNum}`;

    // Optional: Synchronize reference_sequences table just in case other legacy code uses it
    try {
        await (prisma as any).$executeRaw`
            INSERT INTO reference_sequences (id, category, prefix, "lastNumber", "updatedAt")
            VALUES (gen_random_uuid(), ${category}, ${prefix}, ${nextNum}, NOW())
            ON CONFLICT (category, prefix)
            DO UPDATE SET "lastNumber" = GREATEST(reference_sequences."lastNumber", ${nextNum}), "updatedAt" = NOW()
        `;
    } catch (e) {
        // Ignore sequence sync errors
    }

    return finalRef;
}
