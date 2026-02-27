import { PlanningService } from '../services/planningService';
import * as fs from 'fs';
import * as path from 'path';

async function test() {
    console.log('--- Testing Closure Upload Fix ---');
    const csvPath = path.join(__dirname, '../../closure.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    try {
        const results = await PlanningService.processAccountClosures(csvContent, new Date());
        console.log('Results:', results);
        if (results.corrupted > 0) {
            console.log(`PASS: Detected and skipped ${results.corrupted} corrupted records.`);
        } else {
            console.warn('FAIL: No corrupted records detected (expected at least 42).');
        }
    } catch (err) {
        console.error('Upload failed unexpectedly:', err);
    }
}

test();
