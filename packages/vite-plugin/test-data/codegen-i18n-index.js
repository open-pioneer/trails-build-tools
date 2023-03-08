export const locales = ["de", "en", "de-simple"];
export function loadMessages(locale) {
  switch (locale) {
    case "de":
      return import("test-package-directory/@@open-pioneer-app?open-pioneer-i18n&locale=de").then(mod => mod.default);
    case "en":
      return import("test-package-directory/@@open-pioneer-app?open-pioneer-i18n&locale=en").then(mod => mod.default);
    case "de-simple":
      return import("test-package-directory/@@open-pioneer-app?open-pioneer-i18n&locale=de-simple").then(mod => mod.default);
  }
  throw new Error(`Unsupported locale: '${locale}'`);
}