import { en, Translations } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';

export type { Translations };
export { en, es, fr };

export type Language = 'en' | 'es' | 'fr';

const locales: Record<Language, Translations> = {
  en: en as unknown as Translations,
  es: es as unknown as Translations,
  fr: fr as unknown as Translations,
};

let currentLanguage: Language = 'en';

export function setLanguage(lang: Language): void {
  currentLanguage = lang;
}

export function getLanguage(): Language {
  return currentLanguage;
}

/**
 * Simple translation function with dot-notation key support.
 * Usage: t('nav.home') => 'Home' | 'Inicio' | 'Accueil'
 */
export function t(key: string, lang?: Language): string {
  const locale = locales[lang ?? currentLanguage] ?? en;
  const parts = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = locale;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') return key;
    value = value[part];
  }
  if (typeof value === 'string') return value;
  return key;
}

/**
 * Returns the full locale object for a given language.
 */
export function getLocale(lang: Language = currentLanguage): Translations {
  return locales[lang] ?? en;
}
