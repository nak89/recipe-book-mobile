import { foldForCompare, hasKhmer } from './text'
import { KHMER_UNITS } from '@/data/units.km'
import type { Language } from '@/i18n/LanguageContext'

/**
 * The client half of the grocery list: how a line is addressed, how its stepper
 * moves, and how its amount reads.
 *
 * The aggregation itself is the server's job — it needs the database. What
 * lives here is everything the screen has to do with the result.
 */

/**
 * A line's address, mirroring the backend's `lib/grocery.ts`.
 *
 * The two must agree exactly: the client sends this key back when it ticks a
 * line, and a key the server never derived would file the tick against nothing
 * and the row would redraw un-ticked. Folded on both halves for the same reason
 * titles are — Khmer keyboards emit zero-width spaces, so two identical-looking
 * names compare unequal.
 *
 * In practice the client rarely builds one, since the server sends the key down
 * with each line. It exists so an optimistic write can address a line the
 * client composed itself.
 */
export function groceryKey(name: string, unit: string): string {
  return `${foldForCompare(name)}|${foldForCompare(unit)}`
}

/**
 * One contribution to a line: what a single dish, on a single day, asked for.
 *
 * Mirrors `LinePart` in the backend's `lib/grocery.ts`. The server sends these
 * atoms rather than the totals-by-day it used to, because **the screen offers
 * two lenses over the same line and they are asked for together** — "what do I
 * still need for the amok, today". A `byDate` map answers the first question, a
 * `byRecipe` map answers the second, neither answers both, and the point at
 * which you would add a third map for the intersection is the point at which
 * you should have sent the pieces.
 */
export interface LinePart {
  /** `YYYY-MM-DD`, local — built by `toDateKey`, never `toISOString`. */
  date: string
  recipeId: string
  amount: number
}

/**
 * What the list is narrowed to. Either half may be absent, and absent means
 * "don't narrow by this" rather than "narrow to nothing".
 */
export interface Lens {
  date?: string | null
  recipeId?: string | null
}

/** Whether a lens narrows anything at all — an empty one is the whole week. */
export function isNarrowed(lens: Lens): boolean {
  return Boolean(lens.date || lens.recipeId)
}

function under(parts: LinePart[], lens: Lens): LinePart[] {
  return parts.filter(
    (part) =>
      (!lens.date || part.date === lens.date) &&
      (!lens.recipeId || part.recipeId === lens.recipeId)
  )
}

/**
 * Whether a line belongs on screen under this lens.
 *
 * **Presence is the filter.** A meal that asked for nothing is not in `parts`
 * at all, so there is no zero to test against — and there mustn't be, since a
 * zero-valued part would put an empty row on that day's list.
 */
export function contributes(parts: LinePart[], lens: Lens): boolean {
  if (!isNarrowed(lens)) return true
  return under(parts, lens).length > 0
}

/**
 * What the lens's share of a line comes to.
 *
 * Rounded like every other sum in this file: these are the same floats the
 * server added up, so any subset of them drifts the same way.
 */
export function shareOf(parts: LinePart[], lens: Lens): number {
  const sum = under(parts, lens).reduce((total, part) => total + part.amount, 0)
  return Math.round(sum * 1000) / 1000
}

/**
 * Units that never take a plural, because they are symbols rather than words.
 *
 * Folded before lookup, so `G` and `g` and a `g` carrying a stray zero-width
 * space all match.
 */
const INVARIABLE = new Set(['g', 'kg', 'mg', 'ml', 'l', 'cl', 'tbsp', 'tsp', 'oz', 'lb', 'pt'])

/**
 * How far one press of − or + moves a line.
 *
 * Per-unit, because the sensible increment is a property of what is being
 * measured: nudging 400 g by one gram is thirty presses to make any difference,
 * and nudging 6 stalks by fifty is nonsense. Straight from the handoff's §3c.
 */
export function stepFor(unit: string): number {
  const key = foldForCompare(unit)
  if (key === 'g') return 50
  if (key === 'ml') return 100
  return 1
}

/** Crude English pluralisation — enough for the units this app actually holds. */
function pluralise(word: string): string {
  if (/(?:s|x|z|ch|sh)$/.test(word)) return `${word}es`
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`
  return `${word}s`
}

function singularise(word: string): string {
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (/(?:ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
  return word
}

/**
 * The unit as it should read beside a given amount, in a given language.
 *
 * **In Khmer mode an English count-word is shown in Khmer and never
 * pluralised.** Khmer does not mark number at all — it is carried by a separate
 * word when it matters — so there is nothing to inflect, and the lookup is a
 * display translation of the kind `i18n/labels.ts` already does for `Mealtime`.
 * Nothing is written back: the stored unit is whatever was typed, and English
 * mode still shows it verbatim. See `data/units.km.ts` for why that is the
 * chrome rule rather than a breach of the content one.
 *
 * **A unit already written in Khmer is returned untouched in both languages**,
 * because it is content in the script its author chose. Symbols are left alone
 * too — "400 gs" is not a thing.
 *
 * **The English side singularises before it pluralises.** Going straight to
 * `pluralise` assumed the stored unit was singular, and the pantry's own
 * defaults are not: `cloves` came out as `cloveses` and `leaves` as `leaveses`,
 * on the two ingredients most likely to be in a Cambodian recipe.
 */
export function unitFor(amount: number, unit: string, language: Language = 'en'): string {
  if (!unit) return ''
  if (hasKhmer(unit)) return unit
  const key = foldForCompare(unit)
  if (INVARIABLE.has(key)) return unit
  if (language === 'km') return KHMER_UNITS[key] ?? unit
  // Normalise first: the stored word may be either number already.
  const base = singularise(unit)
  return amount === 1 ? base : pluralise(base)
}

/**
 * A line's amount as one string — "400 g", "6 stalks", "1 stalk", "3".
 *
 * Trailing zeros are dropped: the column is a float so a summed 2 arrives as
 * `2`, but a summed 1.5 has to keep its half, and `toFixed(2)` on the first
 * would put "2.00" on a shopping list. `String()` already does exactly that,
 * which is why there is no branch here — an earlier version had an
 * `isInteger` ternary whose two arms were identical.
 *
 * **Latin digits, always.** The numeral script belongs to the screen, not to
 * this function: the caller wraps the result in `useNum()` from `@/i18n`, which
 * converts the digits and leaves the unit alone.
 *
 * The `language` argument is only ever the *unit's* — see `unitFor`. It is a
 * plain parameter rather than a hook so this module stays importable by the
 * offline test suite, which has no React in its graph.
 */
export function formatAmount(amount: number, unit: string, language: Language = 'en'): string {
  const rounded = Math.round(amount * 100) / 100
  const label = unitFor(rounded, unit, language)
  return label ? `${rounded} ${label}` : String(rounded)
}

/**
 * One press of −, floored at a single step.
 *
 * **Zeroing an item is not how you remove it**, so the floor is one step rather
 * than zero and the − button goes disabled when it is reached. A row that
 * vanishes when you tap − twice is a row you can lose by accident in a shop.
 */
export function decrement(amount: number, unit: string): number {
  const step = stepFor(unit)
  return Math.max(step, Math.round((amount - step) * 1000) / 1000)
}

export function increment(amount: number, unit: string): number {
  const step = stepFor(unit)
  return Math.round((amount + step) * 1000) / 1000
}

/** Whether − should be disabled: one step is the floor. */
export function atFloor(amount: number, unit: string): boolean {
  return amount <= stepFor(unit)
}
