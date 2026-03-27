const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function run() {
    const csvContent = fs.readFileSync('c:/Users/63039/Videos/Projects/dindigul/mis_files/Staff.csv', 'utf-8');
    const items = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true });

    // Deduplicate by Roll
    const seen = new Set();
    const uniqueItems = items.filter(item => {
        const key = (item.Roll || item.RollNo || '').toString().trim();
        if (seen.has(key) || !key) return false;
        seen.add(key);
        return true;
    });

    console.log(`Processing ${uniqueItems.length} unique staff records...`);
    let processed = 0;

    for (const item of uniqueItems) {
        const username = item.Roll.toString().trim();
        const fullNameEn = item.Name.trim();
        const designationName = item.Designation.trim();
        const branchCode = item['br code'].trim();
        const grade = item.Grade.trim();

        try {
            // 1. Resolve Designation
            const desigCode = designationName.toUpperCase().replace(/\s+/g, '_');
            const desig = await prisma.designation.upsert({
                where: { code: desigCode },
                update: { nameEn: designationName },
                create: { code: desigCode, nameEn: designationName, workId: 999 }
            });

            // 2. Resolve Branch
            const numericCode = parseInt(branchCode);
            const codeVariants = [branchCode, String(numericCode).padStart(4, '0'), String(numericCode).padStart(5, '0')];
            const branchList = await prisma.branch.findMany({
                where: { code: { in: codeVariants } }
            });
            const branch = branchList[0];

            if (!branch) {
                // console.log(`Branch ${branchCode} not found for ${fullNameEn}`);
                continue;
            }

            // 3. Detect Line Status
            const isSecondLine = designationName.includes('- II line') || designationName.includes('Second Line');
            const isUnitHead = designationName.includes('- I line') || designationName.includes('Head') || designationName === 'CHIEF MANAGER'; // Added CM as head for RO verticals
            const gradeUpper = grade.toUpperCase();
            const isRegionHead = branchCode === '3933' && (gradeUpper.includes('SM V') || gradeUpper.includes('TEG VI') || gradeUpper.includes('TEG VII'));

            // 4. Upsert User
            const user = await prisma.user.upsert({
                where: { username },
                update: { fullNameEn, grade, designationId: desig.id, branchId: branch.id, isSecondLine, isRegionHead },
                create: {
                    username,
                    passwordHash: await bcrypt.hash('Bank@123', 10),
                    fullNameEn,
                    grade,
                    designationId: desig.id,
                    branchId: branch.id,
                    isSecondLine,
                    isRegionHead,
                    role: branch.type === 'RO' || branchCode === '3933' ? 'RO_USER' : 'BRANCH_USER'
                }
            });

            // 5. Link to Branch Hierarchy
            if (isUnitHead || isRegionHead) {
                await prisma.branch.update({ where: { id: branch.id }, data: { headUserId: user.id } });
            } else if (isSecondLine) {
                await prisma.branch.update({ where: { id: branch.id }, data: { secondLineUserId: user.id } });
            }
            
            processed++;
        } catch (err) {
            console.error(`Error processing ${username}:`, err);
        }
    }
    console.log(`Successfully processed ${processed} staff records.`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
