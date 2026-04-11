import { generatePDF, getRegionalOfficeData, renderTemplate } from './src/services/pdfService';
import express from 'express';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const app = express();

const PUBLIC_DIR = 'C:\\Users\\63039\\Videos\\Projects\\dindigul\\public';

function assetToUri(assetRelPath: string): string {
    const fullPath = path.join(PUBLIC_DIR, assetRelPath.replace(/^\//,''));
    try {
        if (existsSync(fullPath)) {
            const buffer = readFileSync(fullPath);
            const ext = path.extname(fullPath).slice(1).toLowerCase();
            const mime = (ext === 'svg') ? 'image/svg+xml' : `image/${ext}`;
            return `data:${mime};base64,${buffer.toString('base64')}`;
        }
    } catch { return ''; }
    return '';
}

app.get('/test-pdf', async (req, res) => {
    try {
        console.log('--- START DIAGNOSTIC ---');
        const roData = await getRegionalOfficeData();
        
        // MANUALLY BUILDING THE CONTEXT
        const context = {
            organization: roData,
            monthName: 'March 2026',
            date: '10.04.2026',
            refNo: 'RO/DGL/RETURNS/BV/2026/03/492',
            emblemSrc: assetToUri('assets/logo_center.svg'),
            stats: {
                rural: { total: 45, target: 15, actual1: 5, actual2: 8, actualTotal: 13 },
                urban: { total: 18, target: 3, actual1: 1, actual2: 2, actualTotal: 3 }
            },
            totals: {
                total: 63, target: 18, actual1: 6, actual2: 10, actualTotal: 16, percent: '88.89'
            },
            visitDetails: [
                { sl: 1, branchName: 'Dindigul Main [001]', category: 'U', date: '05.03.2026', official: 'NIRAJ KUMAR' }
            ],
            preparer: {
                name: 'NIRAJ KUMAR', 
                nameHi: 'नीरज कुमार', 
                nameTa: 'நீரஜ் குமார்',
                titleEn: 'AGM', titleHi: 'सहायक महाप्रबंधक', titleTa: 'உதவி பொது மேலாளர்'
            },
            signatory: {
                name: 'CHANDRA KUMAR P', 
                nameHi: 'चंद्र कुमार पी', 
                nameTa: 'சந்திர குமார் பி',
                titleEn: 'SRM', titleHi: 'वरिष्ठ क्षेत्रीय प्रबंधक', titleTa: 'மூத்த மண்டல மேலாளர்'
            }
        };

        console.log('DIAG: Emblem Length:', context.emblemSrc.length);
        console.log('DIAG: Preparer Name:', context.preparer.name);

        const html = await renderTemplate('branch-visits-report', context);
        
        // SEARCH FOR THE DATA IN RENDERED HTML
        console.log('DIAG: HTML contains RefNo?', html.includes('RO/DGL/RETURNS/BV/2026/03/492'));
        console.log('DIAG: HTML contains NIRAJ KUMAR?', html.includes('NIRAJ KUMAR'));
        
        const pdf = await generatePDF(html);
        console.log('--- END DIAGNOSTIC ---');
        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdf);
    } catch (err: any) {
        res.status(500).send(err.stack);
    }
});

const PORT = 5005;
app.listen(PORT, () => {
    console.log(`Diagnostic Server running on http://localhost:${PORT}/test-pdf`);
});
