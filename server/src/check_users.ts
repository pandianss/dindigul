import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { fullNameEn: { contains: 'Niraj' } },
                { fullNameEn: { contains: 'Annamalai' } },
                { designationEn: { contains: 'Chief Manager' } }
            ]
        },
        include: { designation: true }
    });
    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
