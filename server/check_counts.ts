import prisma from './src/lib/prisma';

async function main() {
    const qualifiedCount = await prisma.accountOpening.count({
        where: {
            solId: '4153',
            isQualified: true
        }
    });
    
    const unQualifiedCount = await prisma.accountOpening.count({
        where: {
            solId: '4153',
            isQualified: false
        }
    });

    console.log(`Qualified Accounts for 4153: ${qualifiedCount}`);
    console.log(`Unqualified Accounts for 4153: ${unQualifiedCount}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
