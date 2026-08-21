/**
 * Text folding for **comparison only** — search, filters and duplicate checks.
 *
 * ## Why this exists
 *
 * Khmer is written without spaces between words, so word boundaries are marked
 * with an invisible zero-width space (U+200B), and most Khmer keyboards emit
 * them. Nothing you would reach for removes it:
 *
 * - `.trim()` strips *visible* whitespace. U+200B is Unicode category `Cf`
 *   (format), not `Zs` (space separator), so trim leaves it alone.
 * - `.toLowerCase()` doesn't touch it, and Khmer has no case anyway.
 * - `.normalize('NFC')` composes and reorders marks. It does not delete
 *   characters, so the ZWSP survives that too.
 *
 * The result is two strings that are pixel-for-pixel identical on screen and
 * unequal to `===`. Left alone that breaks dashboard search — a user types a
 * title they can read off their own screen and gets no results, with nothing
 * visible to explain why — and it punches a hole in the duplicate-title check,
 * letting two identically-named recipes both save.
 *
 * ## The one rule
 *
 * **Fold for comparison; never store the folded value.** In Khmer the ZWSP
 * carries line-breaking information, so stripping it out of a saved title would
 * change how that title wraps. Rewriting what the user typed is exactly what the
 * language feature promises not to do.
 *
 * This is mirrored in the backend's `lib/text.ts`. The two must agree, the same
 * way `MAX_RECIPE_BYTES` already has to.
 */

/**
 * Zero-width and invisible formatting characters.
 *
 * Written with `\u` escapes deliberately — the literal characters are invisible
 * in an editor, so a character class containing them is unreadable and one
 * stray paste away from being silently wrong.
 *
 * - `­` soft hyphen
 * - `​-‍` zero-width space, non-joiner, joiner
 * - `⁠` word joiner
 * - `﻿` zero-width no-break space (BOM)
 * - `឴឵` Khmer inherent vowels AQ/AA — invisible, deprecated by
 *   Unicode, and still present in older Khmer text
 */
const INVISIBLE = /[­​-‍⁠﻿឴឵]/g

// `TextEncoder` isn't guaranteed on every runtime this ships to, and neither is
// `String.prototype.normalize` — Hermes has shipped without parts of the Unicode
// surface before. Feature-detect rather than assume: losing NFC still leaves the
// zero-width strip working, which is the larger half of the fix.
const CAN_NORMALIZE = typeof String.prototype.normalize === 'function'

/**
 * Folds a string for comparison: invisible characters removed, canonically
 * composed, lowercased, trimmed.
 *
 * Use on **both sides** of every comparison — folding only the needle finds
 * nothing when the haystack is the one carrying the zero-width space.
 */
export function foldForCompare(value: string): string {
  const stripped = value.replace(INVISIBLE, '')
  const composed = CAN_NORMALIZE ? stripped.normalize('NFC') : stripped
  return composed.trim().toLowerCase()
}

/**
 * Does this string contain Khmer script?
 *
 * Used to decide whether a `line-through` is safe to draw. It isn't: the rule
 * is painted across the middle of the line box, which is exactly where a Khmer
 * cluster carries its vowel signs — so striking a Khmer label crosses out the
 * vowels rather than the word, and what gets obscured is meaning. It is the
 * same failure mode as pinning a line-height (see `theme/typography.ts`), for
 * the same reason: the marks live where Latin text has nothing.
 *
 * Deliberately a *content* test, not a language test. The language toggle moves
 * chrome only, and a recipe written in Khmer keeps its Khmer ingredient names
 * when the interface is in English — so asking `useLanguage()` would strike
 * through exactly the labels this exists to protect. Ask the string.
 *
 * `ក-៿` is the Khmer block; `᧠-᧿` is Khmer Symbols. The
 * range covers consonants, vowels, signs and digits, which is everything that
 * can carry a mark.
 */
const KHMER = /[ក-៿᧠-᧿]/

export function hasKhmer(value: string): boolean {
  return KHMER.test(value)
}
