import prisma from './src/lib/prisma';

async function main() {
    const unQualified = await prisma.accountOpening.findMany({
        where: {
            solId: '4153',
            isQualified: false
        },
        take: 5
    });

    console.log("Sample of 5 Unqualified Accounts:");
    console.log(JSON.stringify(unQualified.map(a => ({
        foracid: a.foracid,
        clrBalAmt: a.clrBalAmt.toString(),
        rejectionReason: a.rejectionReason,
        schmCode: a.schmCode,
        accountClass: a.accountClass
    })), null, 2));

    const qualified = await prisma.accountOpening.findMany({
        where: {
            solId: '4153',
            isQualified: true
        },
        take: 5
    });
    console.log("\nSample of 5 Qualified Accounts:");
    console.log(JSON.stringify(qualified.map(a => ({
        foracid: a.foracid,
        clrBalAmt: a.clrBalAmt.toString(),
        rejectionReason: a.rejectionReason,
        schmCode: a.schmCode,
        accountClass: a.accountClass
    })), null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
