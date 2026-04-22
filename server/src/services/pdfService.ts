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
    // Cache disabled for iterative development to ensure template changes reflect immediately
    // if (templateCache[templateName]) return templateCache[templateName](data);

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
        officeNameEn: ro?.nameEn || 'Dindigul',
        officeNameHi: ro?.nameHi || 'डिंडीगुल',
        officeNameTa: ro?.nameTa || 'திண்டுக்கல்',
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
    letterCategory?: 'APPRECIATION' | 'EXPLANATION' | string;
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
    isLetter?: boolean;
    hideHeader?: boolean;
    hideMeta?: boolean;
    hideTitle?: boolean;
    hideApprovedStatus?: boolean;
    initiator?: { name: string, nameTa?: string, nameHi?: string, titleEn: string, titleTa?: string, titleHi?: string };
    reviewers?: { name: string, nameTa?: string, nameHi?: string, titleEn: string, titleTa?: string, titleHi?: string }[];
    approver?: { name: string, nameTa?: string, nameHi?: string, titleEn: string, titleTa?: string, titleHi?: string };
    orgMeta?: any;
    cashData?: any[];
    meetingStatus?: 'DRAFT' | 'FINAL';
}

export function buildPremiumLayout(data: PremiumLayoutData): string {
    try {
        const isAdvisory = data.isAdvisory || false;
        const org = data.organization || {
            bankNameEn: 'Indian Overseas Bank', bankNameHi: 'इंडियन ओवरसीज बैंक', bankNameTa: 'இந்தியன் ஓவர்சீஸ் வங்கி',
            officeNameEn: 'Regional Office, Dindigul', officeNameHi: 'क्षेत्रीय कार्यालय, डिंडीगुल', officeNameTa: 'மண்டல அலுவலகம், திண்டுக்கல்',
            addressEn: 'Regional Office, 123 Madurai Road, Dindigul - 624001, Tamil Nadu',
            addressHi: 'क्षेत्रीय कार्यालय, 123 मदुरै रोड, डिंडीगुल - 624001, तमिलनाडु',
            addressTa: 'மண்டல அலுவலகம், 123 மதுரை ரோடு, திண்டுக்கல் - 624001, தமிழ்நாடு',
            phone: '+91 451 2420000', email: 'ro.dindigul@bank.com'
        };

        const interRegular = fontToBase64('inter-400.ttf') || '';
        const interBold = fontToBase64('inter-700.ttf') || '';
        const notoHindi400 = fontToBase64('noto-hindi-400.ttf') || '';
        const notoHindi700 = fontToBase64('noto-hindi-700.ttf') || '';
        const notoTamil400 = fontToBase64('noto-tamil-400.ttf') || '';
        const notoTamil700 = fontToBase64('noto-tamil-700.ttf') || '';

        const emblemSrc = imageToBase64('assets/logo_center.svg') || '';

        const rawBody = data.bodyHtml || '';
        const hasHtml = /<(p|div|table|br)/i.test(rawBody);
        
        const htmlContent = rawBody
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, hasHtml ? '\n\n' : '<br/><br/>')
            .replace(/\n/g, hasHtml ? '\n' : '<br/>');
        
        // CRITICAL: Allow 'style' tag so meeting minutes CSS works
        const sanitizedBody = sanitizeHtmlForPrint(DOMPurify.sanitize(htmlContent, { 
            ADD_ATTR: ['style', 'cellspacing', 'cellpadding'],
            ADD_TAGS: ['table', 'tbody', 'tr', 'td', 'span', 'b', 'strong', 'i', 'p', 'br', 'div', 'style']
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
            body { font-family: 'Inter', Arial, sans-serif; font-size: 13.5px; color: #111827; background: white; line-height: 1.5; -webkit-print-color-adjust: exact; }
            
            .content { position: relative; z-index: 1; display: block; ${isAdvisory ? 'padding-top: 5px;' : ''} ${data.isLetter ? 'padding-top: 15px;' : ''} }
            .header { width: 100%; border-bottom: 1.8pt solid #1e3a8a !important; padding-bottom: 10px; margin-bottom: 15px; }
            .header-top { display: flex; align-items: center; gap: 20px; margin-bottom: 12px; }
            .header-top img { height: 82px; width: 82px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); }
            .bank-names h1 { color: #1e3a8a; line-height: 1.15; font-weight: 900; font-size: 22px; margin: 0; letter-spacing: -0.2px; }
            .hindi { font-family: 'NotoHindi', sans-serif; font-weight: 800; font-size: 19px; }
            .tamil { font-family: 'NotoTamil', sans-serif; font-size: 17px; font-weight: 800; }

            .col-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; width: 100%; color: #334155; margin-top: 15px; border-top: 0.8pt solid #e2e8f0; padding-top: 12px; }
            .col { padding: 0 8px; border-left: 0.8pt solid #e2e8f0; text-align: center; }
            .col:first-child { border-left: none; padding-left: 0; }
            .col-name { font-weight: 900; font-size: 11.5px; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; white-space: nowrap; letter-spacing: 0.3px; }
            .col-addr { font-size: 10px; line-height: 1.45; color: #475569; font-weight: 500; }

            .contact-row { display: flex; justify-content: center; gap: 25px; width: 100%; margin-top: 15px; padding-top: 12px; border-top: 0.5pt dashed #cbd5e1; font-size: 13px; color: #0f172a; }
            .contact-item { display: flex; items-center: center; gap: 6px; }
            .contact-label { font-weight: 900; color: #1e3a8a; font-size: 13px; }

            .meta-info { display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: 800; font-size: 13px; color: #1e293b; padding: 0 2px; }
            .subject { text-align: center; font-weight: 900; font-size: 18.5px; text-transform: uppercase; margin: 10px 0 15px 0; color: #000; border-bottom: 2pt solid #000; display: block; padding-bottom: 4px; letter-spacing: 0.5px; }
            
            .signatures-container { margin-top: 10px; page-break-inside: avoid; width: 100%; border-top: 1pt solid #1e3a8a; padding-top: 15px; }
            
            /* Status Seals - High Fidelity Glossy Style */
            .status-seal-container { position: absolute; top: 25px; right: 25px; width: 85px; height: 85px; z-index: 100; }
            .status-seal { 
                width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
                text-align: center; font-weight: 900; color: #fff; font-size: 11px; border: 3px solid rgba(255,255,255,0.7); 
                box-shadow: 0 15px 35px -5px rgba(0, 0, 0, 0.25), inset 0 0 15px rgba(0,0,0,0.1); 
                text-transform: uppercase; line-height: 1.1; border-radius: 50%; outline: 1px solid rgba(0,0,0,0.1);
            }
            .seal-appreciation { 
                background: radial-gradient(circle at 30% 30%, #22c55e, #14532d); 
                border-color: #fcd34d;
                box-shadow: 0 0 0 1.5pt #14532d, 0 15px 35px -5px rgba(20, 83, 45, 0.4);
            }
            .seal-explanation { 
                background: radial-gradient(circle at 30% 30%, #ef4444, #7f1d1d);
                border-color: #fecaca;
                box-shadow: 0 0 0 1.5pt #7f1d1d, 0 15px 35px -5px rgba(127, 29, 29, 0.4);
            }
            .seal-icon { font-size: 28px; margin-bottom: 4px; line-height: 1; display: flex; align-items: center; justify-content: center; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
            .seal-text { font-size: 8px; font-weight: 950; letter-spacing: 0.8px; opacity: 1; margin-top: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.2); }
            
            .alert-symbol { width: 5px; height: 20px; background: #fff; border-radius: 4px; position: relative; margin-bottom: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .alert-symbol::after { content: ''; position: absolute; bottom: -7px; left: 0; width: 5px; height: 5px; background: #fff; border-radius: 50%; }
        </style>`;

        const addrEn = (org.addressEn || '').replace('Pensioner Street,', 'Pensioner Street,<br/>');
        const addrHi = (org.addressHi || '').replace('पेंशनर स्ट्रीट,', 'पेंशनर स्ट्रीट,<br/>');
        const addrTa = (org.addressTa || '').replace('பென்ஷனர் தெரு,', 'பென்ஷனர் தெரு,<br/>');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    ${pdfStyles}
</head>
<body>
    <div class="page">
        <div class="content">
            ${(data.letterCategory || data.meetingStatus) ? `
                <div class="status-seal-container">
                    ${data.letterCategory === 'APPRECIATION' ? `
                        <div class="status-seal seal-appreciation">
                            <div class="seal-icon">🏆</div>
                            <div class="seal-text">EXCELLENCE</div>
                        </div>
                    ` : data.letterCategory === 'EXPLANATION' ? `
                        <div class="status-seal seal-explanation">
                            <div class="seal-icon"><div class="alert-symbol"></div></div>
                            <div class="seal-text">ATTN REQD</div>
                        </div>
                    ` : data.meetingStatus === 'FINAL' ? `
                        <div class="status-seal seal-appreciation" style="background: radial-gradient(circle at 30% 30%, #1e3a8a, #1e1b4b); border-color: #cbd5e1;">
                            <div class="seal-icon">📜</div>
                            <div class="seal-text">MINUTES FINALIZED</div>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
            ${data.hideHeader ? '' : `
            <div class="header">
                <div class="header-top">
                    <img src="${emblemSrc}" alt="Logo"/>
                    <div class="bank-names">
                        <h1 class="hindi">${org.bankNameHi}</h1>
                        <h1 class="tamil">${org.bankNameTa}</h1>
                        <h1>${org.bankNameEn}</h1>
                    </div>
                </div>
                <div class="col-grid">
                    <div class="col">
                        <div class="col-name hindi">${org.officeNameHi}</div>
                        <div class="col-addr hindi">${addrHi}</div>
                    </div>
                    <div class="col">
                        <div class="col-name tamil">${org.officeNameTa}</div>
                        <div class="col-addr tamil">${addrTa}</div>
                    </div>
                    <div class="col">
                        <div class="col-name">${org.officeNameEn}</div>
                        <div class="col-addr">${addrEn}</div>
                    </div>
                </div>
                <div class="contact-row">
                    <div class="contact-item"><span class="contact-label">Email:</span> ${org.email}</div>
                    <div class="contact-item"><span class="contact-label">Phone:</span> ${org.phone}</div>
                    <div class="contact-item"><span class="contact-label">Website:</span> www.iob.in</div>
                </div>
            </div>`}

            <div class="meta-info" style="margin-top: 15px;">
                <div>Ref No: ${data.refNo || ''}</div>
                <div>Date: ${data.date || ''}</div>
            </div>

            <div class="body">
                ${sanitizedBody}
            </div>

            ${!data.hideMeta ? `
            <div class="signatures-container">
                <div class="sig-row">
                    ${data.initiator ? `<div class="sig-block">
                        <div class="sig-titles" style="text-transform:uppercase;margin-bottom:15px;">
                            <span class="hindi" style="font-size: 8px;">आरंभकर्ता</span> / <span class="tamil" style="font-size: 8px;">தொடங்கியவர்</span> / Initiated By
                        </div>
                        <div class="sig-name">Sd/-</div><div class="sig-line"></div>
                        <div class="sig-name">
                            <span class="hindi" style="font-size: 10px;">(${data.initiator.nameHi || ''})</span> 
                            / <span class="tamil" style="font-size: 9px;">(${data.initiator.nameTa || ''})</span> 
                            <br/>
                            (${data.initiator.name || ''})
                        </div>
                        <div class="sig-titles">
                            <span class="hindi" style="font-size: 9px;">${data.initiator.titleHi || ''}</span> 
                            / <span class="tamil" style="font-size: 8px;">${data.initiator.titleTa || ''}</span> 
                            <br/>
                            ${data.initiator.titleEn || ''}
                        </div>
                    </div>` : ''}
                    
                    ${(data.reviewers || []).map(rev => `
                        <div class="sig-block">
                            <div class="sig-titles" style="text-transform:uppercase;margin-bottom:15px;">
                                <span class="hindi" style="font-size: 8px;">समीक्षित</span> / <span class="tamil" style="font-size: 8px;">மதிப்பாய்வு செய்யப்பட்டது</span> / Reviewed By
                            </div>
                            <div class="sig-name">Sd/-</div><div class="sig-line"></div>
                            <div class="sig-name">
                                <span class="hindi" style="font-size: 10px;">(${rev.nameHi || ''})</span> 
                                / <span class="tamil" style="font-size: 9px;">(${rev.nameTa || ''})</span> 
                                <br/>
                                (${rev.name || ''})
                            </div>
                            <div class="sig-titles">
                                <span class="hindi" style="font-size: 9px;">${rev.titleHi || ''}</span> 
                                / <span class="tamil" style="font-size: 8px;">${rev.titleTa || ''}</span> 
                                <br/>
                                ${rev.titleEn || ''}
                            </div>
                        </div>`).join('')}

                    <div class="sig-block">
                        ${(data.isBudget || data.hideApprovedStatus) ? '' : `<div style="color:#1e3a8a;font-weight:800;font-size:10px;margin-bottom:20px;">अनुमोदित / Approved</div>`}
                        <div class="sig-name">Sd/-</div><div class="sig-line"></div>
                        <div class="sig-name">
                            <span class="hindi" style="font-size: 10px;">(${data.approver?.nameHi || data.signatoryNameHi || ''})</span> 
                            / <span class="tamil" style="font-size: 9px;">(${data.approver?.nameTa || data.signatoryNameTa || ''})</span> 
                            <br/>
                            (${data.approver?.name || data.signatoryName || '-'})
                        </div>
                        <div class="sig-titles">
                            <span class="hindi" style="font-size: 9px;">${data.approver?.titleHi || data.signatoryTitleHi || ''}</span> 
                            / <span class="tamil" style="font-size: 8px;">${data.approver?.titleTa || data.signatoryTitleTa || ''}</span> 
                            <br/>
                            ${data.approver?.titleEn || data.signatoryTitleEn || ''}
                        </div>
                    </div>
                </div>
            </div>` : ''}
        </div>
    </div>
</body>
</html>`;
    } catch (err: any) {
        console.error('[PDF] buildPremiumLayout CRASH:', err);
        return `<html><body><h1>Layout Generation Failed</h1><pre>${err.message}</pre></body></html>`;
    }
}

export async function getBrowser() {
    if (_browser && _browser.connected) { return _browser; }
    _browser = await puppeteer.launch({
        headless: 'new' as any,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
        timeout: 60000
    });
    return _browser;
}

export async function generatePDF(html: string, existingBrowser?: any, refNo?: string): Promise<Buffer> {
    const browser = existingBrowser || await getBrowser();
    let page = null;
    try {
        page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
        await page.evaluateHandle('document.fonts.ready');
        await page.emulateMediaType('print');
        const pdf = await page.pdf({
            format: 'A4', printBackground: true, displayHeaderFooter: true,
            headerTemplate: `<div style="font-size:9px;width:100%;text-align:right;margin-right:12.7mm;margin-top:5mm;color:#64748b;">${refNo || ''} | Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
            footerTemplate: '<div style="font-size:1px;"></div>',
            margin: { top: '15.5mm', right: '12.7mm', bottom: '15.5mm', left: '12.7mm' }
        });
        return Buffer.from(pdf);
    } finally {
        if (page) await page.close();
    }
}

export function buildMeetingMinutesHtml(data: any, roData: any): string {
    const { committee, title, dateStr, venue, absentees, present, minutes, resolvedSignatories } = data;
    
    // Combine trilingual names for employees
    const formatStaff = (s: any) => {
        if (typeof s === 'string') return s;
        return `${s.nameEn}${s.designationEn ? ` (${s.designationEn})` : ''}`;
    };

    const absenteesList = Array.isArray(absentees) && absentees.length > 0 
        ? absentees.map(formatStaff).join('; ') 
        : 'Nil';

    // Linkify Venue
    const linkify = (text: string) => {
        if (!text) return '-';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.replace(urlRegex, (url) => `<a href="${url}" style="color: #1e3a8a; text-decoration: underline; font-weight: 700;">${url}</a>`);
    };

    let minutesHtml = '';
    if (Array.isArray(minutes)) {
        minutesHtml = minutes.map((m: any, idx: number) => `
            <div style="margin-bottom: 25px; page-break-inside: avoid;">
                <div style="font-size: 14px; font-weight: 900; color: #1e3a8a; border-bottom: 1pt solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; display: flex;">
                    <span style="min-width: 25px; color: #64748b;">${idx + 1}.</span>
                    <span style="text-transform: uppercase; letter-spacing: 0.5px;">${(m.topic || 'General Discussion')}</span>
                </div>
                <div style="padding-left: 25px; text-align: justify; line-height: 1.6; font-size: 13px; color: #111827;">
                    ${(m.content || m.discussion || '').split('\n').filter((p: string) => p.trim()).map((p: string) => `
                        <div style="display: flex; gap: 8px; margin-bottom: 6px;">
                            <span style="color: #1e3a8a; font-weight: 900; opacity: 0.5;">•</span>
                            <span>${p.trim()}</span>
                        </div>
                    `).join('')}
                    
                    ${m.decision ? `<div style="margin-top: 10px; padding: 10px; background: #f8fafc; border-radius: 6px; border-left: 4px solid #10b981;">
                        <span style="font-weight: 900; color: #064e3b; font-size: 10px; text-transform: uppercase;">Outcome:</span>
                        <div style="font-size: 12.5px; margin-top: 2px; font-weight: 700;">${m.decision}</div>
                    </div>` : ''}
                </div>
            </div>
        `).join('');
    } else {
        minutesHtml = `<div style="line-height: 1.7; font-size: 13px;">${typeof minutes === 'string' ? minutes : 'No narrative proceedings recorded.'}</div>`;
    }

    const sigRows = [];
    const sigList = resolvedSignatories || [];
    for (let i = 0; i < sigList.length; i += 3) { sigRows.push(sigList.slice(i, i + 3)); }

    const sigGridHtml = sigRows.map(row => `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: avoid;">
            <tr>
                ${row.map((sig: any) => `
                    <td style="width: 33.33%; text-align: center; vertical-align: bottom; padding: 15px;">
                        <div style="height: 45px;"></div>
                        <div style="border-top: 1.2pt solid #1e3a8a; padding-top: 10px;">
                            <div style="font-size: 9px; color: #1e3a8a; font-weight: 700; margin-bottom: 4px;">
                                <span class="hindi" style="font-size: 10px;">(${sig.nameHi || ''})</span> / 
                                <span class="tamil" style="font-size: 9px;">(${sig.nameTa || ''})</span>
                            </div>
                            <div style="font-size: 12px; font-weight: 800; color: #000; text-transform: uppercase; margin-bottom: 6px;">(${sig.nameEn || 'Signatory'})</div>
                            
                            <div style="font-size: 10px; color: #4b5563; line-height: 1.4;">
                                <div class="hindi" style="font-size: 10px;">${sig.designationHi || ''}</div>
                                <div class="tamil" style="font-size: 9px; margin: 3px 0;">${sig.designationTa || ''}</div>
                                <div style="font-weight: 700; text-transform: uppercase; color: #1e3a8a;">${sig.designationEn || 'Official'}</div>
                            </div>
                        </div>
                    </td>
                `).join('')}
                ${row.length < 3 ? `<td style="width: ${33.33 * (3 - row.length)}%;"></td>` : ''}
            </tr>
        </table>
    `).join('');

    return `
        <div style="font-family: 'Inter', sans-serif;">
            <div style="margin-bottom: 25px; border-bottom: 2pt solid #1e3a8a; padding-bottom: 15px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="width: 60%; vertical-align: top;">
                            <div style="font-size: 11px; font-weight: 950; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Subject / Proceedings:</div>
                            <div style="font-size: 18px; font-weight: 900; color: #000; line-height: 1.2;">${(title || 'Meeting Record').toUpperCase()}</div>
                        </td>
                        <td style="width: 40%; vertical-align: top; text-align: right; border-left: 1pt solid #e2e8f0; padding-left: 20px;">
                            <div style="font-size: 12px; font-weight: 800; color: #475569;">
                                <div>VENUE: <span style="color: #000; font-size: 10px;">${linkify(venue || '')}</span></div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <div style="margin-bottom: 30px; font-size: 13px;">
                <div style="margin-bottom: 12px;">
                    <span style="font-weight: 900; color: #1e3a8a; text-transform: uppercase;" font-size: 11px;">PARTICIPANTS:</span>
                    <span style="font-weight: 700; color: #111827; margin-left: 5px;">${present}</span>
                </div>
                
                ${absenteesList !== 'Nil' ? `
                <div>
                    <span style="font-weight: 900; color: #991b1b; text-transform: uppercase;" font-size: 11px;">LEAVE OF ABSENCE:</span>
                    <span style="font-weight: 700; color: #7f1d1d; margin-left: 5px;">${absenteesList}</span>
                </div>` : ''}
            </div>

            <div style="margin-top: 30px;">
                <div style="font-weight: 900; color: #1e3a8a; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; margin-bottom: 20px; border-bottom: 1pt solid #e2e8f0; padding-bottom: 5px;">Narrative Proceedings & Deliberations</div>
                ${minutesHtml}
            </div>

            <div style="margin-top: 50px; page-break-inside: avoid;">
                ${sigGridHtml}
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
    
    const formatDateForm = (dStr: any) => {
        if (!dStr) return '-';
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return '-';
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    };

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
                    <img src="${imageToBase64('assets/logo_center.svg')}" style="height: 52px;" />
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
                        <div>Dindigul</div>
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
                <tr><td class="label">Proposed Date of Issue</td><td class="value">${content.dateOfIssue ? formatDateForm(content.dateOfIssue) : ''}</td></tr>
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
        .replace(/^The Branch Manager[\s\S]*?\n\n/gi, '')
        .replace(/^Dear (Sir|Madam|Sir\/Madam),?\s*/gi, '')
        .trim();

    const paragraphs = cleanedContent.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
    let bodyHtml = '';
    
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

            const firstItem = dataList[0];
            const obDate = formatDate(firstItem.march31stDate);
            const latestDate = formatDate(firstItem.latestDate);

            let tableRows = '';
            for (const item of dataList) {
                const isPercent = item.unit === '%' || item.unit === 'Ratio' || (item.parameter || '').includes('%');
                const forceInverted = ['NPA', 'SMA', 'OVERDUE'].some(k => (item.parameter || '').toUpperCase().includes(k)) || item.isInverted === true;
                const isAchieved = forceInverted ? (item.latest <= item.budget) : (item.latest >= item.budget);
                const showCurrency = (item.unit === 'Cr' || item.unit === 'Lakhs' || (!isPercent && item.unit !== 'Accounts'));
                
                const unitLabel = showCurrency ? (isRegional ? 'Cr' : 'L') : (item.unit || '');
                const fyGrowth = (item.latest || 0) - (item.march31st || 0);
                const gapColor = isAchieved ? '#15803d' : '#b91c1c';

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

                tableRows += `
                <tr>
                    <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:left;font-weight:700;color:#254aa0;">${item.parameter || 'Metric'}</td>
                    <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${showCurrency ? '₹ ' : ''}${fmt(item.march31st)} ${unitLabel}</td>
                    <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;font-weight:700;">${showCurrency ? '₹ ' : ''}${fmt(item.latest)} ${unitLabel}</td>
                    <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;font-weight:700;color:${forceInverted ? (fyGrowth <= 0 ? '#15803d' : '#b91c1c') : (fyGrowth >= 0 ? '#15803d' : '#b91c1c')}">${fyGrowth > 0 ? '+' : ''}${showCurrency ? '₹ ' : ''}${fmt(fyGrowth)} ${unitLabel}</td>
                    <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:right;">${showCurrency ? '₹ ' : ''}${fmt(item.budget)} ${unitLabel}</td>
                    <td style="border:1px solid #cbd5e1;padding:4px 6px;font-weight:700;color:${gapColor}">${item.gap >= 0 ? '+' : ''}${showCurrency ? '₹ ' : ''}${fmt(Math.abs(item.gap))} ${unitLabel}</td>
                    <td style="border:1px solid #cbd5e1;padding:4px 6px;font-weight:700;color:${statusColor};font-size:10px;text-align:center;">${statusLabel}</td>
                </tr>`;
            }

            bodyHtml += `
            <div style="margin:15px 0; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
                <table style="width:100%;border-collapse:collapse;font-size:11.5px;">
                    <thead style="background:#f1f5f9;font-weight:800;color:#1e293b;">
                        <tr>
                            <th style="border:1px solid #cbd5e1;padding:6px;">KPI Parameter</th>
                            <th style="border:1px solid #cbd5e1;padding:6px;">OB (${obDate})</th>
                            <th style="border:1px solid #cbd5e1;padding:6px;">Latest (${latestDate})</th>
                            <th style="border:1px solid #cbd5e1;padding:6px;">FY Growth</th>
                            <th style="border:1px solid #cbd5e1;padding:6px;">Target Budget</th>
                            <th style="border:1px solid #cbd5e1;padding:6px;">Gap to Budget</th>
                            <th style="border:1px solid #cbd5e1;padding:6px;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>`;
        } else if (para.includes('[MOVEMENT_TABLE]') && org.dailyMovement) {
            const scale = isRegional ? 1 : 100;
            const unitLabel = isRegional ? 'Cr' : 'L';
            
            const cdRatioMetric = (org.dailyMovement || []).find((m: any) => m.metricKey === 'CDRatio');
            const otherMovements = (org.dailyMovement || []).filter((m: any) => m.metricKey !== 'CDRatio');

            const categories = [
                { id: 'KBP', label: 'TREND POSITION: KEY BUSINESS PARAMETERS' },
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
                        const isFavorable = profit.latestValue >= 0;
                        const color = isFavorable ? '#254aa0' : '#b91c1c'; // Use Bank Navy for favorable profit, never red.
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
                        } else if (cdr > 75) {
                            cdrStatus = 'SATURATION RISK';
                            cdrColor = '#b91c1c';
                        } else if (cdr >= healthyMin && cdr <= healthyMax) {
                            cdrStatus = 'HEALTHY RANGE';
                            cdrColor = '#15803d';
                        }

                        const isRisk = cdrStatus === 'SATURATION RISK' || cdrStatus === 'BELOW TARGET';
                        const cdrBg = isRisk ? '#fff1f2' : '#f8fafc';
                        const cdrBorder = isRisk ? '#fda4af' : '#e2e8f0';
                        const cdrIcon = isRisk ? '⚠️ ' : '';

                        const targetLabel = isRuralSemi ? 'Policy Target: 60%+' : 'Target: 70%+';
                        const industryNote = 'Industry Healthy: 70-80%';

                        bodyHtml += `
                        <div style="display:flex; gap:12px; margin-bottom:15px;">
                            <div style="flex:1; border:1px solid ${cdrBorder}; border-radius:8px; padding:10px; background:${cdrBg};">
                                <div style="font-size:10px; color:#64748b; text-transform:uppercase; margin-bottom:4px; font-weight:700;">Liquidity Risk Summary (CD Ratio)</div>
                                <div style="font-size:17px; font-weight:700; color:#1e293b; line-height:1;">${cdrIcon}${fmt(cdr)}%</div>
                                <div style="font-size:9px; color:#64748b; margin-top:4px;">${targetLabel} | Status: <span style="color:${cdrColor}; font-weight:700;">${cdrStatus}</span></div>
                                <div style="font-size:8.5px; color:#475569; margin-top:6px; border-top:1px dashed ${cdrBorder}; padding-top:4px; font-style:italic;">
                                    The CD Ratio (Credit-to-Deposit) indicates the percentage of deposits utilized for lending; levels >75% signal potential liquidity strain.
                                </div>
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

                const pageBreak = cat.id === 'KBP' ? 'page-break-before: always;' : 'margin-top: 12px;';
                bodyHtml += `
                <div style="margin:5px 0; ${pageBreak}">
                    <div style="font-weight:700; font-size:14px; margin-bottom:8px; color:#254aa0; border-bottom: 2px solid #254aa0; padding-bottom: 4px;">${cat.label}</div>
                    <table style="width:100%;border-collapse:collapse;font-size:12.5px;text-align:center;">
                        <tr style="background:#f1f5f9;font-weight:700;font-size:11.5px;">
                            <th style="border:1px solid #cbd5e1;padding:3px 5px;text-align:left;white-space:nowrap;">KBP</th>
                            <th style="border:1px solid #cbd5e1;padding:3px 5px;white-space:nowrap;">${(() => {
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
                            <th style="border:1px solid #cbd5e1;padding:3px 5px;white-space:nowrap;">${formatDate(org.compareDates?.latest || org.businessDate || org.date)}</th>
                            <th style="border:1px solid #cbd5e1;padding:3px 5px;white-space:nowrap;">${cat.id === 'CASH' ? 'EXCESS / (SHORTFALL)' : 'MOVEMENT'}</th>
                            <th style="border:1px solid #cbd5e1;padding:3px 5px;">% CHANGE</th>
                            <th style="border:1px solid #cbd5e1;padding:3px 5px;">THRESHOLD</th>
                            <th style="border:1px solid #cbd5e1;padding:3px 5px;">STATUS</th>
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
                                <td style="border:1px solid #cbd5e1;padding:3px 5px;text-align:left;font-weight:700;">${displayName}</td>
                                <td style="border:1px solid #cbd5e1;padding:3px 5px;text-align:right;">${prevDisp}</td>
                                <td style="border:1px solid #cbd5e1;padding:3px 5px;text-align:right;font-weight:700;">${latestDisp}</td>
                                <td style="border:1px solid #cbd5e1;padding:3px 5px;text-align:right;color:${color};font-weight:700;">${moveDisp}</td>
                                <td style="border:1px solid #cbd5e1;padding:3px 5px;text-align:right;color:${color};font-weight:700;">${pctDisp}</td>
                                <td style="border:1px solid #cbd5e1;padding:3px 5px;text-align:right;font-weight:700;">${thresholdLabel}</td>
                                <td style="border: 1px solid #cbd5e1; padding: 2px 5px; text-align: center; font-weight: 700; color: ${breached ? '#b91c1c' : '#166534'}; font-size: 8.5px; white-space: nowrap;">${breached ? 'BREACH' : 'WITHIN LIMIT'}</td>
                            </tr>`;
                        }).join('')}
                    </table>
                </div>`;
            }
        } else if (para.trim().startsWith('<') || para.trim().includes('</table>') || para.trim().includes('</div>')) {
            bodyHtml += para;
        } else {
            bodyHtml += `<div style="font-size: 13.5px; line-height: 1.5; margin-bottom: 12px; text-align: justify; color: #334155;">${para}</div>`;
        }
    }

    return bodyHtml;
}
