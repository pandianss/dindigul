const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const draftLetter = await prisma.letter.findFirst({
        where: { status: 'DRAFT' }
    });

    if (draftLetter) {
        console.log("Draft Letter orgMeta:", draftLetter.orgMeta);
    } else {
        console.log("No draft letters found.");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
