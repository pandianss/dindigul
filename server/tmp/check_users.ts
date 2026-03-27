import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      fullNameEn: {
        contains: 'KUMAR',
        mode: 'insensitive'
      }
    },
    include: {
      designation: true,
      branch: true
    }
  });

  console.log('--- Users found ---');
  users.forEach(u => {
    console.log(`ID: ${u.id}`);
    console.log(`Name: ${u.fullNameEn}`);
    console.log(`Username: ${u.username}`);
    console.log(`Designation (User model): ${u.designationEn}`);
    console.log(`Designation (Designation model): ${u.designation?.nameEn}`);
    console.log(`Grade: ${u.grade}`);
    console.log(`Branch: ${u.branch?.nameEn} (${u.branch?.code})`);
    console.log(`isSecondLine: ${u.isSecondLine}`);
    console.log(`isRegionHead: ${u.isRegionHead}`);
    console.log(`Role: ${u.role}`);
    console.log('-------------------');
  });

  const annamalai = await prisma.user.findMany({
    where: {
      fullNameEn: {
        contains: 'ANNAMALAI',
        mode: 'insensitive'
      }
    },
    include: {
      designation: true,
      branch: true
    }
  });

  console.log('--- Annamalai found ---');
  annamalai.forEach(u => {
    console.log(`ID: ${u.id}`);
    console.log(`Name: ${u.fullNameEn}`);
    console.log(`Designation (User model): ${u.designationEn}`);
    console.log(`Designation (Designation model): ${u.designation?.nameEn}`);
    console.log(`isSecondLine: ${u.isSecondLine}`);
    console.log(`Role: ${u.role}`);
    console.log('-------------------');
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
