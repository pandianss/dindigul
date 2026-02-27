import prisma from '../lib/prisma';

async function main() {
    console.log('--- Inspecting Snapshot for Unit 0376 on 2026-02-24 ---');
    const branch = await prisma.branch.findUnique({ where: { code: '0376' } });
    if (!branch) {
        console.log('Branch 0376 not found!');
        return;
    }

    const snap = await prisma.misSnapshot.findFirst({
        where: { unitId: branch.id, businessDate: new Date('2026-02-24T00:00:00Z') },
        include: { panelData: true }
    });

    if (!snap) {
        console.log('Snapshot NOT found!');
        return;
    }

    console.log('Snapshot ID:', snap.id);
    const cdRatio = snap.panelData.find((p: any) => p.parameter === 'CD_Ratio');
    const adv = snap.panelData.find((p: any) => p.parameter === 'Adv');
    const dep = snap.panelData.find((p: any) => p.parameter === 'Total Dep');

    console.log('CD_Ratio in panel:', cdRatio?.val_current);
    console.log('Adv in panel:', adv?.val_current);
    console.log('Total Dep in panel:', dep?.val_current);

    // Check other trend values
    console.log('CD_Ratio y_eod:', cdRatio?.val_y_eod);
    console.log('CD_Ratio prev_m:', cdRatio?.val_prev_m_end);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
