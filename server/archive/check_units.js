
const xlsx = require('xlsx');
const path = require('path');

const MAPPING = {
    'SB': ' SB ',
    'CD': ' CD ',
    'TD': ' TD '
};

function checkFile(filename) {
    const filePath = path.join('c:\\Users\\63039\\Videos\\Projects\\dindigul\\mis_files', filename);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log(`--- ${filename} ---`);
    if (data.length > 0) {
        const row3933 = data.find(r => String(r['SOL'] || '').trim() === '3933');
        if (row3933) {
             const sb = row3933[MAPPING.SB] || row3933['SB'] || 0;
             const cd = row3933[MAPPING.CD] || row3933['CD'] || 0;
             const td = row3933[MAPPING.TD] || row3933['TD'] || 0;
             console.log('Row for Dindigul Main (3933): SB:', sb, 'CD:', cd, 'TD:', td, 'Total:', sb+cd+td);
        } else {
            console.log('3933 not found in', filename);
        }
    }
}

checkFile('20240331.xlsx');
checkFile('20260308.xlsx');
