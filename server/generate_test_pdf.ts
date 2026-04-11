import { generatePDF, getRegionalOfficeData, renderTemplate } from './src/services/pdfService';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';

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

async function runTest() {
    console.log('--- MANUAL PDF TEST START ---');
    const roData = await getRegionalOfficeData();
    
    const context = {
        organization: roData,
        monthName: 'March 2026',
        date: '11.04.2026',
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
            name: 'NIRAJ KUMAR', nameHi: 'नीरज कुमार', nameTa: 'நீரஜ் குமார்',
            titleEn: 'AGM', titleHi: 'सहायक महाप्रबंधक', titleTa: 'உதவி பொது மேலாளர்'
        },
        signatory: {
            name: 'CHANDRA KUMAR P', nameHi: 'चंद्र कुमार पी', nameTa: 'சந்திர குமார் பி',
            titleEn: 'SRM', titleHi: 'वरिष्ठ क्षेत्रीय प्रबंधक', titleTa: 'மூத்த மண்டல மேலாளர்'
        }
    };

    const html = await renderTemplate('branch-visits-report', context);
    console.log('HTML Rendered. Length:', html.length);
    
    const pdf = await generatePDF(html);
    const outputPath = path.join(process.cwd(), 'manual_test_result.pdf');
    writeFileSync(outputPath, pdf);
    
    console.log('PDF Saved to:', outputPath);
    console.log('PDF Size:', pdf.length);
    console.log('--- MANUAL PDF TEST END ---');
}

runTest().catch(console.error);
