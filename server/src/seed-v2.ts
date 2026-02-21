import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

function safeParseInt(val: any): number | null {
    const p = parseInt(val);
    return isNaN(p) ? null : p;
}

function safeParseFloat(val: any): number | null {
    const p = parseFloat(val);
    return isNaN(p) ? null : p;
}

async function main() {
    console.log('SEED V2 START');

    try {
        // 1. Departments
        const deptNames = ['Accounts', 'Human Resources', 'Information Technology', 'Planning & Development', 'Audit & Inspection', 'Law & Recovery', 'Operations'];
        for (const name of deptNames) {
            await prisma.department.upsert({
                where: { code: name.toUpperCase().replace(/\s+/g, '_') },
                update: { nameEn: name },
                create: { code: name.toUpperCase().replace(/\s+/g, '_'), nameEn: name }
            });
        }
        console.log('DEPARTMENTS UPSERTED');

        // 2. Branches
        const branchesCsvPath = path.resolve(__dirname, '../../branches.csv');
        console.log(`Reading branches from: ${branchesCsvPath}`);
        const branchesContent = fs.readFileSync(branchesCsvPath, 'utf8');
        const rawBranchRecords: any[] = parse(branchesContent, { columns: true, skip_empty_lines: true, trim: true });

        const branchRecords = rawBranchRecords.map(record => {
            const normalized: any = {};
            for (const key of Object.keys(record)) { normalized[key.trim()] = record[key]; }
            return normalized;
        });
        console.log(`Total branch records in CSV: ${branchRecords.length}`);

        for (let i = 0; i < branchRecords.length; i++) {
            const record = branchRecords[i];
            const solCode = (record['SOL'] || '').toString().padStart(4, '0');
            if (solCode === '0000') continue;

            console.log(`Processing Branch [${i + 1}/${branchRecords.length}]: ${solCode}`);
            await prisma.branch.upsert({
                where: { code: solCode },
                update: {
                    sNo: safeParseInt(record['S No']),
                    nameEn: record['Branch'],
                    openDate: record['Open'],
                    district: record['District'],
                    populationGroup: record['Category'],
                    latitude: safeParseFloat(record['Latitude']),
                    longitude: safeParseFloat(record['Longitude']),
                    pincode: record['Pincode'],
                    type: record['Type']
                },
                create: {
                    code: solCode,
                    sNo: safeParseInt(record['S No']),
                    nameEn: record['Branch'],
                    openDate: record['Open'],
                    district: record['District'],
                    populationGroup: record['Category'],
                    latitude: safeParseFloat(record['Latitude']),
                    longitude: safeParseFloat(record['Longitude']),
                    pincode: record['Pincode'],
                    type: record['Type']
                }
            });
        }
        console.log('BRANCHES UPSERTED');

        // RO Ensure
        await prisma.branch.upsert({
            where: { code: '3933' },
            update: { type: 'REGIONAL OFFICE', nameEn: 'Regional Office Dindigul' },
            create: { code: '3933', nameEn: 'Regional Office Dindigul', type: 'REGIONAL OFFICE', district: 'Dindigul' }
        });

        // 3. Staff
        const staffCsvPath = path.resolve(__dirname, '../../Staff.csv');
        console.log(`Reading staff from: ${staffCsvPath}`);
        const staffContent = fs.readFileSync(staffCsvPath, 'utf8');
        const rawStaffRecords: any[] = parse(staffContent, { columns: true, skip_empty_lines: true, trim: true });
        const staffRecords = rawStaffRecords.map(record => {
            const normalized: any = {};
            for (const key of Object.keys(record)) { normalized[key.trim()] = record[key]; }
            return normalized;
        });

        // Designations Seed Start
        console.log(`Extracting unique designations from Staff records...`);
        const uniqueDesignations = new Set<string>();
        for (const record of staffRecords) {
            if (record['Designation']) {
                uniqueDesignations.add(record['Designation'].trim());
            }
        }

        for (const desigName of uniqueDesignations) {
            const desigCode = desigName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            await prisma.designation.upsert({
                where: { code: desigCode },
                update: { nameEn: desigName },
                create: { code: desigCode, nameEn: desigName, workId: 0 }
            });
        }
        console.log('DESIGNATIONS UPSERTED');

        console.log(`Total staff records in CSV: ${staffRecords.length}`);
        const roStaffIds: string[] = [];

        for (let i = 0; i < staffRecords.length; i++) {
            const record = staffRecords[i];
            const roll = record['Roll']?.toString();
            if (!roll) continue;
            const brCode = (record['br code'] || '').toString().padStart(4, '0');
            const branch = await prisma.branch.findUnique({ where: { code: brCode } });
            if (!branch) continue;

            const designation = record['Designation'] || '';
            const isSRM = designation.includes('SENIOR REGIONAL MANAGER');
            const isIline = designation.includes('I line');
            const isIIline = designation.includes('II line');

            const desigCode = designation.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            const desigRecord = designation ? await prisma.designation.findUnique({ where: { code: desigCode } }) : null;

            const user = await prisma.user.upsert({
                where: { username: roll },
                update: {
                    fullNameEn: record['Name'],
                    grade: record['Grade'],
                    branchId: branch.id,
                    designationId: desigRecord?.id || null,
                    isRegionHead: isSRM,
                    isSecondLine: isIIline,
                    role: isSRM || designation.includes('CHIEF MANAGER') ? 'RO_MANAGER' : (brCode === '3933' ? 'SECTION_USER' : 'BRANCH_USER')
                },
                create: {
                    username: roll,
                    passwordHash: '$2a$10$f7e3d1c2b5a49876543210fedcba9876543210fedcba9876543210fedcba9876',
                    fullNameEn: record['Name'],
                    grade: record['Grade'],
                    branchId: branch.id,
                    designationId: desigRecord?.id || null,
                    isRegionHead: isSRM,
                    isSecondLine: isIIline,
                    role: isSRM || designation.includes('CHIEF MANAGER') ? 'RO_MANAGER' : (brCode === '3933' ? 'SECTION_USER' : 'BRANCH_USER')
                }
            });

            if (isIline && !isSRM) { await prisma.branch.update({ where: { id: branch.id }, data: { headUser: { connect: { id: user.id } } } }); }
            if (isIIline && !isSRM && brCode !== '3933') { await prisma.branch.update({ where: { id: branch.id }, data: { secondLineUser: { connect: { id: user.id } } } }); }

            if (brCode === '3933') roStaffIds.push(user.id);
            if (i % 50 === 0) console.log(`Processed ${i} staff...`);
        }
        console.log('STAFF UPSERTED');

        // Departments assignment
        const depts = await prisma.department.findMany();
        for (let i = 0; i < roStaffIds.length; i++) {
            await prisma.user.update({
                where: { id: roStaffIds[i] },
                data: { departments: { connect: [{ id: depts[i % depts.length].id }, { id: depts[(i + 2) % depts.length].id }] } }
            });
        }
        console.log('RO DEPARTMENTS ASSIGNED');

        console.log('SEED V2 SUCCESS');
    } catch (err: any) {
        console.error('SEED V2 CRITICAL ERROR');
        console.error(err.message || err);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
