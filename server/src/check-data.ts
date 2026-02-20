import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- BRANCHES ---");
    const branches = await (prisma as any).branch.findMany();
    console.log(JSON.stringify(branches, null, 2));

    console.log("\n--- USER SECTIONS ---");
    const users = await (prisma as any).user.findMany({
        select: { section: true }
    });
    const sections = [...new Set(users.map((u: any) => u.section).filter(Boolean))];
    console.log(sections);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
