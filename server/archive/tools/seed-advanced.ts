import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient({
    log: ['error', 'warn']
});

function safeParseInt(val: any): number | null {
    const p = parseInt(val);
    return isNaN(p) ? null : p;
}

function safeParseFloat(val: any): number | null {
    const p = parseFloat(val);
    return isNaN(p) ? null : p;
}

async function main() {
    console.log('Starting advanced seeding...');

    try {
        // 1. Create Departments for Regional Office
        const deptNames = [
            'Accounts',
            'Human Resources',
            'Information Technology',
            'Planning & Development',
            'Audit & Inspection',
            'Law & Recovery',
            'Operations'
        ];

        const departments: any[] = [];
        for (const name of deptNames) {
            const d = await prisma.department.upsert({
                where: { code: name.toUpperCase().replace(/\s+/g, '_') },
                update: { nameEn: name },
                create: {
                    code: name.toUpperCase().replace(/\s+/g, '_'),
                    nameEn: name
                }
            });
            departments.push(d);
        }
        console.log(`Upserted ${departments.length} departments.`);

        // 2. Load and Upsert Branches
        const branchesCsvPath = path.join(__dirname, '../../branches.csv');
        const branchesContent = fs.readFileSync(branchesCsvPath, 'utf8');
        const rawBranchRecords: any[] = parse(branchesContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        const branchRecords = rawBranchRecords.map(record => {
            const normalized: any = {};
            for (const key of Object.keys(record)) {
                normalized[key.trim()] = record[key];
            }
            return normalized;
        });

        console.log(`Processing ${branchRecords.length} branches from CSV (DEBUG: only first 5)...`);

        for (const record of branchRecords.slice(0, 5)) {
            const solRaw = record['SOL'];
            if (!solRaw) continue;
            const solCode = solRaw.toString().padStart(4, '0');
            console.log(`--- Attempting Branch Upsert: ${solCode}`);

            try {
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
                console.log(`--- SUCCESS: ${solCode}`);
            } catch (err: any) {
                console.error(`!!!! FAILED AT BRANCH ${solCode}`);
                throw err;
            }
        }

        // Ensure Regional Office (3933) exists
        await prisma.branch.upsert({
            where: { code: '3933' },
            update: { type: 'REGIONAL OFFICE', nameEn: 'Regional Office Dindigul' },
            create: {
                code: '3933',
                nameEn: 'Regional Office Dindigul',
                type: 'REGIONAL OFFICE',
                district: 'Dindigul'
            }
        });

        // 3. Load and Upsert Staff
        const staffCsvPath = path.join(__dirname, '../../Staff.csv');
        const staffContent = fs.readFileSync(staffCsvPath, 'utf8');
        const rawStaffRecords: any[] = parse(staffContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        const staffRecords = rawStaffRecords.map(record => {
            const normalized: any = {};
            for (const key of Object.keys(record)) {
                normalized[key.trim()] = record[key];
            }
            return normalized;
        });

        console.log(`Processing ${staffRecords.length} staff records...`);

        const roStaffIds: string[] = [];

        for (const record of staffRecords) {
            const roll = record['Roll']?.toString();
            if (!roll) continue;
            const brCodeRaw = record['br code'];
            if (!brCodeRaw) continue;
            const brCode = brCodeRaw.toString().padStart(4, '0');
            const designation = record['Designation'] || '';

            const branch = await prisma.branch.findUnique({ where: { code: brCode } });
            if (!branch) continue;

            const isIline = designation.includes('I line');
            const isIIline = designation.includes('II line');
            const isSRM = designation.includes('SENIOR REGIONAL MANAGER');

            const user = await prisma.user.upsert({
                where: { username: roll },
                update: {
                    fullNameEn: record['Name'],
                    grade: record['Grade'],
                    branchId: branch.id,
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
                    isRegionHead: isSRM,
                    isSecondLine: isIIline,
                    role: isSRM || designation.includes('CHIEF MANAGER') ? 'RO_MANAGER' : (brCode === '3933' ? 'SECTION_USER' : 'BRANCH_USER')
                }
            });

            if (isIline && !isSRM) {
                await prisma.branch.update({
                    where: { id: branch.id },
                    data: { headUser: { connect: { id: user.id } } }
                });
            }
            if (isIIline && !isSRM && brCode !== '3933') {
                await prisma.branch.update({
                    where: { id: branch.id },
                    data: { secondLineUser: { connect: { id: user.id } } }
                });
            }

            if (brCode === '3933') {
                roStaffIds.push(user.id);
            }
        }

        // 4. Handle RO Departments
        console.log('Mapping RO Staff to Departments...');
        for (let i = 0; i < roStaffIds.length; i++) {
            const userId = roStaffIds[i];
            const dept1 = departments[i % departments.length];
            const dept2 = departments[(i + 3) % departments.length];

            await prisma.user.update({
                where: { id: userId },
                data: {
                    departments: {
                        connect: [
                            { id: dept1.id },
                            { id: dept2.id }
                        ]
                    }
                }
            });
        }

        // Re-linking dept heads
        for (const userId of roStaffIds) {
            const user = await prisma.user.findUnique({ where: { id: userId }, include: { departments: true } });
            if (!user) continue;

            const staffRecord = staffRecords.find(r => r.Roll?.toString() === user.username);
            const desigStr = staffRecord?.Designation || '';

            if (desigStr.includes('CHIEF MANAGER') || (desigStr.includes('SENIOR MANAGER') && !desigStr.includes('I line'))) {
                if (user.departments.length > 0) {
                    await prisma.department.update({
                        where: { id: user.departments[0].id },
                        data: { heads: { connect: { id: userId } } }
                    });
                }
            }
        }

        console.log('Advanced seeding completed successfully!');
    } catch (err: any) {
        console.error('CRITICAL SEED ERROR:');
        console.error(err.message || err);
        if (err.meta) console.error('Meta:', err.meta);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
