export const THEME_CONFIG = {
    colors: {
        primary: "#21357f", // bank-navy
        secondary: "#D4AF37", // bank-gold
        accent: "#00A693" // bank-teal
    },
    fonts: {
        sans: '"Inter", "Arial", sans-serif',
        tamil: '"Noto Sans Tamil", sans-serif',
        hindi: '"Shree Devanagari 714", sans-serif'
    },
    logos: {
        main: "/assets/logo_full.svg",
        emblem: "/assets/logo_center.svg"
    }
};

export const GLOBAL_CONFIG = {
    bankName: "Indian Overseas Bank",
    bankNameTa: "இந்தியன் ஓவர்சீஸ் வங்கி",
    bankNameHi: "इंडियन ओवरसीज बैंक",
    watermarkLogo: THEME_CONFIG.logos.emblem
};

export const REGIONAL_OFFICE_DATA = {
    name: "Dindigul Regional Office",
    nameTa: "திண்டுக்கல் மண்டல அலுவலகம்",
    nameHi: "डिंडिगुल क्षेत्रीय कार्यालय",
    address: "Regional Office, 123 Madurai Road, Dindigul - 624001, Tamil Nadu",
    phone: "+91 451 2420000",
    email: "ro.dindigul@bank.com",
    logoPath: THEME_CONFIG.logos.main,
    signingAuthEn: "Regional Manager",
    signingAuthTa: "மண்டல மேலாளர்",
    signingAuthHi: "क्षेत्रीय प्रबंधक"
};

export const DEPARTMENTS = [
    { id: "GAD", name: "General Administration Department", nameTa: "பொது நிர்வாகத் துறை", nameHi: "सामान्य प्रशासन विभाग" },
    { id: "PLANNING", name: "Planning & Development", nameTa: "திட்டமிடல் மற்றும் மேம்பாடு", nameHi: "योजना और विकास" },
    { id: "HR", name: "Human Resources", nameTa: "மனித வள மேம்பாடு", nameHi: "मानव संसाधन विकास" },
    { id: "IT", name: "Information Technology", nameTa: "தகவல் தொழில்நுட்பத் துறை", nameHi: "सूचना प्रौद्योगिकी विभाग" },
    { id: "ACCOUNTS", name: "Accounts & Budget", nameTa: "கணக்குகள் மற்றும் வரவு செலவுத் திட்டம்", nameHi: "खाता और बजट" },
    { id: "LEGAL", name: "Recovery & Legal", nameTa: "வசூல் மற்றும் சட்டத்துறை", nameHi: "वसूली और कानूनी विभाग" },
    { id: "AUDIT", name: "Audit & Compliance", nameTa: "தணிக்கை மற்றும் இணக்கம்", nameHi: "लेखापरीक्षा और अनुपालन" },
    { id: "VIGILANCE", name: "Vigilance Department", nameTa: "விழிப்புணர்வுத் துறை", nameHi: "सतर्कता विभाग" }
];
