const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const letters = await prisma.letter.findMany({
        where: { status: 'DRAFT' }
    });

    const ro = await prisma.branch.findFirst({ where: { type: 'RO' } });

    let updateCount = 0;
    for (const letter of letters) {
        if (letter.orgMeta) {
            let meta = letter.orgMeta;
            if (typeof meta === 'string') {
                meta = JSON.parse(meta);
            }

            meta.phone = ro.phone || "+91 451 2420000";
            meta.email = ro.email || "ro.dindigul@bank.com";

            await prisma.letter.update({
                where: { id: letter.id },
                data: { orgMeta: meta }
            });
            updateCount++;
        }
    }

    console.log(`Updated ${updateCount} draft letters with latest RO contact info.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
