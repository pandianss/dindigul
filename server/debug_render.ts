import { renderTemplate, getRegionalOfficeData } from './src/services/pdfService';
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

async function debug() {
    console.log('--- DEBUG RENDER START ---');
    const roData = await getRegionalOfficeData();
    
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

    const html = await renderTemplate('branch-visits-report', context);
    const outputPath = path.join(process.cwd(), 'debug_render_output.html');
    writeFileSync(outputPath, html);
    
    console.log(`Render complete. File saved to: ${outputPath}`);
    console.log('HTML Length:', html.length);
    console.log('Does HTML contain NIRAJ KUMAR?', html.includes('NIRAJ KUMAR'));
    console.log('Does HTML contain RefNo?', html.includes('RO/DGL/RETURNS/BV/2026/03/492'));
    console.log('--- DEBUG RENDER END ---');
}

debug().catch(console.error);
