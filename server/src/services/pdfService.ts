import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Handlebars Helpers
handlebars.registerHelper('toFixed', (num, precision) => {
    return Number(num || 0).toLocaleString('en-IN', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
    });
});

handlebars.registerHelper('isRatio', (paramName) => {
    return ['%', 'RATIO', 'PERCENT'].some(k => (paramName || '').toUpperCase().includes(k));
});

handlebars.registerHelper('isNegative', (num) => {
    return Number(num || 0) < 0;
});

handlebars.registerHelper('calculatePercent', (part, total) => {
    if (!total || total === 0) return '0.00';
    return ((Number(part) / Number(total)) * 100).toFixed(2);
});


/**
 * Replaces standard hyphens with non-breaking hyphens (U+2011) in text nodes
 * to prevent date/word splitting at dashes in the PDF.
 */
function sanitizeHtmlForPrint(html: string): string {
    if (!html) return '';
    const { window } = new JSDOM(html);
    const document = window.document;
    
    const walk = (node: Node) => {
        if (node.nodeType === 3) { // Text Node
            if (node.nodeValue) {
                // Protect hyphens, en-dashes, and em-dashes between words/numbers
                // We use Word Joiner (\u2060) and Non-Breaking Space (\u00A0) to prevent splitting
                node.nodeValue = node.nodeValue.replace(/(\w)\s*([-–—])\s*(\w)/g, (match) => {
                    return match
                        .replace(/\s/g, '\u00A0')       // Replace spaces with non-breaking spaces
                        .replace(/[-–—]/g, '\u2060$&\u2060'); // Wrap dashes in word joiners
                });
            }
        } else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
            node.childNodes.forEach(walk);
        }
    };
    
    walk(document.body);
    return document.body.innerHTML;
}

import prisma from '../lib/prisma';

// ── Asset Caching (Performance Optimization for Bulk Downloads) ──────────────
const assetCache: Record<string, string> = {};

function fontToBase64(filename: string): string {
    if (assetCache[`font:${filename}`]) return assetCache[`font:${filename}`];
    try {
        const fontPath = path.join(process.cwd(), '..', 'public', 'fonts', filename);
        const buffer = readFileSync(fontPath);
        const b64 = buffer.toString('base64');
        assetCache[`font:${filename}`] = b64;
        return b64;
    } catch {
        return '';
    }
}

export function imageToBase64(assetRelPath: string): string {
    if (assetCache[`img:${assetRelPath}`]) return assetCache[`img:${assetRelPath}`];
    
    // Strip leading slashes to prevent path.join issues
    const sanitizedPath = assetRelPath.startsWith('/') || assetRelPath.startsWith('\\') 
        ? assetRelPath.substring(1) 
        : assetRelPath;

    const pathsToTry = [
        path.join(process.cwd(), '..', 'public', sanitizedPath),
        path.join(process.cwd(), '..', 'public', 'assets', 'dept_seal.png'), // fallback seal
    ];

    for (const fullPath of pathsToTry) {
        try {
            if (existsSync(fullPath)) {
                const buffer = readFileSync(fullPath);
                const ext = path.extname(fullPath).slice(1).toLowerCase();
                const mime = (ext === 'svg') ? 'image/svg+xml' : `image/${ext}`;
                const b64 = `data:${mime};base64,${buffer.toString('base64')}`;
                assetCache[`img:${assetRelPath}`] = b64;
                return b64;
            }
        } catch (err) {
            continue;
        }
    }
    return '';
}

export async function renderTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = path.join(process.cwd(), 'src', 'templates', `${templateName}.hbs`);
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(templateSource);

    // Sanitize bodyHtml if present, allowing inline styles and classes for custom components
    if (data.bodyHtml) {
        data.bodyHtml = DOMPurify.sanitize(data.bodyHtml, { 
            ADD_ATTR: ['style', 'class', 'rowspan', 'colspan', 'border', 'cellpadding', 'cellspacing', 'width', 'height'],
            ADD_TAGS: ['div', 'span', 'p', 'table', 'tr', 'td', 'th', 'br', 'b', 'i', 'u', 'strong', 'em'],
            FORCE_BODY: true 
        });
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
    signatoryNameHi?: string;
    signatoryNameTa?: string;
    signatoryTitleEn?: string;
    signatoryTitleHi?: string;
    signatoryTitleTa?: string;
    deptSealSrc?: string;
    recipient?: {
        name?: string;
        nameHi?: string;
        nameTa?: string;
        designation?: string;
        designationHi?: string;
        designationTa?: string;
        bankName?: string;
        branchName?: string;
        branchCode?: string;
    };
    salutation?: string;
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
    isBudget?: boolean;
    hideHeader?: boolean;
    hideMeta?: boolean;
    hideTitle?: boolean;
    hideApprovedStatus?: boolean;
    initiator?: { name: string, nameTa?: string, nameHi?: string, titleEn: string, titleTa?: string, titleHi?: string };
    reviewers?: { name: string, nameTa?: string, nameHi?: string, titleEn: string, titleTa?: string, titleHi?: string }[];
    approver?: { name: string, nameTa?: string, nameHi?: string, titleEn: string, titleTa?: string, titleHi?: string };
    orgMeta?: any;
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

    // Simple Markdown implementation: **Bold**
    // ONLY apply newline to <br/> if the content doesn't already contain block-level HTML tags
    const hasHtml = /<(p|div|table|br)/i.test(data.bodyHtml);
    
    const htmlContent = data.bodyHtml
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, hasHtml ? '\n\n' : '<br/><br/>')
        .replace(/\n/g, hasHtml ? '\n' : '<br/>');

    // Perform sanitization to allow custom styling while protecting hyphens in text nodes
    const sanitizedBody = sanitizeHtmlForPrint(DOMPurify.sanitize(htmlContent, { 
        ADD_ATTR: ['style', 'cellspacing', 'cellpadding'],
        ADD_TAGS: ['table', 'tbody', 'tr', 'td', 'span', 'b', 'strong', 'i', 'p', 'br', 'div']
    }));

    const pdfStyles = `<style>
        @font-face { font-family:'Inter'; font-weight:400; src:url('data:font/truetype;base64,${interRegular}') format('truetype'); }
        @font-face { font-family:'Inter'; font-weight:700; src:url('data:font/truetype;base64,${interBold}') format('truetype'); }
        @font-face { font-family:'NotoHindi'; font-weight:400; src:url('data:font/truetype;base64,${notoHindi400}') format('truetype'); }
        @font-face { font-family:'NotoHindi'; font-weight:700; src:url('data:font/truetype;base64,${notoHindi700}') format('truetype'); }
        @font-face { font-family:'NotoTamil'; font-weight:400; src:url('data:font/truetype;base64,${notoTamil400}') format('truetype'); }
        @font-face { font-family:'NotoTamil'; font-weight:700; src:url('data:font/truetype;base64,${notoTamil700}') format('truetype'); }

        @page { size: A4; margin: 15.5mm 12.7mm 12.7mm 12.7mm; }
        * { margin: 0; padding: 0; box-sizing: border-box !important; }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #1e293b; background: white; line-height: 1.5; -webkit-print-color-adjust: exact; }
        
        .hindi { font-family: 'NotoHindi', sans-serif; line-height: 1.7; }
        .tamil { font-family: 'NotoTamil', sans-serif; line-height: 1.5; font-size: 9.5px !important; }

        body { background: #fff; }
        .page { width: 100%; position: relative; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.04; pointer-events: none; z-index: -1; }
        .watermark img { width: 420px; }
        .content { position: relative; z-index: 1; display: flex; flex-direction: column; min-height: 260mm; ${isAdvisory ? 'padding-top: 15px;' : ''} }

        .header { width: 100%; border-bottom: 0.2pt solid #254aa0 !important; padding-bottom: 8px; margin-bottom: 12px; }
        .header-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .header-top img { height: 55px; width: 55px; object-fit: contain; }
        .bank-names { padding-top: 5px; }
        .bank-names h1 { color: #254aa0; line-height: 1.4; font-weight: 700; font-size: 16.5px; }

        .col-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; width: 100%; color: #800000; margin-top: 8px; align-items: stretch; }
        .col { display: flex; flex-direction: column; align-items: center; padding: 0 8px; text-align: center; }
        .col + .col { border-left: 1px solid rgba(128,0,0,0.15); }
        .col-name { font-weight: 700; font-size: 10.5px; line-height: 1.4; }
        .col-name.tamil { font-size: 10.5px !important; }
        .col-addr.tamil { font-size: 8.8px !important; line-height: 1.3; }
        .col-addr { font-size: 9.5px; line-height: 1.4; opacity: 0.95; }
        .col-addr.hindi { font-size: 9.5px; }
        .col-name.hindi { font-size: 10.5px; }

        .contact-row { display: flex; justify-content: center; gap: 30px; font-size: 12px; font-weight: 700; color: #800000; margin-top: 8px; padding-top: 5px; border-top: 1px solid rgba(128,0,0,0.08); width: 100%; }

        .meta-info { display: flex; justify-content: space-between; margin-bottom: 2px; font-weight: 700; font-size: 12px; width: 100%; }
        .ref-no { color: #254aa0; }
        
        .subject { text-align: center; font-weight: 700; font-size: 15.5px; text-transform: uppercase; margin: 10px 0; line-height: 1.2; color: black; }
        
        .body { font-size: 14.5px; line-height: 1.6; text-align: left; }
        .body p { margin-bottom: 8px; overflow-wrap: break-word; }
        .body ul, .body ol { padding-left: 20px; margin-bottom: 15px; }
        .body li { margin-bottom: 6px; overflow-wrap: break-word; }
        .body * { word-break: normal; }
        
        .body table { width: 100% !important; table-layout: fixed; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
        .body th, .body td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; overflow-wrap: break-word; }
        .body th { background: #f8fafc; font-weight: 700; color: #254aa0; }

        .signatures-container { margin-top: 10px; page-break-inside: avoid; display: flex; flex-direction: column; gap: 15px; position: relative; width: 100%; min-height: 180px; }
        .sig-row { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
        .sig-block { width: 175px; text-align: center; position: relative; padding-top: 35px; }
        .sig-line { border-top: 0.5pt solid #9ca3af; margin-bottom: 4px; }
        .sig-name { font-weight: 700; color: #254aa0; font-size: 11.5px; margin-bottom: 2px; }
        .sig-titles { font-size: 10px; line-height: 1.4; color: #1e293b; }
        .sig-block p { margin: 0 !important; }
        .sig-block .hindi { font-size: 11.5px !important; line-height: 1.7; }
        .sig-block .tamil { font-size: 9px !important; }
        
        .signing-space { height: 15px; }
        .dept-seal { position: absolute; width: 155px; height: 155px; opacity: 0.35; pointer-events: none; z-index: 100; transform: rotate(-12deg); filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.1)); }
        .dept-seal img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.1)); }
        .approved-status { position: absolute; top: -15px; left: 0; right: 0; font-weight: 700; color: #254aa0; font-size: 10.2px; text-transform: uppercase; letter-spacing: 0.03em; line-height: 1.3; }

        .advisory-band { display: none !important; }
        .advisory-badge { position: absolute; top: 10px; right: 10px; background: #fee2e2; border: 1.5px solid #dc2626; color: #dc2626; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-size: 10px; z-index: 101; }
        
        .budget-band { display: none !important; }
        .budget-badge { position: absolute; top: 10px; right: 10px; background: #eff6ff; border: 1.5px solid #254aa0; color: #254aa0; padding: 3px 8px; border-radius: 4px; font-weight: 800; font-size: 10px; z-index: 101; }
        
        .recipient-block { font-size: 14.5px; line-height: 1.6 !important; margin: 0 0 10px 0 !important; color: #1e293b; font-weight: 700; width: 100%; border-collapse: collapse !important; border-spacing: 0 !important; }
        .recipient-block td { padding: 0 !important; margin: 0 !important; border: none !important; vertical-align: top !important; line-height: 1.6 !important; }
    </style>`;

    const addrEn = org.addressEn.replace('Pensioner Street,', 'Pensioner Street,<br />').replace(',,', ',');
    const addrHi = org.addressHi.replace('पेंशनर स्ट्रीट,', 'पेंशनर स्ट्रीट,<br />').replace(',,', ',');
    const addrTa = org.addressTa.replace('பென்ஷனர் தெரு,', 'பென்ஷனர் தெரு,<br />').replace(',,', ',');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    ${pdfStyles}
</head>
<body>
    <div class="watermark"><img src="${watermarkSrc}" alt=""/></div>
<div class="page">
    ${isAdvisory ? '<div class="advisory-band"></div>' : ''}
    ${isAdvisory ? '<div class="advisory-badge"><span>⚠️</span> HIGH RISK ADVISORY</div>' : ''}
    ${data.isBudget ? '<div class="budget-band"></div>' : ''}
    ${data.isBudget ? '<div class="budget-badge"><span>📊</span> BUDGET ALLOTMENT</div>' : ''}
    <div class="content">
        ${!data.hideHeader ? `
        <div class="header">
            <div class="header-top">
                <img src="${emblemSrc}" alt="Logo"/>
                <div class="bank-names">
                    <h1 class="hindi">${org.bankNameHi}</h1>
                    <h1 class="tamil" style="font-size:13.5px !important;">${org.bankNameTa}</h1>
                    <h1 style="font-size:17px;">${org.bankNameEn}</h1>
                </div>
            </div>
            <div class="col-grid">
                <div class="col"><p class="col-name hindi">${org.officeNameHi}</p><p class="col-addr hindi">${addrHi}</p></div>
                <div class="col"><p class="col-name tamil">${org.officeNameTa}</p><p class="col-addr tamil">${addrTa}</p></div>
                <div class="col"><p class="col-name">${org.officeNameEn}</p><p class="col-addr">${addrEn}</p></div>
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
                <span class="hindi" style="font-size:12px;">दिनांक</span> / <span class="tamil" style="font-size:9px !important;">தேதி</span> / Date: ${data.date}
            </div>
        </div>` : ''}

        <div class="body">
            ${data.recipient ? `
            <table class="recipient-block" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border-spacing: 0; margin-bottom: 12px;">
                <tr><td style="line-height:1.6;">To,</td></tr>
                ${data.recipient.name ? `
                    <tr><td style="line-height:1.6;">
                        ${data.recipient.nameHi ? `<span class="hindi" style="font-size:13.5px; line-height:1.6;">${data.recipient.nameHi} / </span>` : ''}
                        ${data.recipient.nameTa ? `<span class="tamil" style="font-size:11.5px; line-height:1.6;">${data.recipient.nameTa} / </span>` : ''}
                        <span>${data.recipient.name}</span>
                    </td></tr>
                ` : ''}
                ${data.recipient.designation ? `
                    <tr><td style="line-height:1.6;">
                        ${data.recipient.designationHi ? `<span class="hindi" style="font-size:13.5px; line-height:1.6;">${data.recipient.designationHi} / </span>` : ''}
                        ${data.recipient.designationTa ? `<span class="tamil" style="font-size:11.5px; line-height:1.6;">${data.recipient.designationTa} / </span>` : ''}
                        <span>${data.recipient.designation}</span>
                    </td></tr>
                ` : `<tr><td style="line-height:1.6;">The Branch Manager</td></tr>`}
                <tr><td style="line-height:1.6;">${data.recipient.bankName || 'Indian Overseas Bank'}</td></tr>
                <tr><td style="line-height:1.6;">${data.recipient.branchName || 'Branch'} [${data.recipient.branchCode || ''}]</td></tr>
            </table>` : ''}

            ${!data.hideTitle ? `
            <div class="subject">
                <p>${data.title}</p>
                ${data.titleHi ? `<p class="hindi" style="font-size:13.5px; margin-top:2px; color:black;">${data.titleHi}</p>` : ''}
                ${data.titleTa ? `<p class="tamil" style="font-size:10.5px !important; margin-top:2px; color:black;">${data.titleTa}</p>` : ''}
            </div>` : ''}

            ${data.salutation ? `<p style="margin-bottom: 15px; font-weight: 700;">${data.salutation}</p>` : ''}

            ${sanitizedBody}
        </div>

        ${(data.initiator || data.reviewers || data.approver || data.signatoryName) ? `
        <div class="signatures-container">
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
                <div style="flex:2"></div>
            </div>` : ''}

            <div class="sig-row">
                ${(data.reviewers && data.reviewers.length > 0) 
                    ? (data.reviewers || []).map((rev: any) => `
                        <div class="sig-block">
                            <div class="signing-space"></div>
                            <p style="font-size: 10px; color: #64748b; margin-bottom: 4px;">Sd/-</p>
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
                        </div>`).join('') 
                    : '<div style="flex:1"></div>'
                }

                <div class="sig-block">
                    ${(data.isBudget || data.hideApprovedStatus) ? '' : `<p class="approved-status"><span class="hindi">अनुमोदित</span> / <span class="tamil">ஒப்புதல் அளிக்கப்பட்டது</span> / Approved</p>`}
                    <div class="signing-space"></div>
                    <p style="font-size: 10px; color: #64748b; margin-bottom: 4px;">Sd/-</p>
                    <div class="sig-line"></div>
                    <div class="sig-name">
                        ${(data.approver?.nameHi || data.signatoryNameHi) ? `<p class="hindi">(${data.approver?.nameHi || data.signatoryNameHi})</p>` : ''}
                        ${(data.approver?.nameTa || data.signatoryNameTa) ? `<p class="tamil">(${data.approver?.nameTa || data.signatoryNameTa})</p>` : ''}
                        <p>(${data.approver?.name || data.signatoryName || '-'})</p>
                    </div>
                    <div class="sig-titles">
                        ${(data.approver?.titleHi || data.signatoryTitleHi) ? `<p class="hindi">${data.approver?.titleHi || data.signatoryTitleHi}</p>` : ''}
                        ${(data.approver?.titleTa || data.signatoryTitleTa) ? `<p class="tamil">${data.approver?.titleTa || data.signatoryTitleTa}</p>` : ''}
                        ${(data.approver?.titleEn || data.signatoryTitleEn) ? `<p>${data.approver?.titleEn || data.signatoryTitleEn}</p>` : ''}
                    </div>
                </div>
            </div>
            ${data.deptSealSrc ? `<div class="dept-seal" style="left: ${(data as any).orgMeta?.sealX || 0}%; top: ${(data as any).orgMeta?.sealY || 30}%;"><img src="${data.deptSealSrc}" alt="Seal"/></div>` : ''}
        </div>` : ''}
    </div>
</div>
</body>
</html>`;
}

export async function getBrowser() {
    return await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--font-render-hinting=none'
        ]
    });
}

export async function generatePDF(html: string, existingBrowser?: any, refNo?: string): Promise<Buffer> {
    const browser = existingBrowser || await getBrowser();
    let page = null;

    try {
        page = await browser.newPage();
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
        // Add timeout to prevent hanging on individual letters
        await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
        await page.emulateMediaType('print');
        
        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: `
                <div style="font-family: sans-serif; font-size: 9px; width: 100%; margin: 0 12.7mm; padding-top: 5mm; display: flex; justify-content: flex-end; color: #64748b; opacity: 0.6;">
                    <span>${refNo || ''} &nbsp; | &nbsp; Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
                </div>`,
            footerTemplate: '<div style="font-size: 1px;"></div>',
            preferCSSPageSize: true,
            margin: {
                top: '15.5mm',
                right: '12.7mm',
                bottom: '12.7mm',
                left: '12.7mm'
            }
        });

        return Buffer.from(pdf);
    } finally {
        if (page) await page.close();
        if (!existingBrowser) await browser.close();
    }
}

export function buildLetterBodyHtml(contentEn: string, org: any, letter?: any): string {
    const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(org.branch?.type?.toUpperCase() || '') || org.branch?.code === '3933';
    
    // Aggregate data source: prefer performanceDataList, fallback to performanceData
    const pdList = org.performanceDataList || [];
    const singlePd = org.performanceData;
    const dataList = pdList.length > 0 ? pdList : (singlePd ? [singlePd] : []);

    // Filter out the "Dear Sir/Madam" and "To," if they are manually placed at the start of content
    const cleanedContent = contentEn
        .replace(/^Dear Sir\/Madam,?\s*/i, '')
        .replace(/^To,?\s*/i, '')
        .trim();

    const paragraphs = cleanedContent.split('\n\n');
    let bodyHtml = '';
    
    // 1. Add Trilingual Body Blocks for Manual/Custom Letters
    if (letter?.contentHi) {
        bodyHtml += `<div class="hindi" style="font-size: 13.5px; margin-bottom: 12px; text-align: justify;">${letter.contentHi.replace(/\n/g, '<br/>')}</div>`;
    }
    if (letter?.contentTa) {
        bodyHtml += `<div class="tamil" style="font-size: 11.5px; margin-bottom: 12px; text-align: justify;">${letter.contentTa.replace(/\n/g, '<br/>')}</div>`;
    }

    const fmt = (n: number) => (n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatDate = (d: any) => {
        if (!d) return 'N/A';
        const dt = new Date(d);
        return isNaN(dt.getTime()) ? 'N/A' : `${dt.getDate().toString().padStart(2, '0')}.${(dt.getMonth() + 1).toString().padStart(2, '0')}.${dt.getFullYear().toString().slice(-2)}`;
    };

    for (const para of paragraphs) {
        if (!para.trim()) continue;

        if (para.trim() === '[PERFORMANCE_TABLE]') {
            if (dataList.length === 0) continue;

            for (const item of dataList) {
                const isPercent = item.unit === '%' || item.unit === 'Ratio' || (item.parameter || '').includes('%');
                const forceInverted = ['NPA', 'SMA', 'OVERDUE'].some(k => (item.parameter || '').toUpperCase().includes(k)) || item.isInverted === true;
                const isAchieved = forceInverted ? (item.latest <= item.budget) : (item.latest >= item.budget);
                const gapLabel = forceInverted ? (item.latest <= item.budget ? 'Reduction' : 'Overrun') : (item.latest >= item.budget ? 'Surplus' : 'Shortfall');
                const showCurrency = (item.unit === 'Cr' || item.unit === 'Lakhs' || (!isPercent && item.unit !== 'Accounts'));
                
                // UNIFIED SCALING LOGIC
                // Standard: DB stores Crores.
                // RO sees Crores (scale 1). Branches see Lakhs (scale 100).
                const baseScale = (!isRegional && showCurrency) ? 100 : 1;
                const unitLabel = showCurrency ? (isRegional ? 'Cr' : 'Lakhs') : (item.unit || '');

                const getScaledVal = (val: number) => {
                    if (!showCurrency) return val;
                    // Heuristic: If it's a branch and value is already > 250, 
                    // it is highly likely already in Lakhs (mis-ingested budget or legacy data).
                    // We don't scale it further to avoid ridiculous figures like 500,000 Lakhs.
                    if (!isRegional && Math.abs(val) > 250) return val;
                    return val * baseScale;
                };

                const fyGrowth = (item.latest || 0) - (item.march31st || 0);
                const gapColor = isAchieved ? '#15803d' : '#b91c1c';

                // REVISED STATUS LOGIC:
                // 1. SURPASSED if target achieved.
                // 2. POSITIVE if not achieved but showing positive growth vs FY Start.
                // 3. NEGATIVE if not achieved and showing decline/negative movement vs FY Start.
                let statusLabel = 'NEGATIVE';
                let statusColor = '#b91c1c';

                if (isAchieved) {
                    statusLabel = 'SURPASSED';
                    statusColor = '#15803d';
                } else {
                    const movementPositive = forceInverted ? (fyGrowth <= 0) : (fyGrowth >= 0);
                    if (movementPositive) {
                        statusLabel = 'POSITIVE';
                        statusColor = '#15803d';
                    } else {
                        statusLabel = 'NEGATIVE';
                        statusColor = '#b91c1c';
                    }
                }

                bodyHtml += `
                <div style="margin:20px 0; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
                    <div style="font-weight:700; font-size:11px; margin-bottom:8px; color:#254aa0; text-transform:uppercase;">KPI: ${item.parameter || 'Performance Metric'}</div>
                    <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:center;">
                        <tr style="background:#f1f5f9;font-weight:700;">
                            <th style="border:1px solid #94a3b8;padding:8px;">OB (${formatDate(item.march31stDate)})</th>
                            <th style="border:1px solid #94a3b8;padding:8px;">Latest (${formatDate(item.latestDate)})</th>
                            <th style="border:1px solid #94a3b8;padding:8px;">FY Growth</th>
                            <th style="border:1px solid #94a3b8;padding:8px;">Target Budget</th>
                            <th style="border:1px solid #94a3b8;padding:8px;">Gap to Budget</th>
                            <th style="border:1px solid #94a3b8;padding:8px;">Status</th>
                        </tr>
                        <tr>
                            <td style="border:1px solid #94a3b8;padding:8px;">${showCurrency ? '₹ ' : ''}${fmt(getScaledVal(item.march31st))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;color:#1e293b;">${showCurrency ? '₹ ' : ''}${fmt(getScaledVal(item.latest))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;color:${forceInverted ? (fyGrowth <= 0 ? '#15803d' : '#b91c1c') : (fyGrowth >= 0 ? '#15803d' : '#b91c1c')}">${fyGrowth > 0 ? '+' : ''}${showCurrency ? '₹ ' : ''}${fmt(getScaledVal(fyGrowth))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;">${showCurrency ? '₹ ' : ''}${fmt(getScaledVal(item.budget))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;color:${gapColor}">${item.gap >= 0 ? '+' : ''}${showCurrency ? '₹ ' : ''}${fmt(Math.abs(getScaledVal(item.gap)))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;color:${statusColor}">${statusLabel}</td>
                        </tr>
                    </table>
                </div>`;
            }
        } else if (para.includes('[EXCEPTION_TABLE]') && org.exceptions) {
            bodyHtml += `
            <div style="margin:20px 0;">
                <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
                    <tr style="background:#f1f5f9;font-weight:700;">
                        <th style="border:1px solid #94a3b8;padding:8px;width:120px;">RULE ID</th>
                        <th style="border:1px solid #94a3b8;padding:8px;width:120px;">PARAMETER</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">OBSERVATION / EXCEPTION</th>
                    </tr>
                    ${(org.exceptions || []).map((ex: any) => `
                    <tr>
                        <td style="border:1px solid #94a3b8;padding:8px;font-family:monospace;font-size:10px;">${ex.ruleId || 'N/A'}</td>
                        <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;">${ex.parameter || 'N/A'}</td>
                        <td style="border:1px solid #94a3b8;padding:8px;text-align:justify;">${ex.message || 'N/A'}</td>
                    </tr>`).join('')}
                </table>
            </div>`;
        } else if (para.includes('[MOVEMENT_TABLE]') && org.dailyMovement) {
            const scale = isRegional ? 1 : 100;
            const unitLabel = isRegional ? 'Cr' : 'Lakhs';
            bodyHtml += `
            <div style="margin:20px 0;">
                <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:center;">
                    <tr style="background:#f1f5f9;font-weight:700;">
                        <th style="border:1px solid #94a3b8;padding:8px;text-align:left;">PARAMETER</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">PREVIOUS DAY</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">LATEST REPORT</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">MOVEMENT</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">% CHANGE</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">THRESHOLD</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">STATUS</th>
                    </tr>
                    ${(org.dailyMovement || []).map((m: any) => {
                        const breached = !!m.breached;
                        const color = breached ? '#b91c1c' : '#15803d';
                        const thresholdLabel = typeof m.thresholdPct === 'number' ? `+/- ${fmt(m.thresholdPct)}%` : '-';
                        return `
                        <tr>
                            <td style="border:1px solid #94a3b8;padding:8px;text-align:left;font-weight:700;">${m.parameter}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;">₹ ${fmt(m.previousValue * scale)} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;">₹ ${fmt(m.latestValue * scale)} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;color:${color};font-weight:700;">${m.movement >= 0 ? '+' : ''}₹ ${fmt(m.movement * scale)} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;color:${color};font-weight:700;">${fmt(m.pct)}%</td>
                            <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;">${thresholdLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;color:${color};font-weight:700;text-transform:uppercase;">${breached ? 'BREACH' : 'WITHIN LIMIT'}</td>
                        </tr>`;
                    }).join('')}
                </table>
            </div>`;
        } else if (para.trim().startsWith('<div')) {
            bodyHtml += para;
        } else {
            bodyHtml += `<p style="margin-bottom:8px;text-align:justify;">${para.replace(/\n/g, '<br/>')}</p>`;
        }
    }

    return bodyHtml;
}
