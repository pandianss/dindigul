const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const notes = await prisma.officeNote.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            preparer: {
                select: { id: true, fullNameEn: true, username: true }
            }
        }
    });
    console.log(JSON.stringify(notes, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
