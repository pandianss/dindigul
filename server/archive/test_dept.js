
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.department.count();
        console.log('Department count:', count);
        const departments = await prisma.department.findMany();
        console.log('Departments:', JSON.stringify(departments, null, 2));
    } catch (e) {
        console.error('Error accessing department:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
