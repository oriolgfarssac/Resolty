import en from './en';
import es from './es';
import ca from './ca';

export const locales = ['en', 'es', 'ca'] as const;
export type Locale = typeof locales[number];
export const copy: Record<Locale, typeof en> = { en, es, ca };
export const pathFor = (lang: Locale) => lang === 'en' ? '/' : `/${lang}/`;
export const isLocale = (value: unknown): value is Locale => locales.some((lang) => lang === value);
export const spending = ['none', 'under_20', '20_50', '50_100', '100_250', 'over_250', 'unsure'];
// Accept older form versions during deployment and from already-open tabs.
export const acceptedSpending = [...spending, 'under_100', '100_500', '250_500', '500_1000', 'over_1000'];
export const tools = ['ChatGPT', 'Claude', 'Gemini', 'Microsoft Copilot', 'other', 'none'];
