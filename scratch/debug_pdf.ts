
import { PrismaClient } from '../server/src/generated/client';
import { buildMeetingMinutesHtml, buildPremiumLayout, generatePDF, getRegionalOfficeData } from '../server/src/services/pdfService';

const prisma = new PrismaClient();

async function testPdf() {
    const id = '2d70743d-cd31-449e-83bf-af75f63ff51c';
    console.log(`[Diagnostic] Testing PDF generation for meeting: ${id}`);
    
    try {
        const meeting = await prisma.meeting.findUnique({
            where: { id },
            include: { committee: true }
        });

        if (!meeting) {
            console.error('[Error] Meeting not found in DB');
            return;
        }

        console.log('[Step 1] Resolving signatories...');
        const sigList = Array.isArray(meeting.signatories) ? meeting.signatories : [];
        const resolvedSignatories = await Promise.all(sigList.map(async (sig: any) => {
            if (sig.userId) {
                const user = await prisma.user.findUnique({
                    where: { id: sig.userId },
                    include: { designation: true, department: true }
                });
                return {
                    name: user?.fullNameEn || sig.name || 'Signatory',
                    designation: user?.designationEn || user?.designation?.nameEn || sig.designation || 'Official'
                };
            }
            return { name: sig.name || 'Signatory', designation: sig.designation || 'Official' };
        }));

        console.log('[Step 2] Fetching RO data...');
        const roData = await getRegionalOfficeData();

        console.log('[Step 3] Building Minutes HTML...');
        const htmlBody = buildMeetingMinutesHtml({
            committee: meeting.committee,
            title: meeting.title,
            dateStr: meeting.date.toLocaleDateString('en-GB'),
            venue: meeting.venue,
            attendees: meeting.attendees,
            minutes: JSON.parse(meeting.minutesJson || '[]'),
            resolvedSignatories
        }, roData);

        console.log('[Step 4] Building Premium Layout...');
        const finalHtml = buildPremiumLayout({
            title: meeting.title || 'MINUTES',
            subTitle: meeting.committee?.nameEn || 'OFFICE NOTE',
            date: meeting.date.toLocaleDateString('en-GB'),
            bodyHtml: htmlBody,
            organization: roData as any,
            hideHeader: false,
            isLetter: true
        });

        console.log('[Step 5] Launching Puppeteer...');
        const pdfBuffer = await generatePDF(finalHtml);
        
        console.log(`[Success] PDF Generated! Buffer size: ${pdfBuffer.length} bytes`);
    } catch (err: any) {
        console.error('[CRITICAL FAILURE]');
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testPdf();
