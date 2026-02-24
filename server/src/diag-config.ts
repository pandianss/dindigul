import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('--- SYSTEM CONFIG ---');
    const configs = await prisma.systemConfig.findMany();
    console.log(JSON.stringify(configs, null, 2));
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
