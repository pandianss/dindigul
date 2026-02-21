import prisma from './lib/prisma';

const newDepartments = [
    "Financial Inclusion",
    "Agriculture & Rural Initiatives Division",
    "Retail Division",
    "MSME Division",
    "Inspection Department",
    "Official Language Department",
    "Government Accounts Department",
    "Marketing Department",
    "Credit Monitoring Department",
    "Vigilance Department",
    "Compliance Department",
    "General Administration Department",
    "Human Resources Management Department",
    "Law Department",
    "IT Department",
    "Stressed Assets Management Department",
    "Security Department",
    "Planning Department"
];

function generateCode(name: string) {
    // Remove common suffixes/words for a cleaner code, then convert to uppercase snake_case
    let cleanName = name.replace(/ Department| Division| \&/g, '').trim();
    // Handle edge cases
    if (name === "Law Department") cleanName = "LAW";
    if (name === "IT Department") cleanName = "IT";

    return cleanName.toUpperCase().replace(/\s+/g, '_').substring(0, 20);
}

async function seedDepartments() {
    console.log("Seeding new departments...");

    for (const name of newDepartments) {
        const code = generateCode(name);

        await (prisma as any).department.upsert({
            where: { code },
            update: { nameEn: name },
            create: {
                code,
                nameEn: name,
                nameTa: null,
                nameHi: null
            }
        });
        console.log(`[Inserted/Updated]: ${name} -> code: ${code}`);
    }

    console.log("All requested departments have been successfully seeded!");
}

seedDepartments()
    .catch(e => {
        console.error("Error seeding departments:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
