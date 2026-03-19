import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Aligning all parameter sort indexes for strict hierarchy...');

    const sequence = [
        // Level 0
        { name: 'Bus', order: 10, parent: null, cat: 'Key Business Parameters' },

        // Level 1: Under Business
        { name: 'Total Dep', order: 20, parent: 'Bus', cat: 'Key Business Parameters' },
        { name: 'CASA', order: 30, parent: 'Total Dep', cat: 'Key Business Parameters' },
        { name: 'SB', order: 40, parent: 'CASA', cat: 'Key Business Parameters' },
        { name: 'CD', order: 50, parent: 'CASA', cat: 'Key Business Parameters' },
        { name: 'CASA%', order: 60, parent: 'CASA', cat: 'Key Business Parameters' },
        { name: 'TD', order: 70, parent: 'Total Dep', cat: 'Key Business Parameters' },
        { name: 'Ret_TD', order: 80, parent: 'TD', cat: 'Key Business Parameters' },

        { name: 'Adv', order: 100, parent: 'Bus', cat: 'Key Business Parameters' },
        { name: 'CD_Ratio', order: 110, parent: 'Adv', cat: 'Key Business Parameters' },
        { name: 'NPA', order: 120, parent: 'Adv', cat: 'Key Business Parameters' },

        { name: 'Gold', order: 200, parent: 'Adv', cat: 'Jewel Loans' },
        { name: 'Ret-Gold', order: 210, parent: 'Gold', cat: 'Jewel Loans' },
        { name: 'Agri_JL', order: 220, parent: 'Gold', cat: 'Jewel Loans' },

        { name: 'Core Adv', order: 300, parent: 'Adv', cat: 'Core Advances' },
        { name: 'Core Ret', order: 310, parent: 'Core Adv', cat: 'Core Advances' },
        { name: 'HL', order: 311, parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'PersonalLoan', order: 312, parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'EL', order: 313, parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'VL', order: 314, parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'Mort', order: 315, parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'Liq', order: 316, parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'OthRet', order: 317, parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'Core_Agri', order: 320, parent: 'Core Adv', cat: 'Core Advances' },
        { name: 'KCC', order: 321, parent: 'Core_Agri', cat: 'Core Advances' },
        { name: 'SHG', order: 322, parent: 'Core_Agri', cat: 'Core Advances' },
        { name: 'Gov', order: 323, parent: 'Core_Agri', cat: 'Core Advances' },
        { name: 'OthSch', order: 324, parent: 'Core_Agri', cat: 'Core Advances' },
        { name: 'MSME', order: 330, parent: 'Core Adv', cat: 'Core Advances' },
        { name: 'Mudra', order: 331, parent: 'MSME', cat: 'Core Advances' }
    ];

    for (const item of sequence) {
        await prisma.misParameterRegistry.update({
            where: { parameterName: item.name },
            data: {
                parentParameterName: item.parent,
                orderIndex: item.order,
                category: item.cat
            }
        });
    }

    console.log('All parameters aligned successfully.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
