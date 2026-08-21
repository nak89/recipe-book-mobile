/**
 * The Khmer unit list — and it is deliberately **only half a translation**.
 *
 * Measurement abbreviations stay Latin (`g`, `kg`, `ml`, `l`, `tbsp`, `tsp`);
 * count-words are Khmer (កំពិស for cloves, ដើម for stalks, សន្លឹក for leaves).
 * That's not a shortcut — it's the convention `ingredients.km.ts` already sets
 * out and follows in its own data, for three reasons stated there: it's how
 * measurements are actually written in Cambodian recipes, it keeps them legible
 * to anyone, and the ingredient row's unit column is a **fixed 46pt** that must
 * never wrap, while the Khmer for "teaspoon" is four times the length of `tsp`.
 *
 * So the units these two files offer overlap heavily. What differs is the count
 * words and the section headings.
 */
import type { UnitGroup } from './units'

export const KHMER_UNIT_GROUPS: UnitGroup[] = [
  { category: 'ទម្ងន់', units: ['g', 'kg'] },
  { category: 'មាឌ', units: ['ml', 'l', 'tsp', 'tbsp'] },
  {
    category: 'ចំនួន',
    units: [
      'កំពិស', // cloves
      'ដើម', // stalks
      'សន្លឹក', // leaves
      'គ្រាប់', // seeds / small round things
      'ក្រណាត់', // sheet (of rice paper)
      'ផ្លែ', // fruits
      'ចំណិត', // slices
    ],
  },
]

/**
 * English count-word → Khmer, for **display only**.
 *
 * ## Why this is not the content rule being broken
 *
 * The toggle translates chrome and never content, and a unit the user typed is
 * content. This does not rewrite it: nothing here reaches a request body or a
 * database column, the stored string is untouched, and switching back to English
 * shows exactly what was typed. It is the same arrangement `i18n/labels.ts`
 * already uses for `Mealtime` — the value stays `'Breakfast'` and only the label
 * is translated — applied to the one other stored English vocabulary the user
 * reads rather than chooses.
 *
 * The alternative was worse than either rule. A derived market line is summed
 * from recipes, so a Khmer reader shopping off a plan got `២ wholes` — a Khmer
 * numeral against an English word, on one line. The README calls one-language-
 * at-a-time the most likely failure in this project, and that is what it looks
 * like.
 *
 * ## What is not here
 *
 * **Measurement abbreviations.** `g`, `kg`, `ml`, `l`, `tsp`, `tbsp` are absent
 * on purpose and fall through untranslated, because that is the convention
 * `KHMER_UNIT_GROUPS` above already follows and `ingredients.km.ts` sets out:
 * they are symbols rather than words, they are how Cambodian recipes actually
 * write measurements, and the Khmer for "teaspoon" is four times the length of
 * `tsp` in a column that must not wrap.
 *
 * Keys are singular **and** plural, folded lowercase, because the stored unit is
 * free text and the pantry's own defaults ship plural (`cloves`, `leaves`).
 * Anything not listed is returned as written — an English word left in a Khmer
 * list is a gap in this table, which is visible and fixable; a guess would not
 * be.
 */
export const KHMER_UNITS: Record<string, string> = {
  clove: 'កំពិស',
  cloves: 'កំពិស',
  stalk: 'ដើម',
  stalks: 'ដើម',
  leaf: 'សន្លឹក',
  leaves: 'សន្លឹក',
  sprig: 'ដើម',
  sprigs: 'ដើម',
  seed: 'គ្រាប់',
  seeds: 'គ្រាប់',
  sheet: 'ក្រណាត់',
  sheets: 'ក្រណាត់',
  slice: 'ចំណិត',
  slices: 'ចំណិត',
  strip: 'ចំណិត',
  strips: 'ចំណិត',
  piece: 'ដុំ',
  pieces: 'ដុំ',
  pcs: 'ដុំ',
  whole: 'ផ្លែ',
  wholes: 'ផ្លែ',
  bunch: 'កណ្ដាប់',
  bunches: 'កណ្ដាប់',
  handful: 'ក្ដាប់',
  handfuls: 'ក្ដាប់',
  pinch: 'ចឹប',
  pinches: 'ចឹប',
  cup: 'ពែង',
  cups: 'ពែង',
}
