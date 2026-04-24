import puppeteer, { Browser } from 'puppeteer';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';

// ── Asset Caching ──
const assetCache: Record<string, string> = {};
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');

/**
 * Pure Renderer Layer: Responsible ONLY for browser-level formatting (PDF).
 * Handles asset embedding and Puppeteer orchestration.
 */
export class PDFRenderer {
    private static _browser: Browser | null = null;

    /**
     * Internal: Ensures browser is initialized.
     */
    public static async getBrowser() {
        if (this._browser && this._browser.connected) return this._browser;
        
        const executablePath = process.env.CHROME_PATH || undefined;
        this._browser = await puppeteer.launch({
            headless: 'new' as any,
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
            timeout: 60000
        });
        return this._browser;
    }

    /**
     * Converts a local font to Base64 for embedding.
     */
    static getFontAsBase64(assetRelPath: string): string {
        const cacheKey = `font:${assetRelPath}`;
        if (assetCache[cacheKey]) return assetCache[cacheKey];

        const fullPath = path.join(ROOT_DIR, 'public', assetRelPath.replace(/^[/\\]+/, ''));
        if (existsSync(fullPath)) {
            const buffer = readFileSync(fullPath);
            const b64 = buffer.toString('base64');
            assetCache[cacheKey] = b64;
            return b64;
        }
        return '';
    }

    /**
     * Converts an image to Base64 (Data URI).
     */
    static getImageAsDataUri(assetRelPath: string): string {
        const cacheKey = `img:${assetRelPath}`;
        if (assetCache[cacheKey]) return assetCache[cacheKey];

        const fullPath = path.join(ROOT_DIR, 'public', assetRelPath.replace(/^[/\\]+/, ''));
        if (existsSync(fullPath)) {
            const buffer = readFileSync(fullPath);
            const ext = path.extname(fullPath).slice(1).toLowerCase();
            const mime = (ext === 'svg') ? 'image/svg+xml' : `image/${ext}`;
            const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
            assetCache[cacheKey] = dataUri;
            return dataUri;
        }
        return '';
    }

    /**
     * Generates a PDF Buffer from HTML.
     */
    static async generate(html: string, options: { refNo?: string } = {}): Promise<Buffer> {
        const browser = await this.getBrowser();
        const page = await browser.newPage();
        
        try {
            await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
            await page.evaluateHandle('document.fonts.ready');
            await page.emulateMediaType('print');
            
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: `<div style="font-size:9px;width:100%;text-align:right;margin-right:12.7mm;margin-top:5mm;color:#64748b;">${options.refNo || ''} | Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
                footerTemplate: '<div style="font-size:1px;"></div>',
                margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
            });
            
            return Buffer.from(pdf);
        } finally {
            await page.close();
        }
    }
}
