import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating Regional Office address data...');

    // Check if RO (6100) exists
    let ro = await prisma.branch.findUnique({
        where: { code: '6100' }
    });

    if (!ro) {
        console.log('RO 6100 not found, creating it...');
        ro = await prisma.branch.create({
            data: {
                code: '6100',
                nameEn: 'Dindigul Regional Office',
                nameTa: 'திண்டுக்கல் மண்டல அலுவலகம்',
                nameHi: 'दिण्डुक्कल क्षेत्रीय कार्यालय',
                type: 'RO',
                address: 'No. 3/2, Palani Road, Dindigul - 624001',
                addressTa: 'எண். 3/2, பழனி சாலை, திண்டுக்கல் - 624001',
                addressHi: 'नंबर 3/2, पलानी रोड, दिण्डुक्कल - 624001'
            }
        });
    } else {
        console.log('Updating existing RO 6100...');
        ro = await prisma.branch.update({
            where: { code: '6100' },
            data: {
                address: 'No. 3/2, Palani Road, Dindigul - 624001',
                addressTa: 'எண். 3/2, பழனி சாலை, திண்டுக்கல் - 624001',
                addressHi: 'नंबर 3/2, पलानी रोड, दिण्डुक्कल - 624001'
            }
        });
    }

    console.log('Updated RO:', ro.code, ro.address);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
