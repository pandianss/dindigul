const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const branches = await prisma.branch.findMany({
        orderBy: { code: 'asc' }
    });
    console.log(`Total branches: ${branches.length}`);
    branches.forEach(b => console.log(`${b.code} - ${b.nameEn}`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
