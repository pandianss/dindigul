const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const branches = await prisma.branch.findMany({
        select: { code: true, name: true }
    });
    console.log('Branches in DB:', branches.length);
    branches.slice(0, 10).forEach(b => {
        console.log(`- ${b.code}: ${b.name}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
