import { createInternalNote } from '../services/internalNoteService';
import prisma from '../lib/prisma';

async function testFix() {
    console.log('--- Testing Internal Note Creation Fix ---');
    try {
        const result = await createInternalNote({
            refNo: 'TEST_FIX_' + Date.now(),
            department: 'IT',
            subject: 'Test Subject',
            classification: 'INTERNAL',
            createdBy: 'Test User',
            bodyHtml: '<p>Test Body</p>',
            creatorBranchId: 'dummy-branch-id' // This should be ignored by Prisma but used for titles
        });
        console.log('SUCCESS: Internal note created with ID:', result.note.id);
        console.log('File URL:', result.note.fileUrl);
    } catch (error: any) {
        console.error('FAILED: Error creating internal note:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testFix();
