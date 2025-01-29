import i18next from 'i18next';
import { getStorage } from 'minimal-shared/utils';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next, I18nextProvider as Provider } from 'react-i18next';

import { i18nOptions, fallbackLng } from './locales-config';

// ----------------------------------------------------------------------

/**
 * [1] localStorage
 * Auto detection:
 * const lng = getStorage('i18nextLng')
 */
const lng = getStorage('i18nextLng', fallbackLng);

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .use(resourcesToBackend((lang, ns) => import(`./langs/${lang}/${ns}.json`)))
  .init({ ...i18nOptions(lng), detection: { caches: ['localStorage'] } });

// ----------------------------------------------------------------------

export function I18nProvider({ children }) {
  return <Provider i18n={i18next}>{children}</Provider>;
}
