const xlsx = require('xlsx');
const path = require('path');

const filePath = 'c:\\Users\\63039\\Videos\\Projects\\dindigul\\20260421.xlsx';
try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log('--- HEADERS ---');
    console.log(Object.keys(data[0]));
    console.log('--- SAMPLE ROW ---');
    console.log(data[0]);
} catch (err) {
    console.error('Error reading Excel:', err.message);
}
