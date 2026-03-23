import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const params = await prisma.misParameterRegistry.findMany({
        where: { parameterName: { in: ['Core Ret', 'PersonalLoan', 'Ret_TD', 'Bulk_Dep', 'TD'] } }
    });

    console.log('--- Final Hierarchy Check ---');
    params.forEach((p: any) => {
        console.log(`${p.parameterName}: parent=${p.parentParameterName}, category=${p.category}`);
    });
}

main().catch(console.error).finally(() => prisma.$disconnect());
