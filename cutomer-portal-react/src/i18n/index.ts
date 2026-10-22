
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import resourcesToBackend from "i18next-resources-to-backend";

import { getStoredLanguage } from "../features/customer-account/settings/utils/SettingsStorage";

const translationModules = import.meta.glob("./locales/*/*.json");

i18n
  .use(
    resourcesToBackend(
      async (language: string, namespace: string) => {
        const path = `./locales/${language}/${namespace}.json`;
        const loadTranslation = translationModules[path];

        if (!loadTranslation) {
          throw new Error(`Translation file not found: ${path}`);
        }

        const module = (await loadTranslation()) as {
          default: Record<string, unknown>;
        };

        return module.default;
      },
    ),
  )
  .use(initReactI18next)
  .init({
    lng: getStoredLanguage(),
    fallbackLng: "en",
    supportedLngs: ["en", "my"],
    load: "languageOnly",

    ns: ["common", "dashboard"],
    defaultNS: "common",

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: true,
    },

    debug: import.meta.env.DEV,
  });

export default i18n;
