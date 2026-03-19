import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Establishing full "Mother Parameter" hierarchy...');

    const updates = [
        // Level 0: Root
        { name: 'Bus', parent: null, order: 1, category: 'Key Business Parameters' },

        // Level 1: Primary Aggregates
        { name: 'Total Dep', parent: 'Bus', order: 2, category: 'Key Business Parameters' },
        { name: 'Adv', parent: 'Bus', order: 10, category: 'Key Business Parameters' },

        // Level 2: Secondary Aggregates under Total Dep
        { name: 'CASA', parent: 'Total Dep', order: 3, category: 'Key Business Parameters' },
        { name: 'TD', parent: 'Total Dep', order: 5, category: 'Key Business Parameters' },

        // Level 2: Specifics under Advances
        { name: 'NPA', parent: 'Adv', order: 11, category: 'Key Business Parameters' },
        { name: 'CD_Ratio', parent: 'Adv', order: 12, category: 'Key Business Parameters' },
        { name: 'Gold', parent: 'Adv', order: 20, category: 'Jewel Loans' },
        { name: 'Core Ret', parent: 'Adv', order: 30, category: 'Core Advances' },
        { name: 'Core_Agri', parent: 'Adv', order: 31, category: 'Core Advances' },
        { name: 'MSME', parent: 'Adv', order: 32, category: 'Core Advances' },

        // Level 3: Tertiaries under CASA
        { name: 'SB', parent: 'CASA', order: 3.1, category: 'Key Business Parameters' },
        { name: 'CD', parent: 'CASA', order: 3.2, category: 'Key Business Parameters' },
        { name: 'CASA%', parent: 'CASA', order: 3.3, category: 'Key Business Parameters' },

        // Level 3: Tertiaries under TD
        { name: 'Ret_TD', parent: 'TD', order: 5.1, category: 'Key Business Parameters' },

        // Level 3: Tertiaries under Gold
        { name: 'Ret-Gold', parent: 'Gold', order: 21, category: 'Jewel Loans' },
        { name: 'Agri_JL', parent: 'Gold', order: 22, category: 'Jewel Loans' }
    ];

    for (const u of updates) {
        // We use integer orderIndex for DB, so let's multiply by 10 or just use sequence
        // Actually, just using a sequence based on the desired visual flow is better.
    }

    // Sequence based on user request flow
    const sequence = [
        { name: 'Bus', parent: null, cat: 'Key Business Parameters' },
        { name: 'Total Dep', parent: 'Bus', cat: 'Key Business Parameters' },
        { name: 'CASA', parent: 'Total Dep', cat: 'Key Business Parameters' },
        { name: 'SB', parent: 'CASA', cat: 'Key Business Parameters' },
        { name: 'CD', parent: 'CASA', cat: 'Key Business Parameters' },
        { name: 'CASA%', parent: 'CASA', cat: 'Key Business Parameters' },
        { name: 'TD', parent: 'Total Dep', cat: 'Key Business Parameters' },
        { name: 'Ret_TD', parent: 'TD', cat: 'Key Business Parameters' },
        { name: 'Bulk_Dep', parent: 'TD', cat: 'Key Business Parameters' },
        { name: 'Adv', parent: 'Bus', cat: 'Key Business Parameters' },
        { name: 'CD_Ratio', parent: 'Adv', cat: 'Key Business Parameters' },
        { name: 'NPA', parent: 'Adv', cat: 'Key Business Parameters' },
        { name: 'Gold', parent: 'Adv', cat: 'Jewel Loans' },
        { name: 'Ret-Gold', parent: 'Gold', cat: 'Jewel Loans' },
        { name: 'Agri_JL', parent: 'Gold', cat: 'Jewel Loans' },
        { name: 'Core Adv', parent: 'Adv', cat: 'Core Advances' },
        { name: 'Core Ret', parent: 'Core Adv', cat: 'Core Advances' },
        { name: 'HL', parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'EL', parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'VL', parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'Mort', parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'Liq', parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'OthRet', parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'PersonalLoan', parent: 'Core Ret', cat: 'Core Advances' },
        { name: 'Core_Agri', parent: 'Core Adv', cat: 'Core Advances' },
        { name: 'KCC', parent: 'Core_Agri', cat: 'Core Advances' },
        { name: 'SHG', parent: 'Core_Agri', cat: 'Core Advances' },
        { name: 'Gov', parent: 'Core_Agri', cat: 'Core Advances' },
        { name: 'OthSch', parent: 'Core_Agri', cat: 'Core Advances' },
        { name: 'MSME', parent: 'Core Adv', cat: 'Core Advances' },
        { name: 'Mudra', parent: 'MSME', cat: 'Core Advances' },
        { name: 'Branch_PL', parent: 'Bus', cat: 'Profitability' }
    ];

    for (let i = 0; i < sequence.length; i++) {
        const item = sequence[i];
        await prisma.misParameterRegistry.update({
            where: { parameterName: item.name },
            data: {
                parentParameterName: item.parent,
                orderIndex: (i + 1) * 10,
                category: item.cat
            }
        });
    }

    console.log('Hierarchy established successfully.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
