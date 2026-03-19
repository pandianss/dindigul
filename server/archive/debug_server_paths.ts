import path from 'path';
import fs from 'fs';

try {
    const letterRoutePath = require.resolve('./src/routes/letter');
    console.log('Resolved Path:', letterRoutePath);
    
    if (fs.existsSync(letterRoutePath)) {
        const content = fs.readFileSync(letterRoutePath, 'utf-8');
        console.log('File size:', content.length);
        console.log('Has Purple Border code:', content.includes('purple'));
        console.log('Has [PERFORMANCE_TABLE] code:', content.includes('[PERFORMANCE_TABLE]'));
        
        // Check for line 257 which should have the purple border
        const lines = content.split('\n');
        console.log('Line 257 snippet:', lines[256]?.trim());
    } else {
        console.log('File does NOT exist at resolved path!');
    }
} catch (e) {
    console.error('Resolution failed:', e);
}
