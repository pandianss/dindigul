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

export function imageToBase64(assetRelPath: string): string {
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
    let signatoryNameHi = '';
    let signatoryNameTa = '';
    let signingAuthEn = orgConfig?.signingAuthEn || 'Regional Manager';
    let signingAuthHi = orgConfig?.signingAuthHi || 'क्षेत्रीय प्रबंधक';
    let signingAuthTa = orgConfig?.signingAuthTa || 'மண்டல மேலாளர்';

    // Try to find the user record to get trilingual names and latest designation
    let signatoryUser = null;
    if (signatoryName) {
        signatoryUser = await prisma.user.findFirst({
            where: { fullNameEn: signatoryName }
        });
    } else if (ro?.headUserId) {
        signatoryUser = await prisma.user.findUnique({
            where: { id: ro.headUserId }
        });
    }

    if (signatoryUser) {
        signatoryName = signatoryUser.fullNameEn;
        signatoryNameHi = signatoryUser.fullNameHi || '';
        signatoryNameTa = signatoryUser.fullNameTa || '';
        
        // Use orgConfig overrides if present, else fallback to staff designations
        signingAuthEn = orgConfig?.signingAuthEn || signatoryUser.designationEn || "Region Head";
        signingAuthHi = orgConfig?.signingAuthHi || signatoryUser.designationHi || "क्षेत्र प्रमुख";
        signingAuthTa = orgConfig?.signingAuthTa || signatoryUser.designationTa || "மண்டலத் தலைவர்";
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
        signatoryNameHi,
        signatoryNameTa,
        signingAuthEn,
        signingAuthHi,
        signingAuthTa
    };
}

export interface PremiumLayoutData {
    title: string;
    titleHi?: string;
    titleTa?: string;
    date: string;
    refNo?: string;
    subTitle?: string;
    bodyHtml: string;
    watermarkText?: string;
    signatoryName?: string;
    signatoryTitleEn?: string;
    signatoryTitleHi?: string;
    signatoryTitleTa?: string;
    deptSealSrc?: string;
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
    initiator?: { name: string, nameTa?: string, nameHi?: string, titleEn: string, titleTa?: string, titleHi?: string };
    reviewers?: { name: string, nameTa?: string, nameHi?: string, titleEn: string, titleTa?: string, titleHi?: string }[];
    approver?: { name: string, nameTa?: string, nameHi?: string, titleEn: string, titleTa?: string, titleHi?: string };
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

  @page { size: A4; margin: 10mm 12mm; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', Arial, sans-serif;
    font-size: 11px;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.25;
  }

  .hindi { font-family: 'NotoHindi', sans-serif; }
  .tamil { font-family: 'NotoTamil', sans-serif; }

  .page { width: 210mm; min-height: 297mm; position: relative; background: #fff; }
  .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.04; pointer-events: none; z-index: 0; }
  .watermark img { width: 480px; }
  .content { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 250mm; ${isAdvisory ? 'padding-top: 25px;' : ''} }

  .header { border-bottom: 2px solid #254aa0; padding-top: 5px; padding-bottom: 5px; margin-bottom: 5px; }
  .header-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .header-top img { height: 60px; width: 60px; object-fit: contain; }
  .bank-names { display: flex; flex-direction: column; gap: 2px; }
  .bank-names h1 { color: #254aa0; line-height: 1.3; font-weight: 700; }
 
  .col-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; width: 100%; color: #254aa0; margin-top: 8px; }
  .col-grid .col { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 0 10px; }
  .col-grid .col + .col { border-left: 1px solid rgba(37,74,160,0.2); }
  .col-name { font-weight: 700; font-size: 12.5px; text-align: center; line-height: 1.3; }
  .col-addr { font-size: 10.5px; text-align: center; line-height: 1.4; opacity: 0.9; }
  .col-addr.hindi { font-size: 13.5px; }
  .col-name.hindi { font-size: 14.5px; }
 
  .contact-row {
    display: flex; justify-content: center; gap: 40px;
    font-size: 11px; font-weight: 700; color: #254aa0;
    margin-top: 10px; padding-top: 8px;
    border-top: 1px solid rgba(37,74,160,0.1);
  }
 
  .meta-info { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .ref-no { font-weight: 700; color: #254aa0; font-size: 10.5px; }
  .date-line { text-align: right; font-size: 10.5px; font-weight: 700; color: #1e293b; }
 
  .advisory-band { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: #dc2626; z-index: 100; }
  .advisory-badge { 
    position: absolute; top: 15px; right: 15px; 
    background: #fee2e2; border: 1.5px solid #dc2626; color: #dc2626;
    padding: 3px 10px; border-radius: 4px; font-weight: 800; font-size: 9px;
    display: flex; align-items: center; gap: 4px; z-index: 101;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
 
  .subject {
    text-align: center; font-weight: 700; font-size: 15px;
    text-transform: uppercase;
    letter-spacing: 0.05em; color: #254aa0;
    margin-bottom: 6px; line-height: 1.1;
  }
 
  .body { flex-grow: 1; color: #1e293b; font-size: 11px; text-align: justify; }
  .body p { margin-bottom: 4px; }
 
  .signatures-container { 
    position: relative; 
    margin-top: 20px; 
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    gap: 30px; 
  }
  .sig-row { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-end; 
    gap: 15px;
    width: 100%;
  }
  
  .sig-block { text-align: center; width: 175px; position: relative; }
  .sig-block.preparer .sig-line { width: 175px; }

  .signing-space { height: 25px; }
  .sig-line { border-top: 1.1px solid #9ca3af; margin-bottom: 2px; padding-top: 1px; }
  .sig-name { font-weight: 700; color: #254aa0; font-size: 10px; margin-bottom: 1px; line-height: 1.1; }
  .sig-titles { display: flex; flex-direction: column; gap: 0px; font-size: 8px; line-height: 1.1; }
  .sig-titles p { font-weight: 700; color: #254aa0; }
  .approved-status { font-weight: 700; color: #254aa0; font-size: 9px; margin-bottom: 4px; text-align: center; width: 100%; }

  .dept-seal {
    position: absolute;
    top: -95px; 
    left: 50%;
    transform: translateX(-50%) rotate(-12deg);
    width: 100px;
    height: 100px;
    opacity: 0.45;
    z-index: 0;
    pointer-events: none;
  }
  .dept-seal img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
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
          <h1 class="hindi" style="font-size:17px;">${org.bankNameHi}</h1>
          <h1 class="tamil" style="font-size:15.5px;">${org.bankNameTa}</h1>
          <h1 style="font-size:17px;">${org.bankNameEn}</h1>
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
    <div class="subject">
        ${data.titleHi ? `<p class="hindi" style="font-size:16px;margin-bottom:2px;">${data.titleHi}</p>` : ''}
        ${data.titleTa ? `<p class="tamil" style="font-size:14px;margin-bottom:2px;">${data.titleTa}</p>` : ''}
        <p>${data.title}</p>
    </div>
    ${data.subTitle ? `<div style="text-align:center;font-weight:700;margin-top:5px;margin-bottom:20px;color:#475569;">${data.subTitle}</div>` : ''}
    ` : ''}

    <div class="body">${data.bodyHtml}</div>

    ${data.initiator || data.reviewers ? `
    <div class="signatures-container">
      <!-- Row 1: Initiator (Preparer) -->
      ${data.initiator ? `
      <div class="sig-row">
        <div class="sig-block preparer">
          <div class="signing-space"></div>
          <div class="sig-line"></div>
          <div class="sig-name">
            ${data.initiator.nameHi ? `<p class="hindi">(${data.initiator.nameHi})</p>` : ''}
            ${data.initiator.nameTa ? `<p class="tamil">(${data.initiator.nameTa})</p>` : ''}
            <p>(${data.initiator.name})</p>
          </div>
          <div class="sig-titles">
            ${data.initiator.titleHi ? `<p class="hindi">${data.initiator.titleHi}</p>` : ''}
            ${data.initiator.titleTa ? `<p class="tamil">${data.initiator.titleTa}</p>` : ''}
            <p>${data.initiator.titleEn}</p>
          </div>
        </div>
        <!-- Spacers to keep preparer left if we want it to stay strictly left in a flex space-between -->
        <div style="flex:1"></div>
        <div style="flex:1"></div>
      </div>
      ` : ''}

      <!-- Row 2: Reviewers & Approver -->
      <div class="sig-row">
        <!-- Reviewers -->
        ${(data.reviewers || []).map(rev => `
        <div class="sig-block">
          <div class="signing-space"></div>
          <div class="sig-line"></div>
          <div class="sig-name">
            ${rev.nameHi ? `<p class="hindi">(${rev.nameHi})</p>` : ''}
            ${rev.nameTa ? `<p class="tamil">(${rev.nameTa})</p>` : ''}
            <p>(${rev.name})</p>
          </div>
          <div class="sig-titles">
            ${rev.titleHi ? `<p class="hindi">${rev.titleHi}</p>` : ''}
            ${rev.titleTa ? `<p class="tamil">${rev.titleTa}</p>` : ''}
            <p>${rev.titleEn}</p>
          </div>
        </div>
        `).join('')}

        <!-- Approver -->
        <div class="sig-block">
          ${data.deptSealSrc ? `<div class="dept-seal"><img src="${data.deptSealSrc}" alt="Seal"/></div>` : ''}
          <p class="approved-status">
            <span class="hindi">अनुमोदित</span> / <span class="tamil">ஒப்புதல் அளிக்கப்பட்டது</span> / Approved
          </p>
          <div class="signing-space"></div>
          <div class="sig-line"></div>
          <div class="sig-name">
            ${data.approver?.nameHi ? `<p class="hindi">(${data.approver.nameHi})</p>` : ''}
            ${data.approver?.nameTa ? `<p class="tamil">(${data.approver.nameTa})</p>` : ''}
            <p>(${data.approver?.name || data.signatoryName || '-'})</p>
          </div>
          <div class="sig-titles">
            ${data.approver?.titleHi || data.signatoryTitleHi ? `<p class="hindi">${data.approver?.titleHi || data.signatoryTitleHi}</p>` : ''}
            ${data.approver?.titleTa || data.signatoryTitleTa ? `<p class="tamil">${data.approver?.titleTa || data.signatoryTitleTa}</p>` : ''}
            ${data.approver?.titleEn || data.signatoryTitleEn ? `<p>${data.approver?.titleEn || data.signatoryTitleEn}</p>` : ''}
          </div>
        </div>
      </div>
    </div>
    ` : ''}
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
