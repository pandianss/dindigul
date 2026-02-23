const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany({
    select: { username: true, role: true, branch: { select: { code: true } } }
}).then(users => console.table(users.map(u => ({ username: u.username, role: u.role, branch: u.branch?.code }))))
    .catch(console.error)
    .finally(() => prisma.$disconnect());
