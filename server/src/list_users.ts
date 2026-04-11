import prisma from './lib/prisma';

async function main() {
    const users = await prisma.user.findMany({
        take: 20,
        select: { fullNameEn: true, designationEn: true }
    });
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
