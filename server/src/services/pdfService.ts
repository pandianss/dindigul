import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

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

        // Essential for vector-grade output and proper scaling
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

        // networkidle0 ensures all assets (fonts, images) are loaded
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true, // Use the CSS defined @page size and margins
            margin: {
                top: '0', // Margins are handled in CSS for better control
                right: '0',
                bottom: '0',
                left: '0'
            }
        });

        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}
