import puppeteer, { Browser } from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const formatDate = (d: any) => {
    if (!d) return 'N/A';
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? 'N/A' : `${dt.getDate().toString().padStart(2, '0')}.${(dt.getMonth() + 1).toString().padStart(2, '0')}.${dt.getFullYear().toString().slice(-2)}`;
};

const cleanLabel = (label: string) => (label || '').split('(')[0].trim();

// Handlebars Helpers
handlebars.registerHelper('toFixed', (num, precision) => {
    return Number(num || 0).toFixed(precision || 2);
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

handlebars.registerHelper('add', (a, b) => {
    return Number(a) + Number(b);
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

let _browser: Browser | null = null;

// ── Asset Caching (Performance Optimization for Bulk Downloads) ──────────────
const assetCache: Record<string, string> = {};

// Robust root detection: __dirname is server/src/services
const SERVICES_DIR = __dirname;
const SERVER_DIR = path.resolve(SERVICES_DIR, '..', '..');
const ROOT_DIR = path.resolve(SERVER_DIR, '..');

export function fontToBase64(filename: string): string {
    if (assetCache[`font:${filename}`]) return assetCache[`font:${filename}`];
    
    const pathsToTry = [
        path.join(ROOT_DIR, 'public', 'fonts', filename),
        path.join(SERVER_DIR, 'public', 'fonts', filename), // some setups copy public to server
        path.join(ROOT_DIR, 'server', 'public', 'fonts', filename)
    ];

    for (const fontPath of pathsToTry) {
        try {
            if (existsSync(fontPath)) {
                const buffer = readFileSync(fontPath);
                const b64 = buffer.toString('base64');
                assetCache[`font:${filename}`] = b64;
                return b64;
            }
        } catch (err) {
            continue;
        }
    }

    console.error(`[PDF] Failed to load font: ${filename}. Tried paths:`, pathsToTry);
    return '';
}

export function imageToBase64(assetRelPath: string): string {
    if (assetCache[`img:${assetRelPath}`]) return assetCache[`img:${assetRelPath}`];
    
    const sanitizedPath = assetRelPath.startsWith('/') || assetRelPath.startsWith('\\') 
        ? assetRelPath.substring(1) 
        : assetRelPath;

    const pathsToTry = [
        path.join(ROOT_DIR, 'public', sanitizedPath),
        path.join(SERVER_DIR, 'public', sanitizedPath),
        path.join(ROOT_DIR, '..', 'public', sanitizedPath), // extra fallback
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
    console.error(`[PDF] Failed to load image: ${assetRelPath}. Tried paths:`, pathsToTry);
    return '';
}

const templateCache: Record<string, handlebars.TemplateDelegate> = {};

export async function renderTemplate(templateName: string, data: any): Promise<string> {
    if (templateCache[templateName]) return templateCache[templateName](data);

    const pathsToTry = [
        path.join(SERVER_DIR, 'src', 'templates', `${templateName}.hbs`),
        path.join(ROOT_DIR, 'server', 'src', 'templates', `${templateName}.hbs`),
        path.join(SERVER_DIR, 'templates', `${templateName}.hbs`), // if compiled
    ];

    let templateSource = '';
    for (const p of pathsToTry) {
        try {
            if (existsSync(p)) {
                templateSource = await fs.readFile(p, 'utf-8');
                break;
            }
        } catch (err) {
            continue;
        }
    }

    if (!templateSource) {
        const err = `[PDF] Template not found: ${templateName}. Tried: ${pathsToTry.join(', ')}`;
        console.error(err);
        throw new Error(err);
    }

    const template = handlebars.compile(templateSource);
    templateCache[templateName] = template;

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
    cashData?: any[];
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
    
    // CASH MANAGEMENT TABLE BLOCK (Handlebars Partial Style)
    // DISABLED FOR ADVISORY LETTERS (isAdvisory) to avoid redundancy with the body-injected table
    let cashTableHtml = '';
    if (!isAdvisory && data.cashData && data.cashData.length > 0) {
        const fmt = (n: any) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        cashTableHtml = `
            <div style="margin:20px 0; page-break-inside: avoid;">
                <div style="font-weight:700; font-size:12px; margin-bottom:10px; color:#254aa0; border-bottom: 2px solid #254aa0; padding-bottom: 4px;">CASH MANAGEMENT SUMMARY</div>
                <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:center;">
                    <tr style="background:#f1f5f9;font-weight:700;">
                        <th style="border:1px solid #94a3b8;padding:8px;text-align:left;">PARAMETER</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">${(() => {
                            const prev = data.orgMeta?.compareDates?.yesterday || data.orgMeta?.previousDate;
                            if (prev) return formatDate(prev);
                            const curr = data.orgMeta?.businessDate || data.orgMeta?.date || data.date;
                            if (curr) {
                                const d = new Date(curr);
                                return formatDate(new Date(d.getTime() - 86400000));
                            }
                            return 'N/A';
                        })()}</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">${formatDate(data.orgMeta?.businessDate || data.orgMeta?.date || data.date)}</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">BUDGET / CRL</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">VARIANCE</th>
                        <th style="border:1px solid #94a3b8;padding:8px;">STATUS</th>
                    </tr>
                    ${data.cashData.map((m: any) => {
                        const val = Number(m.val_current || 0);
                        const prev = Number(m.val_y_eod || 0);
                        const budget = Number(m.budget_month || 0);
                        const varVal = val - budget;
                        const isExcess = ['CASH_TOTAL', 'CASH_EXCESS'].includes(m.parameter) && val > budget;
                        const color = isExcess ? '#b91c1c' : '#15803d';
                        return `
                        <tr>
                            <td style="border:1px solid #94a3b8;padding:8px;text-align:left;font-weight:700;">${cleanLabel(m.metadata?.displayName || m.parameter)}</td>
                            <td style="border:1px solid #94a3b8;padding:8px;">₹ ${fmt(prev)} Cr</td>
                            <td style="border:1px solid #94a3b8;padding:8px;font-weight:700;">₹ ${fmt(val)} Cr</td>
                            <td style="border:1px solid #94a3b8;padding:8px;">₹ ${fmt(budget)} Cr</td>
                            <td style="border:1px solid #94a3b8;padding:8px;color:${color};font-weight:700;">${varVal >= 0 ? '+' : ''}${fmt(varVal)} Cr</td>
                            <td style="border:1px solid #94a3b8;padding:8px;color:${color};font-weight:700;">${isExcess ? 'BREACH' : 'OK'}</td>
                        </tr>`;
                    }).join('')}
                </table>
            </div>`;
    }

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

        @page { size: A4; margin: 15.5mm 12.7mm; }
        * { margin: 0; padding: 0; box-sizing: border-box !important; }
        body { font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #1e293b; background: white; line-height: 1.5; -webkit-print-color-adjust: exact; }
        
        .hindi { font-family: 'NotoHindi', sans-serif; line-height: 1.6; }
        .tamil { font-family: 'NotoTamil', sans-serif; line-height: 1.4; font-size: 10px !important; }

        body { background: #fff; }
        .page { width: 100%; position: relative; padding: 0; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.04; pointer-events: none; z-index: -1; }
        .watermark img { width: 420px; }
        .content { position: relative; z-index: 1; display: block; ${isAdvisory ? 'padding-top: 15px;' : ''} }

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
        
        .subject { text-align: center; font-weight: 700; font-size: 18px; text-transform: uppercase; margin: 4px 0; line-height: 1.2; color: black; }
        
        .body { font-size: 15.5px; line-height: 1.4; text-align: left; }
        .body p { margin-bottom: 8px; overflow-wrap: break-word; }
        .body ul, .body ol { padding-left: 20px; margin-bottom: 10px; }
        .body li { margin-bottom: 4px; overflow-wrap: break-word; }
        .body * { word-break: normal; }
        
        .body table { width: 100% !important; table-layout: fixed; border-collapse: collapse; margin: 8px 0; font-size: 14px; }
        .body th, .body td { border: 1px solid #cbd5e1; padding: 3px 6px; vertical-align: top; overflow-wrap: break-word; line-height: 1.25; }
        .body th { background: #f8fafc; font-weight: 700; color: #254aa0; }

        .signatures-container { margin-top: 10px; page-break-inside: avoid; display: block; position: relative; width: 100%; }
        .sig-row { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
        .sig-block { width: 240px; text-align: center; position: relative; padding-top: 35px; }
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
    ${isAdvisory ? '<div class="advisory-badge"><span>⚠️</span> RISK ADVISORY</div>' : ''}
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
            <div style="text-align: right; font-weight: 700;">
                <span class="hindi" style="font-size:12px;">दिनांक</span> / <span class="tamil" style="font-size:9px !important;">தேதி</span> / Date: ${(data as any).orgMeta?.letterDate || data.date}
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
                <tr><td style="line-height:1.6;">Branch: ${data.recipient.branchName || 'Branch'}</td></tr>
                <tr><td style="line-height:1.6;">Branch Code: ${data.recipient.branchCode || ''}</td></tr>
            </table>` : ''}

            ${!data.hideTitle ? `
            <div class="subject">
                <p>${data.title}</p>
                ${data.titleHi ? `<p class="hindi" style="font-size:13.5px; margin-top:2px; color:black;">${data.titleHi}</p>` : ''}
                ${data.titleTa ? `<p class="tamil" style="font-size:10.5px !important; margin-top:2px; color:black;">${data.titleTa}</p>` : ''}
                ${data.subTitle ? `<p style="font-size:14px; color:#1e3a5f; margin-top:4px; font-weight:700;">${data.subTitle}</p>` : ''}
            </div>` : ''}

            ${data.salutation ? `<p style="margin-bottom: 15px; font-weight: 700;">${data.salutation}</p>` : ''}

            ${sanitizedBody}

            ${cashTableHtml}
        </div>

        ${(data.initiator || data.reviewers || data.approver || data.signatoryName) ? `
        <div class="signatures-container">
            ${data.initiator ? `
            <div class="sig-row">
                <div class="sig-block preparer">
                    <div class="signing-space"></div>
                    <div class="sig-line"></div>
                    <div class="sig-name">
                        ${data.initiator.nameHi ? `<span class="hindi">(${data.initiator.nameHi})</span> ` : ''}
                        ${data.initiator.nameTa ? `<span class="tamil">(${data.initiator.nameTa})</span> ` : ''}
                        <span>(${data.initiator.name})</span>
                    </div>
                    <div class="sig-titles">
                        ${data.initiator.titleHi ? `<span class="hindi">${data.initiator.titleHi}</span> / ` : ''}
                        ${data.initiator.titleTa ? `<span class="tamil">${data.initiator.titleTa}</span> / ` : ''}
                        <span>${data.initiator.titleEn}</span>
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
                                ${rev.nameHi ? `<span class="hindi">(${rev.nameHi})</span> ` : ''}
                                ${rev.nameTa ? `<span class="tamil">(${rev.nameTa})</span> ` : ''}
                                <span>(${rev.name})</span>
                            </div>
                            <div class="sig-titles">
                                ${rev.titleHi ? `<span class="hindi">${rev.titleHi}</span> / ` : ''}
                                ${rev.titleTa ? `<span class="tamil">${rev.titleTa}</span> / ` : ''}
                                <span>${rev.titleEn}</span>
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
                        ${(data.approver?.nameHi || data.signatoryNameHi) ? `<span class="hindi">(${data.approver?.nameHi || data.signatoryNameHi})</span> ` : ''}
                        ${(data.approver?.nameTa || data.signatoryNameTa) ? `<span class="tamil">(${data.approver?.nameTa || data.signatoryNameTa})</span> ` : ''}
                        <span>(${data.approver?.name || data.signatoryName || '-'})</span>
                    </div>
                    <div class="sig-titles">
                        ${(data.approver?.titleHi || data.signatoryTitleHi) ? `<span class="hindi">${data.approver?.titleHi || data.signatoryTitleHi}</span> / ` : ''}
                        ${(data.approver?.titleTa || data.signatoryTitleTa) ? `<span class="tamil">${data.approver?.titleTa || data.signatoryTitleTa}</span> / ` : ''}
                        ${(data.approver?.titleEn || data.signatoryTitleEn) ? `<span>${data.approver?.titleEn || data.signatoryTitleEn}</span>` : ''}
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
    if (_browser && _browser.connected) {
        return _browser;
    }
    
    console.log(`[Browser] Launching Puppeteer... (Executable: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'default'})`);
    
    // Launch a new singleton instance
    _browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        headless: 'new' as any,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--font-render-hinting=none',
            '--disable-web-security',
            '--autoplay-policy=user-gesture-required',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-client-side-phishing-detection',
            '--disable-component-update',
            '--disable-default-apps',
            '--disable-domain-reliability',
            '--disable-extensions',
            '--disable-features=AudioServiceOutOfProcess',
            '--disable-hang-monitor',
            '--disable-ipc-flooding-protection',
            '--disable-notifications',
            '--disable-offer-store-unmasked-wallet-cards',
            '--disable-popup-blocking',
            '--disable-print-preview',
            '--disable-prompt-on-repost',
            '--disable-renderer-backgrounding',
            '--disable-speech-api',
            '--disable-sync',
            '--hide-scrollbars',
            '--ignore-gpu-blacklist',
            '--metrics-recording-only',
            '--mute-audio',
            '--no-default-browser-check',
            '--no-first-run',
            '--no-pings',
            '--password-store=basic',
            '--use-gl=swiftshader',
            '--use-mock-keychain'
        ],
        timeout: 60000
    });

    console.log(`[Browser] Puppeteer launched successfully.`);

    // Cleanup singleton on disconnect
    _browser.on('disconnected', () => {
        _browser = null;
    });

    return _browser;
}

export async function generatePDF(html: string, existingBrowser?: any, refNo?: string): Promise<Buffer> {
    const browser = existingBrowser || await getBrowser();
    let page = null;

    try {
        page = await browser.newPage();
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
        // Add timeout to prevent hanging on individual letters
        await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
        
        // CRITICAL: Wait for all fonts (Inter, Noto Hindi, Tamil) to be fully rendered 
        // before capturing the PDF. This fixes "unreadable" or "scrambled" text in Chrome.
        await page.evaluateHandle('document.fonts.ready');
        
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
                bottom: '15.5mm',
                left: '12.7mm'
            }
        });

        return Buffer.from(pdf);
    } finally {
        if (page) await page.close();
        // NEVER close the singleton browser automatically
    }
}

/**
 * Generates structured HTML for Meeting Minutes (MoM).
 * Features a 5-column table and a 3-per-row signature grid.
 */
export function buildMeetingMinutesHtml(data: any, roData: any): string {
    const { committee, dateStr, venue, attendees, minutes, resolvedSignatories } = data;
    
    const attendeesList = Array.isArray(attendees) 
        ? attendees.map((a: any) => typeof a === 'string' ? a : `${a.name} (${a.designation || ''})`).join(', ')
        : 'Nil';

    let minutesHtml = '';
    if (typeof minutes === 'string') {
        minutesHtml = minutes;
    } else if (Array.isArray(minutes)) {
        minutesHtml = minutes.map((m: any) => `
            <div style="margin-bottom: 20px;">
                ${m.content || m.discussion || ''}
            </div>
        `).join('');
    }

    const sigRows = [];
    for (let i = 0; i < resolvedSignatories.length; i += 3) {
        sigRows.push(resolvedSignatories.slice(i, i + 3));
    }

    const sigGridHtml = sigRows.map(row => `
        <div style="display: flex; justify-content: space-between; gap: 40px; margin-bottom: 40px; page-break-inside: avoid;">
            ${row.map((sig: any) => `
                <div style="flex: 1; text-align: center;">
                    <div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 8px;"></div>
                    <div style="font-size: 11px; font-weight: 800; color: #000; text-transform: uppercase;">${sig.name}</div>
                    <div style="font-size: 9px; color: #475569; margin-top: 2px;">${sig.designation || ''}</div>
                </div>
            `).join('')}
            ${row.length < 3 ? `<div style="flex: ${3 - row.length};"></div>` : ''}
        </div>
    `).join('');

    return `
        <style>
            .mom-container { font-family: 'Century Gothic', 'Futura', sans-serif; color: #09090b; }
            .mom-header { border-bottom: 2px solid #254aa0; padding-bottom: 15px; margin-bottom: 25px; }
            .mom-meta-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; font-size: 13px; margin-bottom: 20px; }
            .mom-meta-item { border-left: 3px solid #254aa0; padding-left: 10px; }
            
            .proceedings-container { 
                margin-top: 25px; 
                line-height: 1.6; 
                font-size: 13.5px; 
                text-align: justify;
                color: #1e293b;
            }
            .proceedings-container p { margin-bottom: 12px; }
            .proceedings-container ul, .proceedings-container ol { margin-left: 20px; margin-bottom: 15px; }

            .attendees-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 12px; margin: 15px 0; font-size: 12.5px; }
        </style>

        <div class="mom-container">
            <div class="formal-header">
                <div class="header-content">
                    <div class="bank-info">
                        <div class="bank-name-ta">${roData.bankNameTa}</div>
                        <div class="bank-name-hi">${roData.bankNameHi}</div>
                        <div class="bank-name-en">${roData.bankNameEn}</div>
                        <div class="office-info">
                            ${roData.officeNameEn} / ${roData.officeNameTa}<br>
                            ${roData.addressEn} | Ph: ${roData.phone}<br>
                            Email: ${roData.email}
                        </div>
                    </div>
                    <div>
                        <img src="${imageToBase64('assets/2025_new_logo.svg')}" style="height: 65px;" />
                    </div>
                </div>
            </div>

            <div class="mom-title-box">
                <div class="mom-title">MINUTES OF MEETING (PROCEEDINGS)</div>
                <div class="committee-title">${committee?.nameEn || 'COMMITTEE MEETING'}</div>
            </div>

            <div class="mom-meta-grid">
                <div class="meta-item"><strong>DATE:</strong> ${dateStr}</div>
                <div class="meta-item"><strong>VENUE:</strong> ${venue || 'Regional Office'}</div>
            </div>

            <div class="attendees-box">
                <div style="font-weight: 900; text-decoration: underline; margin-bottom: 5px;">OFFICIALS PRESENT:</div>
                ${attendeesList}
            </div>

            <div class="proceedings-container">
                <div style="font-weight: 900; text-decoration: underline; margin-bottom: 15px;">THE BRIEF / PROCEEDINGS:</div>
                ${minutesHtml}
            </div>

            <div style="margin-top: 60px; page-break-inside: avoid;">
                <div style="font-size: 11px; font-weight: 900; margin-bottom: 25px; border-bottom: 1.5px solid #000; padding-bottom: 5px;">SIGNATURES:</div>
                ${sigGridHtml}
            </div>
            
            <div style="margin-top: 40px; font-size: 8px; color: #94a3b8; text-align: center;">
                --- Confirmed Regional Record (Computer Generated) ---
            </div>
        </div>
    `;
}

/**
 * Generates a formal Branch Request Form for High Value Demand Drafts.
 * This is a specialized 'Branch to RO' document.
 */
export function buildDDRequestFormHtml(content: any, branch: any, roData: any, date: string): string {
    const fmt = (n: any) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const formatDate = (dStr: any) => {
        if (!dStr) return '-';
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return '-';
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    };

    const amountInWords = content.amount ? `[Amount in Words: Rupee ${content.amount}]` : '';

    return `
        <style>
            .dd-form-container { font-family: 'Century Gothic', 'Futura', sans-serif; color: #000; }
            .request-header { margin-bottom: 15px; border-bottom: 2px solid #21357f; padding-bottom: 10px; }
            .letterhead-info { font-size: 13.5px; color: #1e293b; line-height: 1.4; }
            .request-title { text-align: center; font-weight: 800; font-size: 18px; text-transform: uppercase; margin: 15px 0; color: #1e3a5f; text-decoration: underline; }
            
            .particulars-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 14.5px; }
            .particulars-table td { border: 1.2px solid #94a3b8; padding: 3px 8px; vertical-align: top; line-height: 1.2; }
            .particulars-table .label { width: 42%; font-weight: 700; background-color: #f8fafc; color: #334155; }
            .particulars-table .value { width: 58%; font-weight: 700; color: #000; }
            
            .declaration { margin-top: 15px; font-size: 14.5px; line-height: 1.5; text-align: justify; padding: 12px; background: #f8fafc; border-left: 5px solid #21357f; }
            
            .branch-footer { margin-top: 35px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .sig-area { text-align: center; }
            .sig-line { border-top: 1.2px solid #000; margin-top: 45px; width: 190px; margin-left: auto; margin-right: auto; }
            .sig-label { font-size: 11.5px; font-weight: 800; color: #21357f; margin-top: 6px; text-transform: uppercase; }
        </style>

        <div class="dd-form-container">
            <div class="request-header">
                <div style="display: flex; justify-content: center; margin-bottom: 12px;">
                    <img src="${imageToBase64('assets/2025_new_logo.svg')}" style="height: 52px;" />
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div class="letterhead-info">
                        <div style="font-weight: 700; color: #21357f;">Branch Code: <span style="font-weight: 400; color: #000;">${branch?.code || content.branchSol || ''}</span></div>
                        <div style="font-weight: 700; color: #21357f; margin-top: 3px;">Branch: <span style="font-weight: 400; color: #000;">${branch?.nameEn || ''}</span></div>
                        <div style="font-weight: 700; color: #21357f; margin-top: 3px;">Date: <span style="font-weight: 400; color: #000;">${date || ''}</span></div>
                    </div>
                    <div style="text-align: right; font-size: 14.5px;">
                        <div style="font-weight: 800;">To,</div>
                        <div style="font-weight: 700;">The Chief Manager,</div>
                        <div style="font-weight: 800; color: #21357f;">Planning Department</div>
                        <div>Regional Office Dindigul</div>
                    </div>
                </div>
            </div>

            <div class="request-title">
                <div>DRAFT RECOMMENDATION FOR HIGH VALUE DD</div>
            </div>

            <p style="font-size: 15px; margin-bottom: 10px; font-weight: 700;">Sir/Madam,</p>
            <p style="font-size: 14.5px; line-height: 1.5; margin-bottom: 15px; text-align: justify;">
                We recommend for your kind approval, the issuance of a High Value Demand Draft as per the details provided below. We have scrutinized the request and confirmed that all internal guidelines and KYC norms are satisfied.
            </p>

            <table class="particulars-table">
                <tr><td class="label">Name of Applicant</td><td class="value">${content.applicantName || ''}</td></tr>
                <tr><td class="label">Applicant Account No.</td><td class="value">${content.applicantAccount || ''}</td></tr>
                <tr><td class="label">Beneficiary Name</td><td class="value">${content.beneficiaryName || ''}</td></tr>
                <tr><td class="label">Payable at (Bank/Branch)</td><td class="value">${content.ddDrawnOn || ''}</td></tr>
                <tr><td class="label">Amount of Draft</td><td class="value" style="font-size: 16px;">${content.amount ? `₹ ${fmt(content.amount)}` : ''}</td></tr>
                <tr><td class="label">Purpose of Transaction</td><td class="value">${content.purpose || ''}</td></tr>
                <tr><td class="label">Compliance of KYC Norms</td><td class="value">${content.kycCompliance || 'YES'}</td></tr>
                <tr><td class="label">Transaction ID (Finacle)</td><td class="value">${content.transactionId || ''}</td></tr>
                <tr><td class="label">Proposed Date of Issue</td><td class="value">${content.dateOfIssue ? formatDate(content.dateOfIssue) : ''}</td></tr>
            </table>

            <div class="declaration">
                We certify that the above transaction is from a known customer and the source of funds is verified. The transaction does not violate any AML/CFT guidelines of the Bank / RBI. We request you to authorize the entry in Finacle using <b>HHVDD</b> menu.
            </div>

            <div style="margin-top: 45px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="text-align: center; width: 42%;">
                        <div style="height: 55px; border-bottom: 1.5px solid #000;"></div>
                        <div style="padding-top: 10px; font-size: 12.5px; font-weight: 800; color: #21357f; text-transform: uppercase;">INITIATOR</div>
                    </div>
                    <div style="text-align: center; width: 42%;">
                        <div style="height: 55px; border-bottom: 1.5px solid #000;"></div>
                        <div style="padding-top: 10px; font-size: 12.5px; font-weight: 800; color: #21357f; text-transform: uppercase;">BRANCH HEAD</div>
                        <div style="font-size: 9.5px; margin-top: 3px; color: #64748b;">[Branch Seal]</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function buildLetterBodyHtml(contentEn: string, org: any, letter?: any): string {
    const branchType = org.branch?.type || org.branchType || '';
    const branchCode = org.branch?.code || org.branchCode || '';
    const isRegional = ['RO', 'LPC', 'REGIONAL OFFICE'].includes(branchType.toUpperCase()) || branchCode === '3933';
    
    // Aggregate data source: prefer performanceDataList, fallback to performanceData
    const pdList = org.performanceDataList || [];
    const singlePd = org.performanceData;
    const dataList = pdList.length > 0 ? pdList : (singlePd ? [singlePd] : []);

    // Filter out the "Dear Sir/Madam" and "To," if they are manually placed at the start of content
    const cleanedContent = contentEn
        .replace(/^To,?\s*/gi, '')
        .replace(/^The Branch Manager[\s\S]*?\n\n/gi, '') // Prune legacy address blocks
        .replace(/^Dear (Sir|Madam|Sir\/Madam),?\s*/gi, '')
        .trim();

    const paragraphs = cleanedContent.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
    let bodyHtml = '';
    
    // 1. Add Trilingual Body Blocks for Manual/Custom Letters
    if (letter?.contentHi) {
        bodyHtml += `<div class="hindi" style="font-size: 13.5px; margin-bottom: 12px; text-align: justify;">${letter.contentHi.replace(/\n/g, '<br/>')}</div>`;
    }
    if (letter?.contentTa) {
        bodyHtml += `<div class="tamil" style="font-size: 11.5px; margin-bottom: 12px; text-align: justify;">${letter.contentTa.replace(/\n/g, '<br/>')}</div>`;
    }

    const fmt = (n: number) => (n || 0).toFixed(2);

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
                const unitLabel = showCurrency ? (isRegional ? 'Cr' : 'L') : (item.unit || '');

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
                    <div style="font-weight:700; font-size:13.5px; margin-bottom:10px; color:#254aa0; text-transform:uppercase;">KPI: ${item.parameter || 'Performance Metric'}</div>
                    <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:center;">
                        <tr style="background:#f1f5f9;font-weight:700;">
                            <th style="border:1px solid #94a3b8;padding:4px;">OB (${formatDate(item.march31stDate)})</th>
                            <th style="border:1px solid #94a3b8;padding:4px;">Latest (${formatDate(item.latestDate)})</th>
                            <th style="border:1px solid #94a3b8;padding:4px;">FY Growth</th>
                            <th style="border:1px solid #94a3b8;padding:4px;">Target Budget</th>
                            <th style="border:1px solid #94a3b8;padding:4px;">Gap to Budget</th>
                            <th style="border:1px solid #94a3b8;padding:4px;">Status</th>
                        </tr>
                        <tr>
                            <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;">${showCurrency ? '₹ ' : ''}${fmt(getScaledVal(item.march31st))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;font-weight:700;color:#1e293b;">${showCurrency ? '₹ ' : ''}${fmt(getScaledVal(item.latest))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;font-weight:700;color:${forceInverted ? (fyGrowth <= 0 ? '#15803d' : '#b91c1c') : (fyGrowth >= 0 ? '#15803d' : '#b91c1c')}">${fyGrowth > 0 ? '+' : ''}${showCurrency ? '₹ ' : ''}${fmt(getScaledVal(fyGrowth))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;">${showCurrency ? '₹ ' : ''}${fmt(getScaledVal(item.budget))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;font-weight:700;color:${gapColor}">${item.gap >= 0 ? '+' : ''}${showCurrency ? '₹ ' : ''}${fmt(Math.abs(getScaledVal(item.gap)))} ${unitLabel}</td>
                            <td style="border:1px solid #94a3b8;padding:4px 6px;font-weight:700;color:${statusColor};font-size:10px;">${statusLabel}</td>
                        </tr>
                    </table>
                </div>`;
            }
        } else if (para.includes('[EXCEPTION_TABLE]') && org.exceptions) {
            bodyHtml += `
            <div style="margin:25px 0;">
                <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left;">
                    <tr style="background:#f1f5f9;font-weight:700;">
                        <th style="border:1px solid #94a3b8;padding:6px;width:130px;">RULE ID</th>
                        <th style="border:1px solid #94a3b8;padding:6px;width:140px;">PARAMETER</th>
                        <th style="border:1px solid #94a3b8;padding:6px;">OBSERVATION / EXCEPTION</th>
                    </tr>
                    ${(org.exceptions || []).length > 0 ? (org.exceptions || []).map((ex: any) => `
                    <tr>
                        <td style="border:1px solid #94a3b8;padding:4px 6px;font-family:monospace;font-size:10px;">${ex.ruleId || 'N/A'}</td>
                        <td style="border:1px solid #94a3b8;padding:4px 6px;font-weight:700;">${ex.parameter || 'N/A'}</td>
                        <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:justify;">${ex.message || 'N/A'}</td>
                    </tr>`).join('') : `
                    <tr>
                        <td colspan="3" style="border:1px solid #94a3b8;padding:8px;text-align:center;font-style:italic;color:#64748b;">
                            NIL - No significant operational risk exceptions flagged for the period.
                        </td>
                    </tr>`}
                </table>
            </div>`;
        } else if (para.includes('[MOVEMENT_TABLE]') && org.dailyMovement) {
            const scale = isRegional ? 1 : 100;
            const unitLabel = isRegional ? 'Cr' : 'L';
            
            const cdRatioMetric = (org.dailyMovement || []).find((m: any) => m.metricKey === 'CDRatio');
            const otherMovements = (org.dailyMovement || []).filter((m: any) => m.metricKey !== 'CDRatio');

            const categories = [
                { id: 'KBP', label: 'TREND POSITION: KEY BUSINESS PARAMETERS' },
                { id: 'DEPOSITS', label: 'TREND POSITION: DEPOSITS ENTRUSTMENT' },
                { id: 'CORE', label: 'TREND POSITION: CORE ADVANCES AND GOLD LOANS' },
                { id: 'ASSET_QUALITY', label: 'TREND POSITION: ASSET QUALITY' },
                { id: 'PROFITABILITY', label: 'TREND POSITION: PROFITABILITY AND EFFICIENCY' },
                { id: 'CASH', label: 'TREND POSITION: CASH MANAGEMENT' }
            ].filter(cat => letter.type !== 'OP_RISK' || cat.id !== 'CASH');

            const profit = (otherMovements || []).find((m: any) => m.metricKey === 'Profit');
            const cdRatio = (otherMovements || []).find((m: any) => m.metricKey === 'CD_Ratio' || m.metricKey === 'CDRatio');

            for (const cat of categories) {
                // Show a mini assessment box for Profit next to CD Ratio if we are at the top
                if (cat.id === 'KBP') {
                    if (profit) {
                        const breached = !!profit.breached;
                        const color = breached ? '#b91c1c' : '#1d4ed8'; // Blue for positive profit
                        const label = profit.latestValue >= 0 ? 'NET PROFIT' : 'NET LOSS';
                        const icon = profit.latestValue >= 0 ? '✓' : '⚠';

                        // Context-aware CD Ratio Thresholds (User Policy Directive)
                        const cdr = cdRatioMetric?.latestValue || 0;
                        const popGroup = ((org as any).populationGroup || '').toUpperCase();
                        const isRuralSemi = popGroup.includes('RURAL') || popGroup.includes('SEMI-URBAN');
                        const minTarget = isRuralSemi ? 60 : 70;
                        const healthyMin = 70;
                        const healthyMax = 80;
                        
                        let cdrStatus = 'WITHIN RANGE';
                        let cdrColor = '#15803d';
                        
                        if (cdr < minTarget) {
                            cdrStatus = 'BELOW TARGET';
                            cdrColor = '#b91c1c';
                        } else if (cdr > 85) {
                            cdrStatus = 'SATURATION RISK';
                            cdrColor = '#b91c1c';
                        } else if (cdr >= healthyMin && cdr <= healthyMax) {
                            cdrStatus = 'HEALTHY RANGE';
                            cdrColor = '#15803d';
                        }

                        const targetLabel = isRuralSemi ? 'Policy Target: 60%+' : 'Target: 70%+';
                        const industryNote = 'Industry Healthy: 70-80%';

                        bodyHtml += `
                        <div style="display:flex; gap:12px; margin-bottom:15px;">
                            <div style="flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:10px; background:#f8fafc;">
                                <div style="font-size:10px; color:#64748b; text-transform:uppercase; margin-bottom:4px; font-weight:700;">Liquidity Risk Summary (CD Ratio)</div>
                                <div style="font-size:17px; font-weight:700; color:#1e293b; line-height:1;">${fmt(cdr)}%</div>
                                <div style="font-size:9px; color:#64748b; margin-top:4px;">${targetLabel} | Status: <span style="color:${cdrColor}; font-weight:700;">${cdrStatus}</span></div>
                                <div style="font-size:8px; color:#94a3b8; margin-top:2px;">${industryNote} / No RBI Statutory Mandate</div>
                            </div>
                            <div style="flex:1; border:1px solid ${profit.latestValue >= 0 ? '#e2e8f0' : '#fda4af'}; border-radius:8px; padding:10px; background:${profit.latestValue >= 0 ? '#f0f9ff' : '#fff1f2'};">
                                <div style="font-size:10px; color:#64748b; text-transform:uppercase; margin-bottom:4px; font-weight:700;">Profitability Position (${label})</div>
                                <div style="font-size:17px; font-weight:700; color:${color}; line-height:1;">${icon} ₹ ${fmt(profit.latestValue * scale)} ${unitLabel}</div>
                                <div style="font-size:9px; color:#64748b; margin-top:4px;">Status: <span style="font-weight:700; color:${color};">${profit.latestValue >= 0 ? 'FAVORABLE' : 'ACTION REQUIRED (LOSS)'}</span></div>
                                ${profit.latestValue < 0 ? `
                                <div style="font-size:8px; font-weight:700; color:#b91c1c; margin-top:4px; border-top:1px dashed #fda4af; padding-top:4px; text-transform:uppercase;">
                                    <span class="hindi">हानि दर्ज की गई</span> / <span class="tamil">நஷ்டம் கண்டறியப்பட்டது</span> / LOSS DETECTED
                                </div>` : ''}
                            </div>
                        </div>`;
                    }
                }

                const catMovements = (otherMovements || []).filter((m: any) => m.category === cat.id);
                if (catMovements.length === 0) continue;

                const pageBreak = ''; // Removed forced page-break-before: always to prevent blank page 2
                bodyHtml += `
                <div style="margin:25px 0; ${pageBreak}">
                    <div style="font-weight:700; font-size:14px; margin-bottom:12px; color:#254aa0; border-bottom: 2px solid #254aa0; padding-bottom: 6px;">${cat.label}</div>
                    <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:center;">
                        <tr style="background:#f1f5f9;font-weight:700;font-size:11.5px;">
                            <th style="border:1px solid #94a3b8;padding:4px 6px;text-align:left;white-space:nowrap;">KBP</th>
                            <th style="border:1px solid #94a3b8;padding:4px 6px;white-space:nowrap;">${(() => {
                                if (cat.id === 'CASH') return 'AUTHORIZED CRL';
                                const prev = org.compareDates?.yesterday || org.previousDate;
                                if (prev) return formatDate(prev);
                                // Fallback: Subtract 1 day from current date
                                const curr = org.businessDate || org.date;
                                if (curr) {
                                    const d = new Date(curr);
                                    return formatDate(new Date(d.getTime() - 86400000));
                                }
                                return 'N/A';
                            })()}</th>
                            <th style="border:1px solid #94a3b8;padding:4px 6px;white-space:nowrap;">${formatDate(org.compareDates?.latest || org.businessDate || org.date)}</th>
                            <th style="border:1px solid #94a3b8;padding:4px 6px;white-space:nowrap;">${cat.id === 'CASH' ? 'EXCESS / (SHORTFALL)' : 'MOVEMENT'}</th>
                            <th style="border:1px solid #94a3b8;padding:4px 6px;">% CHANGE</th>
                            <th style="border:1px solid #94a3b8;padding:4px 6px;">THRESHOLD</th>
                            <th style="border:1px solid #94a3b8;padding:4px 6px;">STATUS</th>
                        </tr>
                        ${catMovements.map((m: any) => {
                            const breached = !!m.breached;
                            const color = breached ? '#b91c1c' : '#15803d';
                            
                            // Determine if this is a percentage/ratio metric (e.g. CASA%)
                            const name = (m.parameter || '').toUpperCase();
                            const isRatio = name.includes('%') || name.includes('RATIO') || name.includes('CASA%');
                            
                            const thresholdLabel = typeof m.thresholdPct === 'number' ? `+/- ${fmt(m.thresholdPct)}%` : '-';
                            const prevDisp = isRatio ? `${fmt(m.previousValue)}%` : `${fmt(m.previousValue * scale)} ${unitLabel}`;
                            const latestDisp = isRatio ? `${fmt(m.latestValue)}%` : `${fmt(m.latestValue * scale)} ${unitLabel}`;
                            
                            // Hide movement/pct for ratios to avoid confusion (they use static thresholds)
                            const moveDisp = isRatio ? '-' : `${m.movement >= 0 ? '+' : ''}${fmt(m.movement * scale)} ${unitLabel}`;
                            const pctDisp = isRatio ? '-' : `${fmt(m.pct)}%`;

                            const displayName = cleanLabel(m.metadata?.displayName || m.parameter || 'N/A').replace('Operating Profit (Loss)', 'Profit');

                            return `
                            <tr>
                                <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:left;font-weight:700;">${displayName}</td>
                                <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;">${prevDisp}</td>
                                <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;font-weight:700;">${latestDisp}</td>
                                <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;color:${color};font-weight:700;">${moveDisp}</td>
                                <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;color:${color};font-weight:700;">${pctDisp}</td>
                                <td style="border:1px solid #94a3b8;padding:4px 6px;text-align:right;font-weight:700;">${thresholdLabel}</td>
                                <td style="border: 1px solid #cbd5e1; padding: 3px 6px; text-align: center; font-weight: 700; color: ${breached ? '#b91c1c' : '#166534'}; font-size: 9px; white-space: nowrap;">${breached ? 'BREACH' : 'WITHIN LIMIT'}</td>
                            </tr>`;
                        }).join('')}
                    </table>
                </div>`;
            }
        } else if (para.trim().startsWith('<') || para.trim().includes('</table>') || para.trim().includes('</div>')) {
            bodyHtml += para;
        } else {
            bodyHtml += `<p style="margin-bottom:8px;text-align:justify;">${para.replace(/\n/g, '<br/>')}</p>`;
        }
    }

    return bodyHtml;
}
