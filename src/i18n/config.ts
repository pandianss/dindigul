import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Dynamic loader for locales
const loadResources = async (language: string) => {
    try {
        const resources = await import(`./locales/${language}.json`);
        return resources.default;
    } catch (error) {
        console.error(`Failed to load resources for ${language}`, error);
        return {};
    }
};

i18n
    .use(initReactI18next)
    .init({
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
    });

// Load initial language
loadResources('en').then(resources => {
    i18n.addResourceBundle('en', 'translation', resources, true, true);
});

// Update resources on language change
i18n.on('languageChanged', async (lng) => {
    if (!i18n.hasResourceBundle(lng, 'translation')) {
        const resources = await loadResources(lng);
        i18n.addResourceBundle(lng, 'translation', resources, true, true);
    }
});

export default i18n;
