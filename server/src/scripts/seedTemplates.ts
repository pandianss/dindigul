import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      name: 'General Branch Request',
      code: 'GEN_REQ',
      category: 'ADMIN',
      subjectEn: 'Regarding Branch Operations and Efficiency',
      subjectHi: 'शाखा संचालन और दक्षता के संबंध में',
      subjectTa: 'கிளை செயல்பாடுகள் மற்றும் திறன் குறித்து',
      bodyEn: 'We have observed certain areas in your branch operations that require immediate attention. Specifically, the customer service turnaround time and the upkeep of digital banking zones need to be optimized as per the latest regional guidelines.\n\nPlease ensure that all staff members are briefed on the new SOPs and submit a compliance report within 7 working days.',
      bodyHi: 'हमने आपके शाखा संचालन में कुछ ऐसे क्षेत्रों को देखा है जिन पर तत्काल ध्यान देने की आवश्यकता है। विशेष रूप से, ग्राहक सेवा टर्नअराउंड समय और डिजिटल बैंकिंग क्षेत्रों के रखरखाव को नवीनतम क्षेत्रीय दिशानिर्देशों के अनुसार अनुकूलित करने की आवश्यकता है।\n\nकृपया सुनिश्चित करें कि सभी स्टाफ सदस्यों को नए एसओपी के बारे में जानकारी दी गई है और 7 कार्य दिवसों के भीतर अनुपालन रिपोर्ट प्रस्तुत करें।',
      bodyTa: 'உங்கள் கிளையின் செயல்பாடுகளில் உடனடி கவனம் செலுத்த வேண்டிய சில பகுதிகளை நாங்கள் கவனித்துள்ளோம். குறிப்பாக, வாடிக்கையாளர் சேவைக்கான நேரம் மற்றும் டிஜிட்டல் வங்கி மண்டலங்களை பராமரித்தல் ஆகியவற்றை சமீபத்திய மண்டல வழிகாட்டுதல்களின்படி மேம்படுத்த வேண்டும்.\n\nஅனைத்து பணியாளர்களுக்கும் புதிய தரநிலை செயல்பாட்டு நடைமுறைகள் (SOPs) குறித்து விளக்கப்பட்டிருப்பதை உறுதிசெய்து, 7 வேலை நாட்களுக்குள் இணக்க அறிக்கையை சமர்ப்பிக்கவும்.'
    },
    {
      name: 'NPA Recovery Notice',
      code: 'NPA_RECOV',
      category: 'RECOVERY',
      subjectEn: 'Intensification of NPA Recovery Efforts',
      subjectHi: 'एनपीए वसूली प्रयासों का सुदृढ़ीकरण',
      subjectTa: 'NPA வசூல் முயற்சிகளை தீவிரப்படுத்துதல்',
      bodyEn: 'Review of the branch performance indicates a slowing trend in NPA recovery for the current quarter. You are directed to initiate personal contact with the top 50 defaulters in your jurisdiction immediately.\n\nLegal proceedings should be fast-tracked for chronic cases. A weekly progress meeting will be held every Friday via video conference.',
      bodyHi: 'शाखा के प्रदर्शन की समीक्षा वर्तमान तिमाही के लिए एनपीए वसूली में धीमी प्रवृत्ति का संकेत देती है। आपको तुरंत अपने अधिकार क्षेत्र में शीर्ष 50 चूककर्ताओं के साथ व्यक्तिगत संपर्क शुरू करने का निर्देश दिया जाता है।\n\nपुरानी मामलों के लिए कानूनी कार्यवाही को तेज किया जाना चाहिए। हर शुक्रवार को वीडियो कॉन्फ्रेंस के माध्यम से साप्ताहिक प्रगति बैठक आयोजित की जाएगी।',
      bodyTa: 'கிளையின் செயல்பாடுகளை ஆய்வு செய்ததில், நடப்பு காலாண்டிற்கான NPA வசூலில் தொய்வு காணப்படுகிறது. உங்கள் எல்லைக்குட்பட்ட முதல் 50 கடன் பாக்கிகாரர்களை உடனடியாக நேரில் சந்தித்து பேச அறிவுறுத்தப்படுகிறது.\n\nநீண்டகால வழக்குகளுக்கு சட்ட நடவடிக்கைகளை விரைவுபடுத்த வேண்டும். ஒவ்வொரு வெள்ளிக்கிழமையும் வீடியோ கான்பரன்ஸ் மூலம் வாராந்திர முன்னேற்றக் கூட்டம் நடைபெறும்.'
    }
  ];

  console.log('Seeding letter templates...');
  for (const t of templates) {
    await prisma.letterTemplate.upsert({
      where: { code: t.code },
      update: t,
      create: t,
    });
  }
  console.log('Successfully seeded templates.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
