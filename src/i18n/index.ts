/**
 * i18n bootstrap.
 *
 * Scope: privacy notice + consent UI only — DPDP §6 requires the notice
 * in English plus a language from the Constitution's 8th Schedule. We
 * pick Hindi for national reach. Kannada (Bengaluru HQ) is a follow-up.
 *
 * Translating the entire product UI is OUT OF SCOPE for F23.D3. That's
 * a separate quarter's work.
 *
 * Usage:
 *   import { useTranslation } from "react-i18next";
 *   const { t } = useTranslation("privacy");
 *   t("title")
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import hi from "./locales/hi.json";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { privacy: en.privacy, consent: en.consent },
      hi: { privacy: hi.privacy, consent: hi.consent },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "hi"],
    defaultNS: "privacy",
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lng",
      lookupLocalStorage: "fh_locale",
      caches: ["localStorage"],
    },
  });

export default i18n;
