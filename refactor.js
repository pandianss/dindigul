import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(SRC_DIR);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Check if the file contains the target string
    if (content.includes('http://localhost:5000')) {

        // Ensure the api import exists
        if (!content.includes("import api")) {
            // Find a good place to put it
            const importsEnd = content.lastIndexOf('import ');
            const nextLine = content.indexOf('\n', importsEnd) + 1;

            // Adjust path based on depth
            const relativeLevels = path.relative(path.dirname(file), path.join(SRC_DIR, 'services')).split(path.sep);
            let importPath = relativeLevels.join('/');
            if (!importPath.startsWith('.')) {
                importPath = './' + importPath;
            }
            if (importPath === './') importPath = './services/api';
            else importPath += '/api';
            // Simple depth calculation for relative imports since we are in src
            const depth = path.relative(SRC_DIR, path.dirname(file)).split(path.sep).length;
            const prefix = depth > 0 && path.dirname(file) !== SRC_DIR ? '../'.repeat(depth) : './';

            content = content.slice(0, nextLine) + `import api from '${prefix}services/api';\n` + content.slice(nextLine);
        }

        // Replace fetch GET
        content = content.replace(/await fetch\(`http:\/\/localhost:5000\/api(.*?)\`\)/g, "await api.get(`$1`)");
        content = content.replace(/await fetch\('http:\/\/localhost:5000\/api(.*?)'\)/g, "await api.get('$1')");
        content = content.replace(/fetch\(`http:\/\/localhost:5000\/api(.*?)\`\)/g, "api.get(`$1`)");
        content = content.replace(/fetch\('http:\/\/localhost:5000\/api(.*?)'\)/g, "api.get('$1')");

        // The above transforms `await fetch(...)` to `await api.get(...)`.
        // Fetch returns a Response object, and usually people do `res.json()`. Axios returns `{ data: ... }`.
        content = content.replace(/const (\w+) = await (api\.get.*?);\s+const (\w+) = await \1\.json\(\);/g, "const { data: $3 } = await $2;");
        content = content.replace(/const (\w+) = await (api\.post.*?);\s+const (\w+) = await \1\.json\(\);/g, "const { data: $3 } = await $2;");
        content = content.replace(/const (\w+) = await (api\.put.*?);\s+const (\w+) = await \1\.json\(\);/g, "const { data: $3 } = await $2;");
        content = content.replace(/const (\w+) = await (api\.delete.*?);\s+const (\w+) = await \1\.json\(\);/g, "const { data: $3 } = await $2;");

        // Replace POST/PUT/DELETE
        // This regex is very brittle, doing manual replacements of the specific files might be safer
        // but let's try to grab simple fetch with init object
        content = content.replace(/await fetch\(`http:\/\/localhost:5000\/api(.*?)\`,\s*{\s*method:\s*'POST',\s*headers:\s*{.*?},\s*body:\s*JSON\.stringify\((.*?)\)\s*}\s*\)/gs, "await api.post(`$1`, $2)");
        content = content.replace(/await fetch\('http:\/\/localhost:5000\/api(.*?)',\s*{\s*method:\s*'POST',\s*headers:\s*{.*?},\s*body:\s*JSON\.stringify\((.*?)\)\s*}\s*\)/gs, "await api.post('$1', $2)");

        content = content.replace(/await fetch\(`http:\/\/localhost:5000\/api(.*?)\`,\s*{\s*method:\s*'PUT',\s*headers:\s*{.*?},\s*body:\s*JSON\.stringify\((.*?)\)\s*}\s*\)/gs, "await api.put(`$1`, $2)");
        content = content.replace(/await fetch\('http:\/\/localhost:5000\/api(.*?)',\s*{\s*method:\s*'PUT',\s*headers:\s*{.*?},\s*body:\s*JSON\.stringify\((.*?)\)\s*}\s*\)/gs, "await api.put('$1', $2)");

        content = content.replace(/await fetch\(`http:\/\/localhost:5000\/api(.*?)\`,\s*{\s*method:\s*'DELETE'\s*}\)/g, "await api.delete(`$1`)");
        content = content.replace(/await fetch\('http:\/\/localhost:5000\/api(.*?)',\s*{\s*method:\s*'DELETE'\s*}\)/g, "await api.delete('$1')");

        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
});
