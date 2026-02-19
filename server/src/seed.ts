import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('admin123', 10);

    const admin = await (prisma as any).user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            passwordHash,
            fullNameEn: 'System Administrator',
            role: 'ADMIN',
            section: 'IT'
        }
    });

    console.log('Seeded admin user:', admin.username);

    // Seed some initial branches
    const branches = [
        { code: 'B001', nameEn: 'Dindigul Main', type: 'URBAN' },
        { code: 'B002', nameEn: 'Palani Road', type: 'SEMI_URBAN' },
        { code: 'B003', nameEn: 'Collectorate Branch', type: 'URBAN' }
    ];

    for (const b of branches) {
        await (prisma as any).branch.upsert({
            where: { code: b.code },
            update: {},
            create: b
        });
    }

    console.log('Seeded initial branches');

    // Seed some initial parameters for MIS
    const parameters = [
        { code: 'TOTAL_DEPOSITS', nameEn: 'Total Deposits', category: 'DEPOSITS', unit: 'Cr' },
        { code: 'TOTAL_ADVANCES', nameEn: 'Total Advances', category: 'ADVANCES', unit: 'Cr' },
        { code: 'CASA_RATIO', nameEn: 'CASA Ratio', category: 'RATIO', unit: '%' },
        { code: 'GROSS_NPA', nameEn: 'Gross NPA', category: 'ASSET_QUALITY', unit: '%' }
    ];

    for (const p of parameters) {
        await prisma.parameter.upsert({
            where: { code: p.code },
            update: {},
            create: p
        });
    }

    // Seed some initial requests for Request Management
    const itParam = await (prisma as any).parameter.findUnique({ where: { code: 'TOTAL_DEPOSITS' } }); // Just for user/branch context
    const mainBranch = await (prisma as any).branch.findUnique({ where: { code: 'B001' } });

    if (mainBranch) {
        await (prisma as any).branchRequest.create({
            data: {
                titleEn: 'UPS Battery Backup Issue',
                contentEn: 'The UPS in the cash cabin is not providing backup during power switches. Needs immediate technician visit.',
                category: 'IT',
                status: 'OPEN',
                priority: 'HIGH',
                branchId: mainBranch.id,
                userId: admin.id,
                assignedSection: 'IT'
            }
        });

        await (prisma as any).branchRequest.create({
            data: {
                titleEn: 'Stationery Requisition - August',
                contentEn: 'Monthly requirement for account opening forms and DD leaflets.',
                category: 'STATIONERY',
                status: 'IN_PROGRESS',
                priority: 'LOW',
                branchId: mainBranch.id,
                userId: admin.id,
                assignedSection: 'Planning'
            }
        });
    }

    // Seed committees for Phase 5
    const olc = await (prisma as any).committee.upsert({
        where: { code: 'OLC' },
        update: {},
        create: {
            nameEn: 'Official Language Committee',
            code: 'OLC',
            frequency: 'QUARTERLY'
        }
    });

    const lsc = await (prisma as any).committee.upsert({
        where: { code: 'LSC' },
        update: {},
        create: {
            nameEn: 'Local Staff Committee',
            code: 'LSC',
            frequency: 'MONTHLY'
        }
    });

    // Seed a meeting with action points
    await (prisma as any).meeting.create({
        data: {
            committeeId: lsc.id,
            date: new Date(),
            venue: 'Regional Office Conference Hall',
            status: 'FINALIZED',
            minutesJson: JSON.stringify({ content: 'Discussed staff welfare and branch security measures.' }),
            actionPoints: {
                create: [
                    {
                        content: 'Install new CCTV cameras in 5 rural branches',
                        status: 'PENDING',
                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
                        assignedToUserId: admin.id
                    }
                ]
            }
        }
    });

    // Seed stationery items for Phase 6
    const forms = await (prisma as any).stationeryItem.upsert({
        where: { nameEn: 'Account Opening Forms (SB)' },
        update: {},
        create: { nameEn: 'Account Opening Forms (SB)', stockLevel: 500 }
    });

    const passbooks = await (prisma as any).stationeryItem.upsert({
        where: { nameEn: 'Savings Passbooks (Blank)' },
        update: {},
        create: { nameEn: 'Savings Passbooks (Blank)', stockLevel: 200 }
    });

    // Seed movements
    await (prisma as any).stationeryMovement.create({
        data: {
            itemId: forms.id,
            branchId: mainBranch?.id,
            quantity: 100,
            type: 'ISSUE',
            remarks: 'Quarterly supply'
        }
    });

    // Seed dispatch records
    await (prisma as any).dispatchRecord.create({
        data: {
            type: 'INWARD',
            subject: 'Circular on Gold Loan Interest Rates',
            sender: 'Head Office, Chennai',
            recipient: 'Regional Office',
            referenceNo: 'HO/ACCTS/2026/45',
            status: 'RECEIVED'
        }
    });

    await (prisma as any).dispatchRecord.create({
        data: {
            type: 'OUTWARD',
            subject: 'Transfer Order - Mr. Ramesh K',
            sender: 'Regional Office',
            recipient: 'Dindigul Main Branch',
            consignmentNo: 'SP123456789IN',
            status: 'PENDING'
        }
    });

    console.log('Seeded/Updated initial logistics data');

    // Seed budgets for Phase 7
    const itBudget = await (prisma as any).budget.upsert({
        where: { section_financialYear: { section: 'IT', financialYear: '2025-26' } },
        update: {},
        create: {
            section: 'IT',
            financialYear: '2025-26',
            allocationAmount: 500000,
            spentAmount: 0
        }
    });

    await (prisma as any).budget.upsert({
        where: { section_financialYear: { section: 'Premises', financialYear: '2025-26' } },
        update: {},
        create: {
            section: 'Premises',
            financialYear: '2025-26',
            allocationAmount: 1200000,
            spentAmount: 150000 // Sample existing spend
        }
    });

    await (prisma as any).budget.upsert({
        where: { section_financialYear: { section: 'HR', financialYear: '2025-26' } },
        update: {},
        create: {
            section: 'HR',
            financialYear: '2025-26',
            allocationAmount: 300000,
            spentAmount: 0
        }
    });

    console.log('Seeded/Updated Phase 7 budget data');

    // Seed Legal Cases for Phase 8
    const sampleCase = await (prisma as any).legalCase.upsert({
        where: { caseNo: 'WP/4567/2025' },
        update: {},
        create: {
            caseNo: 'WP/4567/2025',
            courtName: 'High Court, Madras',
            parties: 'Bank vs. M/s Industrial Steels',
            nextHearingDate: new Date('2026-03-15'),
            advocateName: 'Shri. Sundaram',
            status: 'PENDING',
            category: 'CIVIL'
        }
    });

    // Seed Recovery Actions for Phase 8
    const dindigulMain = await (prisma as any).branch.findFirst({ where: { code: '6101' } });
    if (dindigulMain) {
        await (prisma as any).recoveryAction.create({
            data: {
                accountName: 'K. Ranganathan (NPA)',
                amountInvolved: 850000,
                type: 'SARFAESI',
                status: 'POSSESSION_TAKEN',
                branchId: dindigulMain.id,
                remarks: 'Physical possession taken on 12.02.2026'
            }
        });

        await (prisma as any).recoveryAction.create({
            data: {
                accountName: 'Latha & Co (OTS)',
                amountInvolved: 420000,
                type: 'OTS',
                status: 'NOTIFIED',
                branchId: dindigulMain.id,
                remarks: 'OTS proposal under verification'
            }
        });
    }

    console.log('Seeded Phase 8 Legal & Recovery data');

    // Seed Audit Observations for Phase 9
    const dindigulCity = await (prisma as any).branch.findFirst({ where: { code: '6102' } });
    if (dindigulCity) {
        await (prisma as any).auditObservation.create({
            data: {
                auditType: 'CONCURRENT',
                observation: 'Duplicate payments detected in electricity bills for Oct-Dec 2025.',
                riskLevel: 'HIGH',
                status: 'PENDING',
                branchId: dindigulCity.id,
                targetDate: new Date('2026-03-30'),
                auditDate: new Date('2026-02-10')
            }
        });

        await (prisma as any).auditObservation.create({
            data: {
                auditType: 'LFAR',
                observation: 'Branch keys inventory not signed by the Assistant Manager for Jan 2026.',
                riskLevel: 'MEDIUM',
                status: 'RECTIFIED',
                rectificationDetails: 'Inventory verified and signed on 15.02.2026. Register updated.',
                branchId: dindigulCity.id,
                targetDate: new Date('2026-02-28'),
                auditDate: new Date('2026-01-20')
            }
        });
    }

    console.log('Seeded Phase 9 Audit & Compliance data');

    // Seed Regional Assets for Phase 10
    const cityBranch = await (prisma as any).branch.findFirst({ where: { code: '6101' } });
    if (cityBranch) {
        const locker = await (prisma as any).regionalAsset.create({
            data: {
                assetCode: 'RO/LOK/2026/01',
                category: 'LOCKER',
                description: 'Godrej Safe Case (6-Lever)',
                purchaseDate: new Date('2025-05-15'),
                purchaseValue: 85000,
                condition: 'GOOD',
                branchId: cityBranch.id
            }
        });

        const genset = await (prisma as any).regionalAsset.create({
            data: {
                assetCode: 'RO/MCH/2026/04',
                category: 'MACHINERY',
                description: 'Kirloskar 15kVA Silent Genset',
                purchaseDate: new Date('2024-11-20'),
                purchaseValue: 245000,
                condition: 'GOOD',
                amcExpiry: new Date('2026-03-15'),
                branchId: cityBranch.id
            }
        });

        await (prisma as any).maintenanceRecord.create({
            data: {
                assetId: genset.id,
                serviceDate: new Date('2025-11-20'),
                serviceProvider: 'Sri Vinayaga Electricals',
                cost: 4500,
                remarks: 'Regular oil and filter change. Filter cleaning done.',
                nextServiceDue: new Date('2026-02-20')
            }
        });
    }

    console.log('Seeded Phase 10 Asset & Maintenance data');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
