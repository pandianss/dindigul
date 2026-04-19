import { PlanningService } from './server/src/services/planningService';
import prisma from './server/src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function testImageGen() {
    try {
        console.log('Testing Special Report Image Generation...');
        const buffer = await PlanningService.generateSpecialReportImage('month');
        const outputPath = path.join(process.cwd(), 'scratch', 'test_report.png');
        
        if (!fs.existsSync(path.join(process.cwd(), 'scratch'))) {
            fs.mkdirSync(path.join(process.cwd(), 'scratch'));
        }
        
        fs.writeFileSync(outputPath, buffer);
        console.log('Successfully generated image at:', outputPath);
    } catch (error) {
        console.error('FAILED to generate image:', error);
    } finally {
        await prisma.$disconnect();
        process.exit();
    }
}

testImageGen();
