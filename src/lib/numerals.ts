// **Type-only**, and that is load-bearing rather than tidiness: it is erased at
// compile time, so this module pulls in nothing — no React, no react-native, no
// AsyncStorage. That is what lets `tests/numerals.test.ts` import it under plain
// Node. The `useNum` hook lives in `i18n/numerals.ts` for the same reason.
import type { Language } from '@/i18n/LanguageContext'

/**
 * Khmer numerals — the second half of the one-language-at-a-time rule.
 *
 * The README states it as a single line: *"Numerals switch too. Khmer mode uses
 * ០១២៣៤៥៦៧៨៩ for step numbers, dates, counts, durations, servings and calories."*
 * That is a display rule and **only** a display rule. Every number in this app
 * is stored as a JSON number and travels to the backend as one; nothing here
 * ever reaches a request body or a database column.
 *
 * ## The two directions are not symmetrical
 *
 * `toKhmerDigits` is cosmetic — it makes a number look right on a page.
 *
 * `toLatinDigits` is a **bug fix**, and the more important of the two. A Khmer
 * keyboard set to Khmer numerals types ២ where a Latin one types 2, and:
 *
 *     Number('២')        // NaN
 *     Number('២').toFixed // throws downstream
 *     parseFloat('១.៥')  // NaN
 *
 * So a Khmer-speaking user typing a quantity into the recipe form produced `0`
 * or a validation error with nothing on screen to explain it — their input
 * looked like a number and the runtime disagreed. Every place that turns typed
 * text into a number has to fold the digits first, which is why
 * `parseNumeric`/`parseWholeNumber` exist rather than a bare `Number()` call.
 *
 * This is *not* conditional on the active language. Someone can switch the
 * interface to English with a Khmer keyboard still installed, and someone can
 * paste. Ask the string, never the setting — the same rule `hasKhmer` follows in
 * `lib/text.ts`.
 *
 * ## What does not convert
 *
 * Unit **symbols** stay Latin in both languages (`g`, `ml`, `kg`, `°C`) because
 * they are symbols, not words. Word-units translate instead, and that happens in
 * `data/units.km.ts`, not here.
 *
 * User content never converts. A recipe title, a description or an ingredient
 * name the user typed is content, and the language toggle moves chrome only —
 * running a title through `toKhmerDigits` would rewrite what somebody wrote.
 * Convert **derived** numbers: counts, durations, servings, calories, step
 * numbers, dates.
 *
 * A CSS-ish value never converts either. `width: '67%'` is a layout instruction
 * that happens to be a string; a Khmer digit in one is not a translation, it is
 * a broken style. Only text a person reads goes through `n`.
 *
 * ## Text *inputs* are the deliberate exception
 *
 * A numeric field shows exactly the characters that were typed into it, in
 * whichever script the keyboard produced. Converting as you type means writing
 * back into a controlled input on every keystroke, which moves the cursor and
 * mangles a half-typed number; converting only the *seeded* value means a field
 * that reads `៥0` the moment someone edits it with a Latin keypad. The script
 * is signalled by the placeholder (`ឧ. ៣០`) instead, and `parseNumeric` accepts
 * either side on the way out — which is the half that actually matters.
 */

const KHMER_ZERO = 0x17e0 // ០
const LATIN_ZERO = 0x30 // 0

/**
 * Any Khmer digit. Kept as an explicit range rather than a character class of
 * literals: the ten glyphs are hard to tell apart in a monospaced editor, and a
 * class with one of them mistyped fails silently on exactly one digit.
 */
const KHMER_DIGIT = /[០-៩]/g
const LATIN_DIGIT = /[0-9]/g
// A separate, non-global copy for `.test()`. A `/g` regex carries `lastIndex`
// between calls, so testing the same pattern twice returns false the second
// time — a classic and completely invisible bug.
const ANY_KHMER_DIGIT = /[០-៩]/

/** `'4 tbsp'` → `'៤ tbsp'`. Non-digits, including unit symbols, pass through. */
export function toKhmerDigits(value: string): string {
  return value.replace(LATIN_DIGIT, (d) =>
    String.fromCharCode(KHMER_ZERO + (d.charCodeAt(0) - LATIN_ZERO))
  )
}

/**
 * `'១.៥'` → `'1.5'`. Run this before **every** `Number()`, `parseFloat` or
 * numeric regex that sees text a human typed.
 *
 * Only the digits move. `.` and `,` are already what Khmer uses for the decimal
 * point and thousands separator, so there is nothing to map there — the comma
 * swap that several callers do (`replace(',', '.')`) is about European decimal
 * commas and stays their business, not this function's.
 */
export function toLatinDigits(value: string): string {
  return value.replace(KHMER_DIGIT, (d) =>
    String.fromCharCode(LATIN_ZERO + (d.charCodeAt(0) - KHMER_ZERO))
  )
}

/** Does this string contain a Khmer digit? Used by tests and the input hint. */
export function hasKhmerDigits(value: string): boolean {
  return ANY_KHMER_DIGIT.test(value)
}

/** The display side, for code that has a `Language` but no hook (formatters, tests). */
export function localiseDigits(value: string, language: Language): string {
  return language === 'km' ? toKhmerDigits(value) : toLatinDigits(value)
}

/**
 * Parses typed text into a number, tolerating Khmer digits and a decimal comma.
 *
 * Returns `null` rather than `NaN` for anything unparseable, so a caller has to
 * decide what an empty field means instead of letting `NaN` leak into a request
 * body — `JSON.stringify(NaN)` is `null` anyway, which turns a validation error
 * into a silently-cleared column.
 */
export function parseNumeric(raw: string): number | null {
  const value = toLatinDigits(raw).trim().replace(',', '.')
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * The whole-number variant, checked **as text**.
 *
 * `Number('30.5')` is a perfectly good number, so a `Number.isInteger` test
 * accepts `30.5` typed into a servings field and then silently rounds it. The
 * digits are folded first so `៣០` passes and `៣០.៥` is rejected, exactly as
 * their Latin spellings would be.
 */
export function parseWholeNumber(raw: string): number | null {
  const value = toLatinDigits(raw).trim()
  if (!/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

/**
 * A zero-padded ordinal, for `INDEX ០១–០៨` and the step numerals.
 *
 * Padding happens in Latin and converts afterwards, because `padStart` counts
 * UTF-16 code units and a Khmer digit is one — correct here, but only by luck,
 * and not something a reader should have to verify.
 */
export function padded(value: number, width = 2, language: Language = 'en'): string {
  return localiseDigits(String(value).padStart(width, '0'), language)
}
