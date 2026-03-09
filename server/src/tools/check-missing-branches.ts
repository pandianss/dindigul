import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const sols = [174, 175, 176, 230, 232, 237, 243, 332, 376, 883, 910, 911, 924, 1013, 1044, 1112, 1152, 1220, 1221, 1258, 1314, 1316, 1317, 1401, 1560, 1789, 1830, 1896, 1919, 1931, 2098, 2286, 2287, 2288, 2461, 2464, 2574, 2685, 2686, 2702, 2703, 2704, 2705, 2706, 3164, 3165, 3166, 3346, 3347, 3436, 3437, 3548, 3549, 3920, 3933];

async function main() {
    const branches = await p.branch.findMany({
        where: { code: { in: sols.map(s => s.toString().padStart(4, '0')) } }
    });
    const found = new Set(branches.map(x => parseInt(x.code)));
    const missing = sols.filter(s => !found.has(s));
    console.log('Missing SOLs:', missing);
    await p.$disconnect();
}

main();
