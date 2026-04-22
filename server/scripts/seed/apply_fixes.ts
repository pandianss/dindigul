import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Applying User Support & Role Fixes ---');

  // 1. Update CHANDRA KUMAR P as isRegionHead
  await prisma.user.updateMany({
    where: { fullNameEn: { contains: 'CHANDRA KUMAR P', mode: 'insensitive' } },
    data: { isRegionHead: true, role: 'RO_MANAGER' }
  });
  console.log('Updated CHANDRA KUMAR P as isRegionHead and RO_MANAGER');

  // 2. Identify and Update RO_MANAGER roles for other RO leadership
  const roLeaders = await prisma.user.findMany({
    where: {
      branch: { code: '3933' },
      grade: { in: ['SM V', 'SM IV', 'TEG VI', 'TEG VII'] }
    }
  });

  for (const leader of roLeaders) {
    if (leader.role !== 'RO_MANAGER') {
      await prisma.user.update({
        where: { id: leader.id },
        data: { role: 'RO_MANAGER' }
      });
      console.log(`Updated role for ${leader.fullNameEn} to RO_MANAGER`);
    }
  }

  // 3. Fix isSecondLine for ALL users based on designationName
  const allUsers = await prisma.user.findMany({
    include: { designation: true }
  });

  for (const u of allUsers) {
    const desigName = u.designation?.nameEn || u.designationEn || '';
    const desigUpper = desigName.toUpperCase();
    const shouldBeSecondLine = desigUpper.includes('- II LINE') || desigUpper.includes('SECOND LINE');
    const shouldBeUnitHead = desigUpper.includes('- I LINE') || desigUpper.includes('HEAD');

    if (shouldBeSecondLine && !u.isSecondLine) {
       await prisma.user.update({ where: { id: u.id }, data: { isSecondLine: true } });
       console.log(`Fixed isSecondLine for ${u.fullNameEn}`);
    }

    // 4. Link User to Branch Hierarchy if applicable
    if (u.branchId) {
        if (shouldBeUnitHead) {
            await prisma.branch.update({
                where: { id: u.branchId },
                data: { headUserId: u.id }
            });
        } else if (shouldBeSecondLine) {
            await prisma.branch.update({
                where: { id: u.branchId },
                data: { secondLineUserId: u.id }
            });
            console.log(`Linked ${u.fullNameEn} as second line for branch ${u.branchId}`);
        }
    }

    // 5. Sync designationEn for public API
    if (desigName && u.designationEn !== desigName) {
      await prisma.user.update({
        where: { id: u.id },
        data: { designationEn: desigName }
      });
      console.log(`Synced designation for ${u.fullNameEn}: ${desigName}`);
    }
  }

  console.log('--- Fixes Applied ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
