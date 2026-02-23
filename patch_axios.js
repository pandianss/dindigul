import fs from 'fs';
import path from 'path';

// Read error file
const errors = fs.readFileSync('tsc_errors_utf8.txt', 'utf8');
const fileMatches = [...new Set(Array.from(errors.matchAll(/^src[\\\/].*?\.tsx/gm)).map(m => m[0]))];

fileMatches.forEach(relPath => {
    const file = path.join(process.cwd(), relPath);
    if (!fs.existsSync(file)) return;

    let content = fs.readFileSync(file, 'utf8');

    // Fix json()
    content = content.replace(/const (\w+) = await (.*?)\.json\(\);/g, "const $1 = $2.data;");
    content = content.replace(/await ([a-zA-Z0-9_]+)\.json\(\)/g, "$1.data");
    content = content.replace(/\.json\(\)/g, ".data");

    // Fix res.ok (Axios throws on 4xx/5xx, so we can often just assume it's ok if we reach the next line, or we check response status if it's explicitly handled)
    content = content.replace(/\(!([a-zA-Z0-9_]+)\.ok\)/g, "($1.status >= 400)");
    content = content.replace(/\b([a-zA-Z0-9_]+)\.ok\b/g, "$1.status === 200");

    // Edge case for RequestManager.tsx missing parenthesis from patch
    content = content.replace(/ \}\n                <\/div>\n            \)\}/g, " }\n                </div>\n            )}\n        </div>\n    );\n};");
    // Some places might still use `res.json()` directly in Promise chains if not caught by above
    content = content.replace(/\.then\(res => res\.json\(\)\)/g, ".then(res => res.data)");

    // Fix custom request object where body was passed but axios doesn't use standard RequestInit
    // "Property 'content' does not exist in type 'RequestInit'" tells us someone passed `content` instead of `body` maybe? or similar.
    // Actually, src/modules/RequestManager.tsx(121,21): Object literal may only specify known properties, and 'content' does not exist in type 'RequestInit'.

    if (file.includes('SettingsManager.tsx')) {
        if (!content.includes("import api")) {
            const importsEnd = content.lastIndexOf('import ');
            const nextLine = content.indexOf('\n', importsEnd) + 1;
            content = content.slice(0, nextLine) + `import api from '../services/api';\n` + content.slice(nextLine);
        }
    }

    if (file.includes('RequestManager.tsx')) {
        // Line 121 error: This happened because our first script replaced fetch(..., { method: 'POST' }) but didn't transform the body correctly in one spot.
        // Let's just restore or manually fix this specific file later if this generic replacement doesn't catch it.
    }

    fs.writeFileSync(file, content);
    console.log(`Patched ${file}`);
});
