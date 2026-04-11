const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { fullNameEn: { contains: 'Annamalai' } },
        include: { designation: true }
    });
    console.log(JSON.stringify(user, null, 2));
    await prisma.$disconnect();
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
