export { };
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding system configuration...');

    await prisma.systemConfig.upsert({
        where: { key: 'MIN_OPENING_BALANCE' },
        update: {},
        create: {
            key: 'MIN_OPENING_BALANCE',
            value: '500', // Default value
            dataType: 'NUMBER',
            group: 'PLANNING'
        }
    });

    const letterCriteriaDefaults = [
        // Which parameters trigger letters (comma-separated Parameter codes from the `parameters` table)
        { key: 'LETTER_ENABLED_PARAMS', value: 'TOTAL_DEPOSITS,CASA,NPA,ADV', dataType: 'STRING' },

        // Top N branches by achievement receive APPRECIATION letters (per parameter)
        { key: 'LETTER_APPRECIATION_TOP_N', value: '3', dataType: 'NUMBER' },

        // Bottom N branches by achievement receive EXPLANATION letters (per parameter)
        { key: 'LETTER_EXPLANATION_BOTTOM_N', value: '3', dataType: 'NUMBER' },

        // Branches that achieved >= this % of budget get APPRECIATION (overrides rank if set > 0)
        // Set to 0 to use pure rank mode (top N only)
        { key: 'LETTER_APPRECIATION_THRESHOLD', value: '100', dataType: 'NUMBER' },

        // Branches that achieved < this % of budget get EXPLANATION
        { key: 'LETTER_EXPLANATION_THRESHOLD', value: '80', dataType: 'NUMBER' },

        // For NPA and other "better-low" parameters, invert the achievement logic
        // Comma-separated parameter codes where LOWER value = better performance
        { key: 'LETTER_INVERT_PARAMS', value: 'NPA', dataType: 'STRING' },

        // Auto-generate EXPLANATION letters for branches with a decline from March 31st (FY baseline)
        // Comma-separated parameter codes
        { key: 'LETTER_FY_DECLINE_PARAMS', value: 'TOTAL_DEPOSITS,CASA,ADV', dataType: 'STRING' },

        // Whether CRITICAL MisExceptions auto-generate OP_RISK letters (true/false)
        { key: 'LETTER_OPRISK_FROM_EXCEPTIONS', value: 'true', dataType: 'BOOLEAN' },
    ];

    for (const cfg of letterCriteriaDefaults) {
        await prisma.systemConfig.upsert({
            where: { key: cfg.key },
            update: {},   // do not overwrite if admin has already changed it
            create: { ...cfg, group: 'LETTER_CRITERIA' }
        });
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
