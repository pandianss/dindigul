import prisma from '../lib/prisma';

async function main() {
    const ps = await prisma.misInformationPanel.findMany({
        where: { parameter: 'Bulk_Dep', val_current: 4.5 },
        include: { snapshot: { include: { branch: true } } }
    });
    console.log(JSON.stringify(ps, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
