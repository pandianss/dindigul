const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Creating temporary staff record for "sspan"...');
    // We need a branch first (admin branch is often '0000')
    const branch = await prisma.branch.findFirst();
    if (!branch) {
        console.error('No branch found to associate user with.');
        return;
    }

    const user = await prisma.user.upsert({
        where: { username: 'sspan' },
        update: {
            role: 'BRANCH_USER',
            fullNameEn: 'Test OS User',
            branchId: branch.id
        },
        create: {
            username: 'sspan',
            passwordHash: 'not_needed_for_auto_login',
            fullNameEn: 'Test OS User',
            role: 'BRANCH_USER',
            branchId: branch.id
        }
    });

    console.log('User "sspan" created/updated. ID:', user.id);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
