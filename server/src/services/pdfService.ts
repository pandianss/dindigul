import puppeteer from 'puppeteer';

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
        // Set higher quality rendering settings
        await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: '<span></span>',
            footerTemplate: `
                <div style="font-size: 8px; width: 100%; text-align: center; color: #999; padding: 10px;">
                    Page <span class="pageNumber"></span> of <span class="totalPages"></span> | Dindigul Regional Office - Internal Document
                </div>
            `,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '25mm',
                left: '15mm'
            }
        });

        return Buffer.from(pdf);
    } finally {
        await browser.close();
    }
}
