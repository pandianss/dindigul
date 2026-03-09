import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { username: '63039' },
                { fullNameEn: { contains: 'SATISH' } }
            ]
        },
        include: {
            departments: true,
            managedDepartments: true,
            department: true
        }
    });
    console.log(JSON.stringify(user, null, 2));
    await prisma.$disconnect();
}
run();
