const fs = require('fs');
let c = fs.readFileSync('src/modules/Dashboard.tsx', 'utf8');
c = c.replace(/fontSize:\s*([\d.]+)/g, (m, p1) => {
    const n = parseFloat(p1);
    let bump = 2; // Default bump by 2px
    if (n >= 20) bump = 4;
    if (n >= 16 && n < 20) bump = 3;

    // Base case: if it was tiny, give it a bit more
    if (n <= 9) bump = 2.5;
    if (n === 10 || n === 11) bump = 3;

    const final = Math.round((n + bump) * 10) / 10;
    return `fontSize: ${final}`;
});
fs.writeFileSync('src/modules/Dashboard.tsx', c);
console.log('Fonts scaled up successfully!');
