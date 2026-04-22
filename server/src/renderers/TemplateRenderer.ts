import handlebars from 'handlebars';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { UnifiedLetterPayload, TrilingualString } from '../services/interfaces';
import { PDFRenderer } from './PDFRenderer';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// â”€â”€ Root Paths â”€â”€
const SERVICES_DIR = path.resolve(__dirname, '..');
const SERVER_DIR = path.resolve(SERVICES_DIR, '..');
const ROOT_DIR = path.resolve(SERVER_DIR, '..');

// â”€â”€ Handlebars Helpers â”€â”€
handlebars.registerHelper('toFixed', (num, precision) => Number(num || 0).toFixed(precision || 2));
handlebars.registerHelper('isNegative', (num) => Number(num || 0) < 0);
handlebars.registerHelper('add', (a, b) => Number(a) + Number(b));
handlebars.registerHelper('lowercase', (str) => String(str || '').toLowerCase());

/**
 * Pure Renderer Layer: Responsible ONLY for formatting (HTML).
 * No business logic allowed.
 */
export class TemplateRenderer {
    private static templateCache: Record<string, handlebars.TemplateDelegate> = {};

    /**
     * Sanitizes HTML for safe printing.
     */
    private static sanitize(html: string): string {
        return DOMPurify.sanitize(html, {
            ADD_ATTR: ['style', 'class', 'rowspan', 'colspan', 'border', 'cellpadding', 'cellspacing', 'width', 'height'],
            ADD_TAGS: ['div', 'span', 'p', 'table', 'tr', 'td', 'th', 'br', 'b', 'i', 'u', 'strong', 'em', 'style'],
            FORCE_BODY: true
        });
    }

    /**
     * Finds and compiles a template.
     */
    private static async getTemplate(name: string): Promise<handlebars.TemplateDelegate> {
        if (this.templateCache[name]) return this.templateCache[name];

        const pathsToTry = [
            path.join(SERVER_DIR, 'src', 'templates', `${name}.hbs`),
            path.join(ROOT_DIR, 'server', 'src', 'templates', `${name}.hbs`),
        ];

        let source = '';
        for (const p of pathsToTry) {
            if (existsSync(p)) {
                source = await fs.readFile(p, 'utf-8');
                break;
            }
        }

        if (!source) throw new Error(`Template not found: ${name}`);

        const template = handlebars.compile(source);
        this.templateCache[name] = template;
        return template;
    }

    /**
     * Renders a full letter using the Unified Payload.
     */
    static async renderLetter(payload: UnifiedLetterPayload): Promise<string> {
        // We use 'premiumLayout' as the base wrapper unless otherwise specified
        const template = await this.getTemplate('premiumLayout');
        
        // Prepare template data (mapping from Unified Payload to legacy/layout requirements)
        const templateData = {
            ...payload,
            // Legacy mapping for existing templates
            title: payload.content.title.en,
            titleHi: payload.content.title.hi,
            titleTa: payload.content.title.ta,
            date: payload.metadata.letterDate,
            refNo: payload.metadata.referenceNo,
            bodyHtml: this.sanitize(payload.content.bodyHtml),
            
            signatoryName: payload.signatory.name.en,
            signatoryNameHi: payload.signatory.name.hi,
            signatoryNameTa: payload.signatory.name.ta,
            signatoryTitleEn: payload.signatory.title.en,
            signatoryTitleHi: payload.signatory.title.hi,
            signatoryTitleTa: payload.signatory.title.ta,
            
            organization: {
                bankLogo: PDFRenderer.getImageAsDataUri('assets/logo_center.svg'),
                tamilFont: PDFRenderer.getFontAsBase64('assets/Arima-VariableFont_wght.ttf'),
                hindiFont: PDFRenderer.getFontAsBase64('assets/NotoSansDevanagari-VariableFont_wdth,wght.ttf'),
                bankNameEn: payload.organization.bankName.en,
                bankNameHi: payload.organization.bankName.hi,
                bankNameTa: payload.organization.bankName.ta,
                officeNameEn: payload.organization.officeName.en,
                officeNameHi: payload.organization.officeName.hi,
                officeNameTa: payload.organization.officeName.ta,
                addressHi: payload.organization.address.hi,
                addressTa: payload.organization.address.ta,
                addressEnFormatted: (payload.organization.address.en || '').replace(/Pensioner Street,/gi, 'Pensioner Street,<br>'),
                addressHiFormatted: (payload.organization.address.hi || '').replace(/पेंशनर स्ट्रीट,/gi, 'पेंशनर स्ट्रीट,<br>'),
                addressTaFormatted: (payload.organization.address.ta || '').replace(/பென்ஷனர் தெரு,/gi, 'பென்ஷனர் தெரு,<br>'),
                phone: payload.organization.phone,
                email: payload.organization.email,
                website: payload.organization.website
            },
            
            letterCategory: payload.metadata.category
        };
        return template(templateData);
    }
    
    /**
     * Legacy Bridge: Manual construction of the premium layout wrapper.
     */
    static buildPremiumLayout(bodyHtmlOrOptions: any, optionsOrRefNo?: any): string {
        const bankLogo = PDFRenderer.getImageAsDataUri('assets/logo_center.svg');
        const tamilFont = PDFRenderer.getFontAsBase64('assets/Arima-VariableFont_wght.ttf');
        const hindiFont = PDFRenderer.getFontAsBase64('assets/NotoSansDevanagari-VariableFont_wdth,wght.ttf');
        const options = (typeof bodyHtmlOrOptions === 'object') ? bodyHtmlOrOptions : optionsOrRefNo;
        const bodyHtml = (typeof bodyHtmlOrOptions === 'string') ? bodyHtmlOrOptions : options.bodyHtml;
        const { organization: org, title, titleHi, titleTa, subTitle, date, refNo, signatory, initiator, reviewers, approver, deptSealSrc } = options;
        
        // Normalize trilingual organization fields
        const bNameEn = org.bankNameEn || org.bankName?.en || 'Dindigul Bank';
        const bNameHi = org.bankNameHi || org.bankName?.hi || '';
        const bNameTa = org.bankNameTa || org.bankName?.ta || '';
        const oNameEn = org.officeNameEn || org.officeName?.en || 'Regional Office';
        const oNameHi = org.officeNameHi || org.officeName?.hi || '';
        const oNameTa = org.officeNameTa || org.officeName?.ta || '';
        const addrEn = (org.addressEn || org.address?.en || '').replace(/Pensioner Street,/gi, 'Pensioner Street,<br>');
        const addrHi = (org.addressHi || org.address?.hi || '').replace(/पेंशनर स्ट्रीट,/gi, 'पेंशनर स्ट्रीट,<br>');
        const addrTa = (org.addressTa || org.address?.ta || '').replace(/பென்ஷனர் தெரு,/gi, 'பென்ஷனர் தெரு,<br>');
        const phone = org.phone || '';
        const email = org.email || '';
        const web = org.website || '';

        const sigName = signatory?.name || approver?.name || 'Authorized Signatory';
        const sigTitle = signatory?.title || approver?.titleEn || 'Officer';

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    <style>
                        ${tamilFont ? `
                        @font-face {
                            font-family: 'ArimaTamil';
                            src: url(data:font/ttf;base64,${tamilFont}) format('truetype');
                        }
                        ` : ''}
                        ${hindiFont ? `
                        @font-face {
                            font-family: 'NotoHindi';
                            src: url(data:font/ttf;base64,${hindiFont}) format('truetype');
                        }
                        ` : ''}
                        body { font-family: 'Century Gothic', 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 40px; color: #1a1a1a; line-height: 1.4; }
                        .tamil-text, .bank-name-ta, .tamil-col, .signatory-ta { font-family: 'ArimaTamil', 'Century Gothic', sans-serif !important; }
                        .hindi-text, .bank-name-hi, .hindi-col, .signatory-hi { font-family: 'NotoHindi', 'Segoe UI', sans-serif !important; }
                        .header { display: flex; align-items: center; justify-content: flex-start; gap: 20px; margin-bottom: 12px; }
                        .logo-img { height: 60px; width: auto; }
                        .bank-names-container { text-align: left; }
                        .bank-name-ta { color: #00338d; font-size: 19px; font-weight: 900; margin: 0; line-height: 1.3; }
                        .bank-name-hi { color: #00338d; font-size: 19px; font-weight: 700; margin: 0; line-height: 1.3; }
                        .bank-name-en { color: #00338d; font-size: 18px; font-weight: 700; margin: 0; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif; line-height: 1.3; }
                        .info-section { display: flex; justify-content: space-between; align-items: stretch; margin-top: 12px; padding: 8px 0; }
                        .info-col { flex: 1; padding: 0 5px; font-size: 10px; color: #444; border-right: 1px solid #ddd; text-align: center; overflow-wrap: break-word; }
                        .info-col:last-child { border-right: none; }
                        .tamil-col { font-size: 6.5pt; flex: 1; }
                        .office-label { font-weight: 800; display: block; margin-bottom: 3px; color: #1a1a1a; font-size: 10.5px; }
                        .tamil-col .office-label { font-size: 7.5pt; font-weight: 900; }
                        .contact-row { background: #eef4ff; padding: 7px 0; font-size: 10px; color: #444; display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; border-radius: 2px; }
                        .meta-strip { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-bottom: 15px; padding-bottom: 3px; }
                        .content { min-height: 400px; }
                        .title-block { text-align: center; margin-bottom: 20px; }
                        .main-title { font-size: 15px; color: #00338d; text-transform: uppercase; margin: 0; text-decoration: none; letter-spacing: 0.5px; font-weight: 800; }
                        .sub-title { font-size: 11px; font-weight: 700; color: #444; margin-top: 3px; }
                        .meta-header { font-size: 8.5px; font-weight: 500; color: #666; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.1px; }
                        .footer { margin-top: 30px; padding-top: 10px; }
                        .signatory-block { text-align: right; width: 300px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        ${bankLogo ? `<img src="${bankLogo}" class="logo-img">` : ''}
                        <div class="bank-names-container">
                            <div class="bank-name-ta">${bNameTa}</div>
                            <div class="bank-name-hi">${bNameHi}</div>
                            <div class="bank-name-en">${bNameEn}</div>
                        </div>
                    </div>
                    <div class="info-section">
                        <div class="info-col tamil-col"><span class="office-label">${oNameTa}</span>${addrTa}</div>
                        <div class="info-col hindi-col"><span class="office-label">${oNameHi}</span>${addrHi}</div>
                        <div class="info-col"><span class="office-label">${oNameEn}</span>${addrEn}</div>
                    </div>
                    <div class="contact-row">
                        <span>Phone: ${phone}</span>
                        <span>Email: ${email}</span>
                        <span>Web: ${web}</span>
                    </div>
                    <div class="meta-strip">
                        <span>Ref No: ${refNo}</span>
                        <span>Date: ${date}</span>
                    </div>
                    <div class="content">
                        <div style="text-align: center; margin-bottom: 25px;">
                            <h2 style="font-size: 16px; color: #00338d; text-transform: uppercase; margin: 0; letter-spacing: 0.5px; font-weight: 800; text-decoration: none;">
                                ${titleTa ? `<span class="tamil-text">${titleTa}</span> / ` : ''}
                                ${titleHi ? `<span>${titleHi}</span> / ` : ''}
                                <span>${title || 'Office Note'}</span>
                            </h2>
                            ${subTitle ? `<div class="sub-title">${subTitle}</div>` : ''}
                        </div>
                        ${bodyHtml}
                    </div>
                        <div class="signatory-rows" style="margin-top: 30px;">
                            ${options.initiator ? `
                                <!-- Row 1: Initiator -->
                                <div style="display: flex; justify-content: flex-start; margin-bottom: 20px;">
                                    <div style="text-align: center; width: auto; min-width: 200px;">
                                        <div style="height: 25px;"></div>
                                        <div style="font-size: 10px; font-weight: 900; color: #1a1a1a; line-height: 1.4;">
                                            ${options.initiator.nameTa ? `<span class="tamil-text">${options.initiator.nameTa}</span> / ` : ''}
                                            ${options.initiator.nameHi ? `<span class="hindi-text">${options.initiator.nameHi}</span> / ` : ''}
                                            <span>${options.initiator.nameEn}</span>
                                        </div>
                                        <div style="font-size: 9px; color: #444; text-transform: uppercase; font-weight: 700; line-height: 1.2;">
                                            ${options.initiator.titleTa ? `<span class="tamil-text">${options.initiator.titleTa}</span> / ` : ''}
                                            ${options.initiator.titleHi ? `<span class="hindi-text">${options.initiator.titleHi}</span> / ` : ''}
                                            <span>${options.initiator.titleEn}</span>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${(options.reviewersOrApprovers || []).length > 0 ? `
                                <!-- Row 2: Reviewers and Approver -->
                                <div style="display: flex; justify-content: flex-end; gap: 40px; align-items: flex-start;">
                                    ${(options.reviewersOrApprovers).map((s: any) => `
                                        <div style="text-align: center; width: auto; min-width: 140px;">
                                            <div style="height: 25px;"></div>
                                            <div style="font-size: 10px; font-weight: 900; color: #1a1a1a; line-height: 1.4;">
                                                ${s.nameTa ? `<span class="tamil-text">${s.nameTa}</span> / ` : ''}
                                                ${s.nameHi ? `<span class="hindi-text">${s.nameHi}</span> / ` : ''}
                                                <span>${s.nameEn}</span>
                                            </div>
                                            <div style="font-size: 9px; color: #444; text-transform: uppercase; font-weight: 700; line-height: 1.2;">
                                                ${s.titleTa ? `<span class="tamil-text">${s.titleTa}</span> / ` : ''}
                                                ${s.titleHi ? `<span class="hindi-text">${s.titleHi}</span> / ` : ''}
                                                <span>${s.titleEn}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                </body>
            </html>
        `;
    }
}
