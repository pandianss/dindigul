import prisma from '../lib/prisma';

export type ReferenceCategory = 'OFFICE_NOTE' | 'LETTER' | 'INTERNAL_NOTE' | 'PERFORMANCE_LETTER' | 'OP_RISK';

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
 * Generates a sequential reference number in the format: RO/[DEPT]/[TYPE]/[YEAR]/[MONTH]/BE[SEQ]
 * This implementation fills gaps (reuses numbers from deleted notes).
 * @param category Document category
 * @param deptName Full department name or code
 * @param date Optional date to use for year and month
 * @returns Formatted reference number
 */
export async function generateReference(category: ReferenceCategory, deptName: string, date?: Date | string): Promise<string> {
    let refDate: Date;
    if (!date) {
        refDate = new Date();
    } else if (typeof date === 'string') {
        const parts = date.split('-').map(Number);
        if (parts.length === 3) {
            const [year, month, day] = parts[0] > 100 ? parts : [parts[2], parts[1], parts[0]];
            refDate = new Date(Date.UTC(year, month - 1, day));
        } else {
            refDate = new Date(date);
        }
    } else {
        refDate = date;
    }

    if (isNaN(refDate.getTime())) refDate = new Date();

    const year = refDate.getUTCFullYear();
    const month = (refDate.getUTCMonth() + 1).toString().padStart(2, '0');
    
    // Resolve shortform
    let shortform = DEPT_SHORTFORMS[deptName] || deptName;
    if (shortform.includes('ADMIN')) shortform = 'GAD';
    if (shortform.includes('PLANNING')) shortform = 'PLNG';
    if (shortform.includes('RETAIL')) shortform = 'RET';

    // Build Prefix based on category
    let prefix = `RO/${shortform}`;
    
    if (category === 'PERFORMANCE_LETTER') {
        prefix += `/PERF/${year}/${month}`;
    } else if (category === 'OP_RISK') {
        prefix += `/OPR/${year}/${month}`;
    } else if (category === 'LETTER') {
        prefix += `/L/${year}/${month}`; // Isolate standard letters with an /L/ segment
    } else if (category === 'INTERNAL_NOTE') {
        prefix += `/INT/${year}/${month}`;
    } else {
        // Standard OFFICE_NOTE
        prefix += `/${year}/${month}`;
    }
    
    // Find all existing reference numbers with this prefix
    // Only query the table corresponding to the category for strict isolation
    let existingItems: { referenceNo: string | null }[] = [];
    
    if (category === 'OFFICE_NOTE') {
        existingItems = await prisma.officeNote.findMany({
            where: { referenceNo: { startsWith: prefix } },
            select: { referenceNo: true }
        });
    } else if (category === 'INTERNAL_NOTE') {
        // Internal notes were moved out, but we check just in case legacy data remains
        existingItems = await (prisma as any).officeNote.findMany({
            where: { referenceNo: { startsWith: prefix } },
            select: { referenceNo: true }
        });
    } else {
        // LETTER, PERFORMANCE_LETTER, OP_RISK
        existingItems = await prisma.letter.findMany({
            where: { referenceNo: { startsWith: prefix } },
            select: { referenceNo: true }
        });
    }

    // Extract numbers from formats like .../01, .../02
    const expectedSegments = prefix.split('/').length + 1;
    const existingNumbers = new Set<number>();
    
    existingItems.forEach(item => {
        if (item.referenceNo) {
            const parts = item.referenceNo.split('/');
            // Only count if it exactly matches the expected structure for this category
            if (parts.length === expectedSegments) {
                const lastPart = parts[parts.length - 1];
                const num = parseInt(lastPart);
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
    const finalRef = `${prefix}/${paddedNum}`;

    // Update sequence tracking for legacy systems (optional)
    try {
        await (prisma as any).$executeRaw`
            INSERT INTO reference_sequences (id, category, prefix, "lastNumber", "updatedAt")
            VALUES (gen_random_uuid(), ${category}, ${prefix}, ${nextNum}, NOW())
            ON CONFLICT (category, prefix)
            DO UPDATE SET "lastNumber" = GREATEST(reference_sequences."lastNumber", ${nextNum}), "updatedAt" = NOW()
        `;
    } catch (e) {}

    return finalRef;
}
