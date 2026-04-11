import prisma from './lib/prisma';

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { fullNameEn: { contains: 'Annamalai' } },
                { designationEn: { contains: 'Chief Manager' } }
            ]
        },
        select: { 
            fullNameEn: true, fullNameHi: true, fullNameTa: true, 
            designationEn: true, designationHi: true, designationTa: true 
        }
    });
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
