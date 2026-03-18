const { generateLettersForPeriod } = require('./src/services/letterCriteriaService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGeneration() {
    console.log("Testing OpRisk Draft Generation for 17-03-2026...");
    const res = await generateLettersForPeriod('Mar 26', { date: '2026-03-17', type: 'OP_RISK' });
    console.log("Result:", res);

    const drafts = await prisma.letter.count({ where: { type: 'OP_RISK', period: '17.03.2026' } });
    console.log(`Verified ${drafts} OpRisk drafts in DB.`);
}

testGeneration().catch(console.error).finally(() => prisma.$disconnect());
