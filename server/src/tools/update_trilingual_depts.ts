import prisma from '../lib/prisma';

const translationMap: Record<string, { ta: string, hi: string }> = {
    "Financial Inclusion": { ta: "நிதி உள்ளடக்கம்", hi: "वित्तीय समावेशन" },
    "Agriculture & Rural Initiatives Division": { ta: "விவசாயம் மற்றும் ஊரக முயற்சி பிரிவு", hi: "कृषि और ग्रामीण पहल प्रभाग" },
    "Retail Division": { ta: "சில்லறை விற்பனைப் பிரிவு", hi: "खुदरा प्रभाग" },
    "MSME Division": { ta: "MSME பிரிவு", hi: "MSME प्रभाग" },
    "Inspection Department": { ta: "ஆய்வுத் துறை", hi: "निरीक्षण विभाग" },
    "Official Language Department": { ta: "ஆட்சிமொழித் துறை", hi: "राजभाषा विभाग" },
    "Government Accounts Department": { ta: "அரசு கணக்குத் துறை", hi: "सरकारी खाता विभाग" },
    "Marketing Department": { ta: "சந்தைப்படுத்துதல் துறை", hi: "विपणन विभाग" },
    "Credit Monitoring Department": { ta: "கடன் கண்காணிப்புத் துறை", hi: "ऋण निगरानी विभाग" },
    "Vigilance Department": { ta: "விழிப்புணர்வுத் துறை", hi: "सतर्कता विभाग" },
    "Compliance Department": { ta: "இணக்கத் துறை", hi: "अनुपालन विभाग" },
    "General Administration Department": { ta: "பொது நிர்வாகத் துறை", hi: "सामान्य प्रशासन विभाग" },
    "Human Resources Management Department": { ta: "மனித வள மேலாண்மைத் துறை", hi: "मानव संसाधन प्रबंधन विभाग" },
    "Law Department": { ta: "சட்டத் துறை", hi: "कानून विभाग" },
    "IT Department": { ta: "தகவல் தொழில்நுட்பத் துறை", hi: "आईटी विभाग" },
    "Stressed Assets Management Department": { ta: "நிதி அழுத்தச் சொத்து மேலாண்மைத் துறை", hi: "तनावग्रस्त संपत्ति प्रबंधन विभाग" },
    "Security Department": { ta: "பாதுகாப்புத் துறை", hi: "सुरक्षा विभाग" },
    "Planning Department": { ta: "திட்டமிடல் துறை", hi: "योजना विभाग" },
    "Agri & Rural Initiatives Division": { ta: "விவசாயம் மற்றும் ஊரக முயற்சி பிரிவு", hi: "कृषि और ग्रामीण पहल प्रभाग" }
};

async function updateDepartments() {
    console.log("Updating departments with trilingual names...");

    const depts = await (prisma as any).department.findMany();

    for (const dept of depts) {
        const translations = translationMap[dept.nameEn];
        if (translations) {
            await (prisma as any).department.update({
                where: { id: dept.id },
                data: {
                    nameTa: translations.ta,
                    nameHi: translations.hi
                }
            });
            console.log(`Updated: ${dept.nameEn}`);
        }
    }

    console.log("Update complete!");
}

updateDepartments()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
