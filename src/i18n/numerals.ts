import { useCallback } from 'react'
import { useLanguage } from './LanguageContext'
import { localiseDigits, padded } from '@/lib/numerals'

/**
 * The React half of the numeral rule. The conversion itself lives in
 * `lib/numerals.ts`, which imports nothing — see the note at the top of that
 * file for why the split exists.
 */

/**
 * The display hook.
 *
 *     const n = useNum()
 *     <Text>{n(recipe.totalMinutes)} {t('unit.minutes')}</Text>
 *     <Text>{n(`${from} — ${to} ${month}`)}</Text>
 *
 * Takes a number or a whole string and converts **every** digit in it, so a
 * pre-assembled label ("10 — 16 AUGUST") needs one call rather than one per
 * part.
 *
 * It is deliberately not folded into `t` and not named like it. `t` takes a key
 * from a fixed dictionary, so a typo is a compile error; this takes arbitrary
 * text and can't check anything. Keeping them apart is what stops someone
 * reaching for `n()` on a recipe title just because it was already in scope —
 * **user content never converts**, only derived numbers do.
 */
export function useNum(): (value: string | number) => string {
  const { language } = useLanguage()
  return useCallback(
    (value: string | number) => localiseDigits(String(value), language),
    [language]
  )
}

/** `usePadded()(1)` → `'01'` / `'០១'`. For `INDEX ០១–០៨` and step numerals. */
export function usePadded(): (value: number, width?: number) => string {
  const { language } = useLanguage()
  return useCallback(
    (value: number, width = 2) => padded(value, width, language),
    [language]
  )
}
