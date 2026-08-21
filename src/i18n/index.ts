// `@/i18n` is the single import path for anything translation-related, mirroring
// how `@/theme` works. The split into `strings` and `LanguageContext` exists only
// to keep the dependency running one way: strings -> LanguageContext -> index,
// never back.
export { LanguageProvider, useLanguage, useT } from './LanguageContext'
export type { Language } from './LanguageContext'
export { en, km } from './strings'
export type { StringKey, Strings } from './strings'
// The numeral rule. The conversion is pure and lives in `lib/numerals.ts`; the
// two hooks are here. Both are re-exported from `@/i18n` so a screen has one
// import path for "everything that changes with the language".
export { useNum, usePadded } from './numerals'
export {
  hasKhmerDigits,
  localiseDigits,
  padded,
  parseNumeric,
  parseWholeNumber,
  toKhmerDigits,
  toLatinDigits,
} from '@/lib/numerals'
