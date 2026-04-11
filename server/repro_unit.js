const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
    try {
        const unit = await prisma.branch.create({
            data: {
                code: "TEST_9999",
                nameEn: "Test Unit",
                // type: "BRANCH" // Missing type
            }
        });
        console.log("Created successfully:", unit);
    } catch (error) {
        console.error("Caught expected error:", error.message);
    }
}
test().finally(() => prisma.$disconnect());
