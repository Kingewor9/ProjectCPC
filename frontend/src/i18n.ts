import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import zh from './locales/zh.json';
import ru from './locales/ru.json';
import ar from './locales/ar.json';
import pt from './locales/pt.json';
import ja from './locales/ja.json';
import hi from './locales/hi.json';
import ko from './locales/ko.json';
import tr from './locales/tr.json';
import it from './locales/it.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      zh: { translation: zh },
      ru: { translation: ru },
      ar: { translation: ar },
      pt: { translation: pt },
      ja: { translation: ja },
      hi: { translation: hi },
      ko: { translation: ko },
      tr: { translation: tr },
      it: { translation: it },
    },
    fallbackLng: 'en',
    lng: 'en', // Set default language to English
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export default i18n;
