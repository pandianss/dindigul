import prisma from '../lib/prisma';

async function main() {
    const branches = await prisma.branch.findMany({
        select: { code: true, nameEn: true, officeId: true },
        orderBy: { officeId: 'asc' },
        take: 30
    });
    console.log('Sample branch codes from DB:');
    branches.forEach(b => console.log(`  code="${b.code}"  officeId=${b.officeId}  name="${b.nameEn}"`));

    // Check for Silukkuwarpatti
    const silu = await prisma.branch.findMany({
        where: { nameEn: { contains: 'SILUKKU', mode: 'insensitive' } },
        select: { code: true, nameEn: true, officeId: true }
    });
    console.log('\nSilukkuwarpatti branches:', silu);

    // Check for branches with CSV codes
    const csvCodes = ['174', '175', '176', '3920'];
    const csvMatches = await prisma.branch.findMany({
        where: { code: { in: csvCodes } },
        select: { code: true, nameEn: true }
    });
    console.log('\nBranches matching raw CSV codes (174, 175, 176, 3920):', csvMatches);

    // Check if zero-padded versions exist
    const paddedCodes = csvCodes.map(c => c.padStart(5, '0'));
    const paddedMatches = await prisma.branch.findMany({
        where: { code: { in: paddedCodes } },
        select: { code: true, nameEn: true }
    });
    console.log('\nBranches matching zero-padded codes (00174, etc.):', paddedMatches);

    await prisma.$disconnect();
}
main().catch(console.error);
