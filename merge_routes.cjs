const fs = require('fs');
const path = require('path');

const fileMapping = [
    { file: 'calendar.ts', mount: '/calendar' },
    { file: 'campaign.ts', mount: '/campaigns' },
    { file: 'department.ts', mount: '/departments' },
    { file: 'designation.ts', mount: '/designations' },
    { file: 'expenditure.ts', mount: '/expenditure' },
    { file: 'logistics.ts', mount: '/logistics' },
    { file: 'organization.ts', mount: '/organization' },
    { file: 'presentations.ts', mount: '/presentations' },
    { file: 'signatory.ts', mount: '/signatories' },
    { file: 'visits.ts', mount: '/visits' },
    { file: 'meetingRoutes.ts', mount: '/meetings' }
];

const routesDir = path.join(__dirname, 'server', 'src', 'routes');
const outputFilePath = path.join(routesDir, 'systemRoutes.ts');

let allImports = new Set([
    "import { Router } from 'express';",
    "import prisma from '../lib/prisma';",
    "import { authenticateToken, authorizeRole } from '../middleware/auth';",
    "import { ROLES } from '../types/auth';"
]);

let allRoutes = [];

fileMapping.forEach(mapping => {
    const filePath = path.join(routesDir, mapping.file);
    if (!fs.existsSync(filePath)) {
        console.warn('File not found:', mapping.file);
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const varName = mapping.file.split('.')[0] + 'Router';
    let fileContent = `\n// ---- Merged from ${mapping.file} ----\n`;
    fileContent += `const ${varName} = Router();\n`;
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('import ')) {
            if (!trimmed.includes('express') && !trimmed.includes('prisma') && !trimmed.includes('auth')) {
                allImports.add(trimmed);
            }
        } else if (trimmed === 'const router = Router();' || trimmed.startsWith('const router=') || trimmed === 'const router = express.Router();') {
            // skip
        } else if (trimmed === 'export default router;' || trimmed === 'export default router') {
            // map it to system router
            fileContent += `\nsystemRouter.use('${mapping.mount}', ${varName});\n`;
        } else {
            // replace router.<method> with varName.<method>
            // need careful replace because word boundaries
            // We just do simple string replace since 'router.' is typical
            fileContent += line.replace(/\brouter\./g, `${varName}.`) + '\n';
        }
    });
    
    allRoutes.push(fileContent);
});

const finalContent = `${Array.from(allImports).join('\n')}

const systemRouter = Router();
${allRoutes.join('\n')}

export default systemRouter;
`;

fs.writeFileSync(outputFilePath, finalContent, 'utf8');
console.log('Successfully generated systemRoutes.ts');

// Delete original files
fileMapping.forEach(mapping => {
    const filePath = path.join(routesDir, mapping.file);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Deleted', mapping.file);
    }
});
