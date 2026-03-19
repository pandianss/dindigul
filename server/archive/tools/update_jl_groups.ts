import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating Jewel Loan categories and ordering...');

    // 1. Update overall "Gold" (Jewel Loan)
    await prisma.misParameterRegistry.update({
        where: { parameterName: 'Gold' },
        data: {
            category: 'Jewel Loans',
            orderIndex: 20
        }
    });

    // 2. Update "Ret-Gold" (Retail JL)
    await prisma.misParameterRegistry.update({
        where: { parameterName: 'Ret-Gold' },
        data: {
            category: 'Jewel Loans',
            orderIndex: 21
        }
    });

    // 3. Update "Agri_JL" (Agri JL)
    await prisma.misParameterRegistry.update({
        where: { parameterName: 'Agri_JL' },
        data: {
            category: 'Jewel Loans',
            orderIndex: 22
        }
    });

    console.log('Update complete.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
