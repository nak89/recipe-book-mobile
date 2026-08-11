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
