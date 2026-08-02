// `@/i18n` is the single import path for anything translation-related, mirroring
// how `@/theme` works. The split into `strings` and `LanguageContext` exists only
// to keep the dependency running one way: strings -> LanguageContext -> index,
// never back.
export { LanguageProvider, useLanguage, useT } from './LanguageContext'
export type { Language } from './LanguageContext'
export { en, km } from './strings'
export type { StringKey, Strings } from './strings'
