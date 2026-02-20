import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Restoring master data (Trilingual)...');

    // 1. Departments
    const depts = [
        { code: 'GAD', nameEn: 'General Administration Department', nameTa: 'பொது நிர்வாகத் துறை', nameHi: 'सामान्य प्रशासन विभाग' },
        { code: 'PLN', nameEn: 'Planning and Development', nameTa: 'திட்டமிடல் மற்றும் மேம்பாடு', nameHi: 'योजना और विकास' },
        { code: 'HRD', nameEn: 'Human Resource Development', nameTa: 'மனித வள மேம்பாடு', nameHi: 'मानव संसाधन विकास' },
        { code: 'ITD', nameEn: 'Information Technology', nameTa: 'தகவல் தொழில்நுட்பத் துறை', nameHi: 'सूचना प्रौद्योगिकी विभाग' },
        { code: 'CRD', nameEn: 'Credit Department', nameTa: 'கடன் துறை', nameHi: 'ऋण विभाग' },
        { code: 'RECO', nameEn: 'Recovery Department', nameTa: 'வசூல் துறை', nameHi: 'वसूली विभाग' }
    ];

    for (const d of depts) {
        await prisma.department.upsert({
            where: { code: d.code },
            update: d,
            create: d
        });
    }

    // 2. Designations
    const designations = [
        { code: 'RM', nameEn: 'Regional Manager', nameTa: 'மண்டல மேலாளர்', nameHi: 'क्षेत्रीय प्रबंधक', workId: 10 },
        { code: 'AGM', nameEn: 'Assistant General Manager', nameTa: 'உதவி பொது மேலாளர்', nameHi: 'सहायक महाप्रबंधक', workId: 20 },
        { code: 'CM', nameEn: 'Chief Manager', nameTa: 'தலைமை மேலாளர்', nameHi: 'मुख्य प्रबंधक', workId: 30 },
        { code: 'SM', nameEn: 'Senior Manager', nameTa: 'மூத்த மேலாளர்', nameHi: 'वरिष्ठ प्रबंधक', workId: 40 },
        { code: 'MGR', nameEn: 'Manager', nameTa: 'மேலாளர்', nameHi: 'प्रबंधक', workId: 50 },
        { code: 'AM', nameEn: 'Assistant Manager', nameTa: 'உதவி மேலாளர்', nameHi: 'सहायक प्रबंधक', workId: 60 }
    ];

    for (const ds of designations) {
        await prisma.designation.upsert({
            where: { code: ds.code },
            update: ds,
            create: ds
        });
    }

    // 3. Branches / Units
    const branches = [
        { code: 'RO_DGL', officeId: 100, nameEn: 'Regional Office Dindigul', nameTa: 'மண்டல அலுவலகம் திண்டுக்கல்', nameHi: 'क्षेत्रीय कार्यालय डिंडिगुल', type: 'RO', populationGroup: 'URBAN', riskCategory: 'LOW', specialStatus: '' },
        { code: 'LPC_DGL', officeId: 200, nameEn: 'LPC Dindigul', nameTa: 'எல்பிசி திண்டுக்கல்', nameHi: 'एलपीसी डिंडिगुल', type: 'LPC', populationGroup: 'URBAN', riskCategory: 'LOW', specialStatus: '' },
        { code: 'BR_MAIN', officeId: 1001, nameEn: 'Dindigul Main Branch', nameTa: 'திண்டுக்கல் முக்கிய கிளை', nameHi: 'डिंडिगुल मुख्य शाखा', type: 'BRANCH', populationGroup: 'URBAN', riskCategory: 'MEDIUM', specialStatus: '["Retail", "Forex"]' },
        { code: 'BR_PALANI', officeId: 1002, nameEn: 'Palani Branch', nameTa: 'பழனி கிளை', nameHi: 'पलानी शाखा', type: 'BRANCH', populationGroup: 'SEMI_URBAN', riskCategory: 'LOW', specialStatus: '["Agri"]' }
    ];

    for (const b of branches) {
        await prisma.branch.upsert({
            where: { code: b.code },
            update: b,
            create: b
        });
    }

    // 4. Parameters (For Letter Generation)
    const totalDeposits = await prisma.parameter.upsert({
        where: { code: 'TOTAL_DEPOSITS' },
        update: {},
        create: {
            code: 'TOTAL_DEPOSITS',
            nameEn: 'Total Deposits',
            nameTa: 'மொத்த வைப்புத்தொகை',
            nameHi: 'कुल जमा',
            category: 'DEPOSITS',
            unit: 'Cr'
        }
    });

    // 5. Sample Snapshots
    const allBranches = await prisma.branch.findMany({ where: { type: 'BRANCH' } });
    for (const br of allBranches) {
        const val = br.code === 'BR_MAIN' ? 250.5 : 120.2;
        const budget = br.code === 'BR_MAIN' ? 240.0 : 150.0;

        await prisma.snapshot.create({
            data: {
                date: new Date(),
                parameterId: totalDeposits.id,
                branchId: br.id,
                value: val,
                budget: budget,
                status: val >= budget ? 'SURPASSED' : 'LAGGING'
            }
        });
    }

    // 6. Admin User
    const adminDept = await prisma.department.findUnique({ where: { code: 'GAD' } });
    const adminDesig = await prisma.designation.findUnique({ where: { code: 'RM' } });
    const adminBranch = await prisma.branch.findUnique({ where: { code: 'RO_DGL' } });

    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            fullNameHi: 'प्रशासक'
        },
        create: {
            id: 'admin',
            username: 'admin',
            passwordHash: 'ignore_for_dev',
            fullNameEn: 'Administrator',
            fullNameTa: 'நிர்வாகி',
            fullNameHi: 'प्रशासक',
            role: 'ADMIN',
            departmentId: adminDept?.id || null,
            designationId: adminDesig?.id || null,
            branchId: adminBranch?.id || null
        }
    });

    console.log('Trilingual master data restoration complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
