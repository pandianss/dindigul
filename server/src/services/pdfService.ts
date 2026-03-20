import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import path from 'path';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

import prisma from '../lib/prisma';

function fontToBase64(filename: string): string {
    try {
        const fontPath = path.join(process.cwd(), '..', 'public', 'fonts', filename);
        const buffer = readFileSync(fontPath);
        return buffer.toString('base64');
    } catch {
        return '';
    }
}

function imageToBase64(assetRelPath: string): string {
    try {
        const fullPath = path.join(process.cwd(), '..', 'public', assetRelPath);
        const buffer = readFileSync(fullPath);
        const ext = path.extname(assetRelPath).slice(1).toLowerCase();
        const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`;
        return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
        return '';
    }
}

export async function renderTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = path.join(process.cwd(), 'src', 'templates', `${templateName}.hbs`);
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    // Sanitize bodyHtml if present
    if (data.bodyHtml) {
        data.bodyHtml = DOMPurify.sanitize(data.bodyHtml);
    }

    return template(data);
}

/**
 * Fetches the most current Regional Office and Organization details from the DB.
 * Used as the source of truth for all PDF headers.
 */
export async function getRegionalOfficeData() {
    
    // 1. Fetch RO Branch (Try code 3933 first, then search by type)
    let ro = await prisma.branch.findUnique({ where: { code: '3933' } });
    if (!ro) {
        ro = await prisma.branch.findFirst({
            where: {
                OR: [
                    { type: 'REGIONAL OFFICE' },
                    { type: 'RO' }
                ]
            }
        });
    }

    // 2. Fetch Organization Config
    let orgConfig = await prisma.organizationConfig.findUnique({
        where: { id: 'singleton' }
    });

    // 3. Resolve Signatory (Details available in staff if not overridden)
    let signatoryName = orgConfig?.signatoryName || '';
    let signingAuthEn = orgConfig?.signingAuthEn || 'Regional Manager';
    let signingAuthHi = orgConfig?.signingAuthHi || 'क्षेत्रीय प्रबंधक';
    let signingAuthTa = orgConfig?.signingAuthTa || 'மண்டல மேலாளர்';

    if (!signatoryName && ro?.headUserId) {
        const roHead = await prisma.user.findUnique({
            where: { id: ro.headUserId }
        });
        if (roHead) {
            signatoryName = roHead.fullNameEn;
            // Use staff-specific trilingual designations if available, otherwise default to "Region Head"
            signingAuthEn = roHead.designationEn || "Region Head";
            signingAuthHi = roHead.designationHi || "क्षेत्र प्रमुख";
            signingAuthTa = roHead.designationTa || "மண்டலத் தலைவர்";
        }
    }

    return {
        bankNameEn: orgConfig?.bankNameEn || 'Indian Overseas Bank',
        bankNameHi: orgConfig?.bankNameHi || 'इंडियन ओवरसीज बैंक',
        bankNameTa: orgConfig?.bankNameTa || 'இந்தியன் ஓவர்சீஸ் வங்கி',
        officeNameEn: ro?.nameEn || 'Regional Office, Dindigul',
        officeNameHi: ro?.nameHi || 'क्षेत्रीय कार्यालय, डिंडीगुल',
        officeNameTa: ro?.nameTa || 'மண்டல அலுவலகம், திண்டுக்கல்',
        addressEn: ro?.address || '',
        addressHi: ro?.addressHi || '',
        addressTa: ro?.addressTa || '',
        phone: ro?.phone || '+91 451 2420000',
        email: ro?.email || 'ro.dindigul@iob.in',
        signatoryName,
        signingAuthEn,
        signingAuthHi,
        signingAuthTa
    };
}

export interface PremiumLayoutData {
    title: string;
    date: string;
    refNo?: string;
    subTitle?: string;
    bodyHtml: string;
    watermarkText?: string;
    signatoryName?: string;
    signatoryTitleEn?: string;
    signatoryTitleHi?: string;
    signatoryTitleTa?: string;
    organization?: {
        bankNameEn: string;
        bankNameHi: string;
        bankNameTa: string;
        officeNameEn: string;
        officeNameHi: string;
        officeNameTa: string;
        addressEn: string;
        addressHi: string;
        addressTa: string;
        phone: string;
        email: string;
    };
    isAdvisory?: boolean;
    hideHeader?: boolean;
    hideMeta?: boolean;
    hideTitle?: boolean;
}

export function buildPremiumLayout(data: PremiumLayoutData): string {
    const isAdvisory = data.isAdvisory || false;
    const org = data.organization || {
        bankNameEn: 'Indian Overseas Bank',
        bankNameHi: 'इंडियन ओवरसीज बैंक',
        bankNameTa: 'இந்தியன் ஓவர்சீஸ் வங்கி',
        officeNameEn: 'Regional Office, Dindigul',
        officeNameHi: 'क्षेत्रीय कार्यालय, डिंडीगुल',
        officeNameTa: 'மண்டல அலுவலகம், திண்டுக்கல்',
        addressEn: 'Regional Office, 123 Madurai Road, Dindigul - 624001, Tamil Nadu',
        addressHi: 'क्षेत्रीय कार्यालय, 123 मदुरै रोड, डिंडीगुल - 624001, तमिलनाडु',
        addressTa: 'மண்டல அலுவலகம், 123 மதுரை ரோடு, திண்டுக்கல் - 624001, தமிழ்நாடு',
        phone: '+91 451 2420000',
        email: 'ro.dindigul@bank.com'
    };

    const interRegular = fontToBase64('inter-400.ttf');
    const interBold = fontToBase64('inter-700.ttf');
    const notoHindi400 = fontToBase64('noto-hindi-400.ttf');
    const notoHindi700 = fontToBase64('noto-hindi-700.ttf');
    const notoTamil400 = fontToBase64('noto-tamil-400.ttf');
    const notoTamil700 = fontToBase64('noto-tamil-700.ttf');

    const emblemSrc = imageToBase64('assets/logo_center.svg');
    const watermarkSrc = imageToBase64('assets/logo_center.svg');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @font-face { font-family:'Inter'; font-weight:400; src:url('data:font/truetype;base64,${interRegular}') format('truetype'); }
  @font-face { font-family:'Inter'; font-weight:700; src:url('data:font/truetype;base64,${interBold}') format('truetype'); }
  @font-face { font-family:'NotoHindi'; font-weight:400; src:url('data:font/truetype;base64,${notoHindi400}') format('truetype'); }
  @font-face { font-family:'NotoHindi'; font-weight:700; src:url('data:font/truetype;base64,${notoHindi700}') format('truetype'); }
  @font-face { font-family:'NotoTamil'; font-weight:400; src:url('data:font/truetype;base64,${notoTamil400}') format('truetype'); }
  @font-face { font-family:'NotoTamil'; font-weight:700; src:url('data:font/truetype;base64,${notoTamil700}') format('truetype'); }

  @page { size: A4; margin: 20mm 15mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 11.5px;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.4;
  }

  .hindi { font-family: 'NotoHindi', sans-serif; }
  .tamil { font-family: 'NotoTamil', sans-serif; }

  .page { width: 210mm; min-height: 297mm; position: relative; background: #fff; }
  .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.04; pointer-events: none; z-index: 0; }
  .watermark img { width: 480px; }
  .content { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 250mm; ${isAdvisory ? 'padding-top: 25px;' : ''} }

  .header { border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 20px; }
  .header-top { display: flex; align-items: center; gap: 20px; margin-bottom: 12px; }
  .header-top img { height: 75px; width: 75px; object-fit: contain; }
  .bank-names { display: flex; flex-direction: column; gap: 2px; }
  .bank-names h1 { color: #1e3a5f; line-height: 1.1; font-weight: 700; }

  .col-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; width: 100%; color: #1e3a5f; margin-top: 12px; }
  .col-grid .col { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 10px; }
  .col-grid .col + .col { border-left: 1px solid rgba(30,58,95,0.2); }
  .col-name { font-weight: 700; font-size: 12.5px; text-align: center; line-height: 1.3; }
  .col-addr { font-size: 10.5px; text-align: center; line-height: 1.4; opacity: 0.9; }
  .col-addr.hindi { font-size: 11.5px; }

  .contact-row {
    display: flex; justify-content: center; gap: 40px;
    font-size: 11px; font-weight: 700; color: #1e3a5f;
    margin-top: 10px; padding-top: 8px;
    border-top: 1px solid rgba(30,58,95,0.1);
  }

  .meta-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .ref-no { font-weight: 700; color: #1e3a5f; font-size: 12px; }
  .date-line { text-align: right; font-size: 12px; font-weight: 700; color: #1e293b; }

  .advisory-band { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: #dc2626; z-index: 100; }
  .advisory-badge { 
    position: absolute; top: 15px; right: 15px; 
    background: #fee2e2; border: 1.5px solid #dc2626; color: #dc2626;
    padding: 3px 10px; border-radius: 4px; font-weight: 800; font-size: 9px;
    display: flex; align-items: center; gap: 4px; z-index: 101;
    text-transform: uppercase; letter-spacing: 0.05em;
  }

  .subject {
    text-align: center; font-weight: 700; font-size: 16px;
    text-decoration: underline; text-transform: uppercase;
    letter-spacing: 0.05em; color: #1e3a5f;
    margin-bottom: 20px; line-height: 1.3;
  }

  .body { flex-grow: 1; color: #1e293b; font-size: 12px; text-align: justify; }
  .body p { margin-bottom: 10px; }

  .signature { margin-top: 60px; display: flex; justify-content: flex-end; }
  .signature-block { text-align: center; min-width: 220px; }
  .sig-line { border-top: 1.5px solid #9ca3af; margin-bottom: 6px; padding-top: 6px; }
  .sig-name { font-weight: 700; color: #1e3a5f; font-size: 14.5px; margin-bottom: 5px; }
  .sig-titles { display: flex; flex-direction: column; gap: 3px; font-size: 11.5px; }
  .sig-titles p { font-weight: 700; color: #1e3a5f; }
</style>
</head>
<body>
<div class="page">
  ${isAdvisory ? '<div class="advisory-band"></div>' : ''}
  ${isAdvisory ? '<div class="advisory-badge"><span>⚠️</span> HIGH RISK ADVISORY</div>' : ''}
  <div class="watermark"><img src="${watermarkSrc}" alt=""/></div>
  <div class="content">
    ${!data.hideHeader ? `
    <div class="header">
      <div class="header-top">
        <img src="${emblemSrc}" alt="Logo"/>
        <div class="bank-names">
          <h1 class="hindi" style="font-size:19px;">${org.bankNameHi}</h1>
          <h1 class="tamil" style="font-size:18px;">${org.bankNameTa}</h1>
          <h1 style="font-size:19px;">${org.bankNameEn}</h1>
        </div>
      </div>
      <div class="col-grid">
        <div class="col"><p class="col-name hindi">${org.officeNameHi}</p><p class="col-addr hindi">${org.addressHi}</p></div>
        <div class="col"><p class="col-name tamil">${org.officeNameTa}</p><p class="col-addr tamil">${org.addressTa}</p></div>
        <div class="col"><p class="col-name">${org.officeNameEn}</p><p class="col-addr">${org.addressEn}</p></div>
      </div>
      <div class="contact-row">
        <span>Phone: ${org.phone}</span>
        <span>Email: ${org.email}</span>
      </div>
    </div>` : ''}
    
    ${!data.hideMeta ? `
    <div class="meta-info">
      <div class="ref-no">${data.refNo ? `Ref No: ${data.refNo}` : ''}</div>
      <div class="date-line">
        <span class="hindi" style="font-size:12px;">दिनांक</span> /
        <span class="tamil" style="font-size:11px;">தேதி</span> /
        Date: ${data.date}
      </div>
    </div>` : ''}
    
    ${!data.hideTitle ? `
    <div class="subject">${data.title}</div>
    ${data.subTitle ? `<div style="text-align:center;font-weight:700;margin-top:-25px;margin-bottom:35px;color:#475569;">${data.subTitle}</div>` : ''}
    ` : ''}

    <div class="body">${data.bodyHtml}</div>

    ${data.signatoryName ? `
    <div class="signature">
      <div class="signature-block">
        <div class="sig-line"></div>
        <p class="sig-name">(${data.signatoryName})</p>
        <div class="sig-titles">
          ${data.signatoryTitleHi ? `<p class="hindi">${data.signatoryTitleHi}</p>` : ''}
          ${data.signatoryTitleTa ? `<p class="tamil">${data.signatoryTitleTa}</p>` : ''}
          ${data.signatoryTitleEn ? `<p>${data.signatoryTitleEn}</p>` : ''}
        </div>
      </div>
    </div>` : ''}
  </div>
</div>
</body>
</html>`;
}

export async function generatePDF(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    });

    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}
