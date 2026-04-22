import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding dashboard content...');

    // 1. SRM Message
    await prisma.srmMessage.upsert({
        where: { id: 'default-srm' },
        update: {},
        create: {
            id: 'default-srm',
            name: 'S. Pandian',
            title: 'Regional Manager',
            region: 'Dindigul Regional Office',
            highlight: 'Q4 Focus: Deposit Mobilisation & NPA Reduction',
            message: `Dear Branch Heads,\n\nAs we approach Q4 FY 2025-26, I urge every branch to intensify deposit mobilisation efforts, particularly CASA. Gross NPA must be brought below 4.5% before the financial year end on 31st March. All audit observations identified in Q3 must be closed by end of February. Your branch performance directly reflects our collective commitment to excellence.\n\nLet us close this financial year on a high note. I am confident in your capabilities.\n\nS. Pandian\nRegional Manager, Dindigul`,
            isActive: true
        }
    });

    // 2. Dashboard Tickers
    const tickerTexts = [
        '📢 Q4 ends 31st March — All audit observations must be closed before FY-end',
        '🏦 ATM cash replenishment: Priority branches — Chinnamanur, Uthamapalayam, Periyakulam',
        '📊 MIS Data upload deadline: 28th February 2026',
        '🎯 Regional target — CASA Ratio: 38% | Current: 36%',
        '⚠️ 3 branches below critical NPA threshold — immediate recovery action required',
        '🌟 Palani, Dindigul Fort branches surpassed deposit target for January',
        '📅 Next RO review meeting: 5th March 2026 at 10:00 AM'
    ];

    for (let i = 0; i < tickerTexts.length; i++) {
        await prisma.dashboardTicker.create({
            data: { text: tickerTexts[i], isActive: true, order: i }
        }).catch(() => { /* silently skip if already exists */ });
    }

    console.log('Dashboard content seeded successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
