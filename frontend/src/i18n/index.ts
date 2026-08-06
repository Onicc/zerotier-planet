import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

const saved = localStorage.getItem('ztp_lang');
const language = saved === 'zh-CN' || saved === 'en'
  ? saved
  : navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';

void i18n.use(initReactI18next).init({
  resources,
  lng: language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

i18n.on('languageChanged', (next) => {
  localStorage.setItem('ztp_lang', next);
  document.documentElement.lang = next;
});

document.documentElement.lang = language;

export default i18n;
