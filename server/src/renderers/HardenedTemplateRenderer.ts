import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { ValidatedLetterPayload } from '../types/schemas';
import { PDFRenderError } from '../types/errors';
import config from '../rules/config.json';
import { PDFRenderer } from './PDFRenderer';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Handlebars Global Helpers
handlebars.registerHelper('toFixed', (num) => Number(num || 0).toFixed(2));
handlebars.registerHelper('lowercase', (str) => String(str || '').toLowerCase());

/**
 * Hardened Renderer Layer.
 * Strictly Template-driven, Deterministic, and Idempotent.
 */
export class HardenedTemplateRenderer {
    private static templateCache: Map<string, handlebars.TemplateDelegate> = new Map();

    /**
     * Renders a document from a validated payload.
     * GUARANTEE: Same input always produces same output string.
     */
    static async render(templateName: string, payload: ValidatedLetterPayload): Promise<string> {
        try {
            const template = await this.getTemplate(templateName);
            
            // 1. Immutable Data Mapping
            const renderData = {
                ...payload,
                content: {
                    ...payload.content,
                    bodyHtml: this.sanitize(payload.content.bodyHtml)
                },
                // Legacy mapping for premiumLayout.hbs
                title: payload.content.title.en,
                titleHi: payload.content.title.hi,
                titleTa: payload.content.title.ta,
                date: payload.metadata.letterDate,
                refNo: payload.metadata.referenceNo,
                bodyHtml: this.sanitize(payload.content.bodyHtml),
                // Map signatory to template requirements (initiator vs reviewersOrApprovers)
                reviewersOrApprovers: [{
                    nameEn: payload.signatory.name.en,
                    nameHi: payload.signatory.name.hi,
                    nameTa: payload.signatory.name.ta,
                    titleEn: payload.signatory.title.en,
                    titleHi: payload.signatory.title.hi,
                    titleTa: payload.signatory.title.ta
                }],
                organization: {
                    ...payload.organization,
                    bankLogo: PDFRenderer.getImageAsDataUri('assets/logo_center.svg'),
                    tamilFont: PDFRenderer.getFontAsBase64('assets/Arima-VariableFont_wght.ttf'),
                    hindiFont: PDFRenderer.getFontAsBase64('assets/NotoSansDevanagari-VariableFont_wdth,wght.ttf'),
                    bankNameEn: payload.organization.bankName?.en,
                    bankNameHi: payload.organization.bankName?.hi,
                    bankNameTa: payload.organization.bankName?.ta,
                    officeNameEn: payload.organization.officeName?.en,
                    officeNameHi: payload.organization.officeName?.hi,
                    officeNameTa: payload.organization.officeName?.ta,
                    addressEn: payload.organization.address?.en,
                    addressHi: payload.organization.address?.hi,
                    addressTa: payload.organization.address?.ta,
                    addressEnFormatted: (payload.organization.address?.en || '').replace(/Pensioner Street,/gi, 'Pensioner Street,<br>'),
                    addressHiFormatted: (payload.organization.address?.hi || '').replace(/पेंशनर स्ट्रीट,/gi, 'पेंशनर स्ट्रीट,<br>'),
                    addressTaFormatted: (payload.organization.address?.ta || '').replace(/பென்ஷனர் தெரு,/gi, 'பென்ஷனர் தெரு,<br>'),
                },
                templateVersion: config.render.templateVersion
            };

            // 2. Deterministic Execution
            return template(renderData);
        } catch (err: any) {
            throw new PDFRenderError(`Failed to render template ${templateName}`, { details: err.message });
        }
    }

    /**
     * Sanitizes HTML for banking security standards.
     */
    private static sanitize(html: string): string {
        if (!config.render.sanitize) return html;

        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['p', 'br', 'b', 'strong', 'i', 'em', 'u', 'table', 'tr', 'td', 'th', 'div', 'span', 'ul', 'ol', 'li'],
            ALLOWED_ATTR: ['style', 'class', 'colspan', 'rowspan'],
            FORCE_BODY: true
        });
    }

    /**
     * Resolves and compiles templates with caching.
     */
    private static async getTemplate(name: string): Promise<handlebars.TemplateDelegate> {
        if (this.templateCache.has(name)) return this.templateCache.get(name)!;

        const templatePath = path.join(process.cwd(), 'src', 'templates', `${name}.hbs`);
        try {
            const source = await fs.readFile(templatePath, 'utf8');
            const compiled = handlebars.compile(source);
            this.templateCache.set(name, compiled);
            return compiled;
        } catch (err) {
            throw new PDFRenderError(`Template file not found: ${name}.hbs`);
        }
    }
}
