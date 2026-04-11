import prisma from './src/lib/prisma';

async function main() {
    const groups = await prisma.branch.groupBy({
        by: ['populationGroup']
    });
    console.log('GROUPS:', JSON.stringify(groups));
    
    // Also check for existing signatures in office notes
    const signatories = await prisma.user.findMany({
        where: {
            role: { in: ['RO_MANAGER', 'ADMIN'] }
        },
        select: { id: true, fullNameEn: true, designationEn: true }
    });
    console.log('SIGNATORIES:', JSON.stringify(signatories));
}

main().catch(console.error);
