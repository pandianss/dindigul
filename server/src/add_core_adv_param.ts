import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Adding "Core Adv" aggregate to registry...');

    // 1. Create Core Adv parameter
    await prisma.misParameterRegistry.upsert({
        where: { parameterName: 'Core Adv' },
        update: {
            displayName: 'Core Advances',
            category: 'Core Advances',
            parentParameterName: 'Adv',
            orderIndex: 300
        },
        create: {
            parameterName: 'Core Adv',
            displayName: 'Core Advances',
            category: 'Core Advances',
            parentParameterName: 'Adv',
            orderIndex: 300
        }
    });

    // 2. Reparent Core Ret, Core_Agri, MSME
    const constituents = ['Core Ret', 'Core_Agri', 'MSME'];
    for (let i = 0; i < constituents.length; i++) {
        await prisma.misParameterRegistry.update({
            where: { parameterName: constituents[i] },
            data: {
                parentParameterName: 'Core Adv',
                orderIndex: 310 + (i * 10),
                category: 'Core Advances'
            }
        });
    }

    console.log('Database updated successfully.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
