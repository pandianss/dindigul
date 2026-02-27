import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function normalizeKeys(obj: any) {
    const normalized: any = {};
    for (const key of Object.keys(obj)) {
        normalized[key.trim().toUpperCase()] = obj[key];
    }
    return normalized;
}

async function main() {
    console.log('Starting Refined CSV data seeding...');

    // 1. Seed Departments
    const deptNames = [
        'Financial Inclusion',
        'Agri & Rural Initiatives Division',
        'Planning Department',
        'Compliance Department',
        'Customer Service Department',
        'Law Department',
        'Credit Monitoring Department',
        'General Administration Department',
        'Government Accounts Division',
        'Human Resources Management Department',
        'Inspection Department',
        'Regional Computer Center',
        'Official Language Department',
        'Public Relations Department',
        'Security Department',
        'MSME Division',
        'Retail Division',
        'Vigilance Department',
        'Marketing and Development Department'
    ];
    for (const name of deptNames) {
        await prisma.department.upsert({
            where: { code: name.toUpperCase().replace(/\s+/g, '_') },
            update: { nameEn: name },
            create: { code: name.toUpperCase().replace(/\s+/g, '_'), nameEn: name }
        });
    }
    console.log('Seeded departments.');

    // 2. Seed Branches
    const branchesCsvPath = path.join(__dirname, '../../branches.csv');
    const branchesContent = fs.readFileSync(branchesCsvPath, 'utf8');
    const rawBranchRecords = parse(branchesContent, { columns: true, skip_empty_lines: true, trim: true }) as any[];

    for (const raw of rawBranchRecords) {
        const record = normalizeKeys(raw);
        const solCode = record['SOL'] ? record['SOL'].toString().trim().padStart(4, '0') : null;
        if (!solCode) {
            console.warn('Skipping branch record with missing SOL:', raw);
            continue;
        }

        await prisma.branch.upsert({
            where: { code: solCode },
            update: {
                sNo: parseInt(record['S NO']) || null,
                nameEn: record['BRANCH'] || '',
                openDate: record['OPEN'] || null,
                district: record['DISTRICT'] || '',
                populationGroup: record['CATEGORY'] || '',
                latitude: parseFloat(record['LATITUDE']) || null,
                longitude: parseFloat(record['LONGITUDE']) || null,
                pincode: record['PINCODE']?.toString() || null,
                type: record['TYPE'] || 'Branch'
            },
            create: {
                code: solCode,
                sNo: parseInt(record['S NO']) || null,
                nameEn: record['BRANCH'] || '',
                openDate: record['OPEN'] || null,
                district: record['DISTRICT'] || '',
                populationGroup: record['CATEGORY'] || '',
                latitude: parseFloat(record['LATITUDE']) || null,
                longitude: parseFloat(record['LONGITUDE']) || null,
                pincode: record['PINCODE']?.toString() || null,
                type: record['TYPE'] || 'Branch'
            }
        });
    }

    // Ensure Regional Office exists
    await prisma.branch.upsert({
        where: { code: '3933' },
        update: { nameEn: 'Regional Office Dindigul', type: 'REGIONAL OFFICE', district: 'Dindigul' },
        create: { code: '3933', nameEn: 'Regional Office Dindigul', type: 'REGIONAL OFFICE', district: 'Dindigul' }
    });

    console.log(`Seeded branches (including RO).`);

    // 2.5. Seed Designations from Staff CSV
    const staffCsvPath = path.join(__dirname, '../../Staff.csv');
    const staffContent = fs.readFileSync(staffCsvPath, 'utf8');
    const rawStaffRecords = parse(staffContent, { columns: true, skip_empty_lines: true, trim: true }) as any[];

    // Clear existing designations to ensure only Grades remain
    await prisma.designation.deleteMany({});
    console.log('Cleared old designations.');

    const designationsSet = new Set<string>();
    for (const raw of rawStaffRecords) {
        const record = normalizeKeys(raw);
        const grade = record['GRADE']?.toString().trim();
        if (grade) designationsSet.add(grade);
    }

    const workClassMap: Record<string, number> = {
        'SWEEPER': 10,
        'SUBSTAFF': 20,
        'CLERICAL': 30,
        'JM I': 40,
        'MM II': 50,
        'MM III': 60,
        'SM IV': 70,
        'SM V': 80
    };

    for (const grade of designationsSet) {
        const code = grade.toUpperCase().replace(/\s+/g, '_');
        await prisma.designation.upsert({
            where: { code: code },
            update: {
                nameEn: grade,
                workId: workClassMap[grade.toUpperCase()] || 99
            },
            create: {
                code: code,
                nameEn: grade,
                workId: workClassMap[grade.toUpperCase()] || 99
            }
        });
    }
    console.log(`Seeded ${designationsSet.size} designations (from Grades) with workId.`);

    // 3. Seed Staff (Users)
    const defaultPasswordHash = await bcrypt.hash('admin123', 10);

    for (const raw of rawStaffRecords) {
        const record = normalizeKeys(raw);
        const roll = record['ROLL']?.toString().trim();
        if (!roll) continue;
        const brCode = record['BR CODE']?.toString().trim().padStart(4, '0');
        const grade = record['GRADE']?.toString().trim();

        if (!brCode) continue;

        const branch = await prisma.branch.findUnique({ where: { code: brCode } });
        if (!branch) {
            console.warn(`Branch not found for staff ${roll} (BR CODE: ${brCode})`);
            continue;
        }

        const role = brCode === '3933' ? 'SECTION_USER' : 'BRANCH_USER';
        const designationRecord = grade ? await prisma.designation.findUnique({ where: { code: grade.toUpperCase().replace(/\s+/g, '_') } }) : null;

        await prisma.user.upsert({
            where: { username: roll },
            update: {
                fullNameEn: record['NAME'] || '',
                grade: grade || '',
                branchId: branch.id,
                isRegionHead: false,
                isSecondLine: false,
                role: role,
                designationId: designationRecord?.id || null
            },
            create: {
                username: roll,
                passwordHash: defaultPasswordHash,
                fullNameEn: record['NAME'] || '',
                grade: grade || '',
                branchId: branch.id,
                isRegionHead: false,
                isSecondLine: false,
                role: role,
                designationId: designationRecord?.id || null
            }
        });
    }
    console.log(`Seeded staff members.`);

    // 4. Seed ATMs
    const atmCsvPath = path.join(__dirname, '../../ATM.csv');
    if (fs.existsSync(atmCsvPath)) {
        const atmContent = fs.readFileSync(atmCsvPath, 'utf8');
        const rawAtmRecords = parse(atmContent, { columns: true, skip_empty_lines: true, trim: true }) as any[];

        for (const raw of rawAtmRecords) {
            const record = normalizeKeys(raw);
            const brCode = record['BR CODE']?.toString().trim().padStart(4, '0');
            const atmId = record['ATM ID']?.toString().trim();

            if (!brCode || !atmId) continue;

            const branch = await prisma.branch.findUnique({ where: { code: brCode } });
            if (!branch) {
                console.warn(`Branch not found for ATM ${atmId} (BR CODE: ${brCode})`);
                continue;
            }

            await prisma.atm.upsert({
                where: { atmId: atmId },
                update: {
                    branchId: branch.id,
                    lastTxnTime: record['LAST TXT DT']?.toString() || '',
                    balance: parseFloat(record['TOTAL CASH AVAILABLE']?.toString().replace(/,/g, '')) || 0
                },
                create: {
                    atmId: atmId,
                    branchId: branch.id,
                    lastTxnTime: record['LAST TXT DT']?.toString() || '',
                    balance: parseFloat(record['TOTAL CASH AVAILABLE']?.toString().replace(/,/g, '')) || 0
                }
            });
        }
        console.log(`Seeded ATMs.`);
    }

    console.log('CSV data seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
