/**
 * Which part of a shop an ingredient belongs to.
 *
 * The pantries already carry a `category` — eight of them, in each language —
 * but a category is a *recipe* taxonomy and an aisle is a *shop* one. Eight
 * headings over a fifteen-line list leaves most sections holding a single row,
 * which is worse than the loose-lists problem the grocery panels exist to fix.
 * These four are what the design system's own grocery screen renders.
 *
 * **This never consults the current language**, and that is the whole trick.
 * It runs on the *stored* ingredient name at render time, exactly as
 * `emojiForIngredient` does — so a recipe written in English keeps its aisle
 * when the interface is switched to Khmer, and vice versa. Both pantries are
 * searched unconditionally; the result is a canonical key that `i18n/labels.ts`
 * translates for display, the same arrangement `Mealtime` and `Difficulty` use.
 */
import { foldForCompare } from '@/lib/text'
import { COMMON_INGREDIENTS } from './ingredients'
import { KHMER_INGREDIENTS } from './ingredients.km'

/**
 * Stored English keys, never shown to a user. `Other` is the fallback for a
 * free-text ingredient in neither pantry, which is an ordinary case rather than
 * a failure — the pantries are a shortcut, and typing your own is the real
 * input.
 */
export const AISLES = ['Produce', 'Protein', 'Pantry', 'Other'] as const
export type Aisle = (typeof AISLES)[number]

/**
 * Category to aisle, for both pantries.
 *
 * Keyed by the category strings themselves rather than by index, because the
 * two lists put their eight categories in different orders — pairing them
 * positionally would work today and silently mis-file everything the first time
 * either list was reordered.
 */
const CATEGORY_TO_AISLE: Record<string, Aisle> = {
  // Latin
  Vegetables: 'Produce',
  Fruit: 'Produce',
  'Meat & Fish': 'Protein',
  'Dairy & Eggs': 'Protein',
  'Grains & Pasta': 'Pantry',
  'Herbs & Spices': 'Pantry',
  'Sauces & Oils': 'Pantry',
  'Baking & Sweet': 'Pantry',
  // Khmer
  បន្លែ: 'Produce',
  ផ្លែឈើ: 'Produce',
  'សាច់ និងត្រី': 'Protein',
  'ស៊ុត និងទឹកដោះ': 'Protein',
  'អង្ករ និងមី': 'Pantry',
  គ្រឿងទេស: 'Pantry',
  'ទឹកជ្រលក់ និងប្រេង': 'Pantry',
  គ្រឿងផ្អែម: 'Pantry',
}

const ALL = [...COMMON_INGREDIENTS, ...KHMER_INGREDIENTS]

const BY_NAME = new Map(ALL.map((i) => [foldForCompare(i.name), i.category]))

const LATIN_BY_LENGTH = [...COMMON_INGREDIENTS].sort((a, b) => b.name.length - a.name.length)
const KHMER_BY_LENGTH = [...KHMER_INGREDIENTS].sort((a, b) => b.name.length - a.name.length)

const HAS_KHMER = /[ក-៿]/

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Crude singularisation — enough for "eggs", "tomatoes", "berries". */
function singular(value: string) {
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`
  if (value.endsWith('oes')) return value.slice(0, -2)
  if (value.endsWith('s') && !value.endsWith('ss')) return value.slice(0, -1)
  return value
}

/**
 * Best-effort aisle for a free-text ingredient name, in either language.
 *
 * Exact match first, then a fallback scan whose strategy depends on the script
 * — the same two-path shape as `emojiForIngredient`, for the same reason: Khmer
 * is written without spaces, so `\b` can never match in it and a longest-first
 * substring scan is what the absence of word boundaries actually calls for.
 */
export function aisleForIngredient(name: string): Aisle {
  const key = foldForCompare(name)
  if (!key) return 'Other'

  const exact = BY_NAME.get(key) ?? BY_NAME.get(singular(key))
  if (exact) return CATEGORY_TO_AISLE[exact] ?? 'Other'

  if (HAS_KHMER.test(key)) {
    const match = KHMER_BY_LENGTH.find((i) => key.includes(foldForCompare(i.name)))
    return match ? CATEGORY_TO_AISLE[match.category] ?? 'Other' : 'Other'
  }

  // Whole words, so "2 cloves of garlic" and "garlic paste" both land in
  // Produce without "oil" matching inside "boiling".
  const match = LATIN_BY_LENGTH.find((i) =>
    new RegExp(`\\b${escapeRegExp(foldForCompare(i.name))}s?\\b`).test(key)
  )
  return match ? CATEGORY_TO_AISLE[match.category] ?? 'Other' : 'Other'
}
