
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSOL1789() {
    try {
        const branch = await prisma.branch.findUnique({ where: { code: '1789' } });
        if (!branch) {
            console.log('Branch 1789 not found');
            return;
        }

        const latestSnap = await prisma.misSnapshot.findFirst({
            where: { unitId: branch.id },
            orderBy: { businessDate: 'desc' },
            include: { exceptions: true }
        });

        if (!latestSnap) {
            console.log('No snapshot for 1789');
            return;
        }

        console.log(`Latest Snapshot Date: ${latestSnap.businessDate}`);
        console.log(`Total Exceptions in DB: ${latestSnap.exceptions.length}`);
        latestSnap.exceptions.forEach(ex => {
            console.log(`- Rule: ${ex.ruleId}, Param: ${ex.parameter}, Severity: ${ex.severity}, Msg: ${ex.message.substring(0, 50)}...`);
        });

        const latestLetter = await prisma.letter.findFirst({
            where: { branchId: branch.id, type: 'OP_RISK' },
            orderBy: { createdAt: 'desc' }
        });

        if (latestLetter) {
            console.log('\nLatest OP_RISK Letter:');
            console.log(`ID: ${latestLetter.id}`);
            console.log(`Title: ${latestLetter.titleEn}`);
            console.log(`Summary Count in Text: ${latestLetter.contentEn.match(/identified (\d+) significant exceptions/) ? latestLetter.contentEn.match(/identified (\d+) significant exceptions/)[1] : 'N/A'}`);
            
            const orgMeta = typeof latestLetter.orgMeta === 'string' ? JSON.parse(latestLetter.orgMeta) : latestLetter.orgMeta;
            console.log(`Exceptions in OrgMeta Array: ${orgMeta?.exceptions?.length || 0}`);
            (orgMeta?.exceptions || []).forEach(ex => {
                 console.log(`  - ${ex.ruleId}: ${ex.parameter}`);
            });
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkSOL1789();
