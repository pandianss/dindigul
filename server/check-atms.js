const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.atm.findMany().then(atms => {
    console.log('Total ATMs in DB:', atms.length);
}).catch(console.error).finally(() => prisma.$disconnect());
