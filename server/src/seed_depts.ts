import prisma from './lib/prisma';

async function seed() {
  const departments = [
    { code: 'CRD', nameEn: 'Credit Department', nameHi: 'ऋण विभाग', nameTa: 'கடன் பிரிவு' },
    { code: 'OPS', nameEn: 'Operations Department', nameHi: 'परिचालन विभाग', nameTa: 'இயக்கப் பிரிவு' },
    { code: 'COMP', nameEn: 'Compliance & Risk', nameHi: 'अनुपालन और जोखिम', nameTa: 'இணக்கம் மற்றும் அபாயம்' },
    { code: 'HR', nameEn: 'Human Resources', nameHi: 'मानव संसाधन', nameTa: 'மனித வளம்' },
    { code: 'IT', nameEn: 'Information Technology', nameHi: 'सूचना प्रौद्योगिकी', nameTa: 'தகவல் தொழில்நுட்பம்' },
    { code: 'AUD', nameEn: 'Audit Department', nameHi: 'अंकेक्षण विभाग', nameTa: 'தணிக்கைப் பிரிவு' },
    { code: 'PLAN', nameEn: 'Planning & Development', nameHi: 'योजना और विकास', nameTa: 'திட்டமிடல் மற்றும் மேம்பாடு' }
  ];

  console.log('Seeding departments...');
  for (const dept of departments) {
    try {
      await prisma.department.upsert({
        where: { code: dept.code },
        update: dept,
        create: dept
      });
      console.log(`Seeded: ${dept.code}`);
    } catch (err: any) {
      console.error(`Failed to seed ${dept.code}:`, err.message);
    }
  }
  console.log('Departments seeding process completed.');
}

seed()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
