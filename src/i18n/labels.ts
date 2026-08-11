import { useT } from './LanguageContext'
import type { StringKey } from './strings'
import type { Difficulty, Mealtime } from '@/types/recipe'

/**
 * Display labels for the two enums that live in the **database**.
 *
 * `Recipe.mealtime` stores `'Breakfast'` and `Recipe.difficulty` stores
 * `'Beginner'` — those are the values every existing row already holds, the
 * values the dashboard filters on (`recipe.mealtime !== filter`), and the values
 * the backend's zod schemas accept. None of that changes.
 *
 * So the toggle translates the **label** and never the value. A chip reading
 * "អាហារពេលព្រឹក" still filters on `'Breakfast'`, and a recipe saved in Khmer is
 * byte-identical to one saved in English. This is the same chrome-not-content
 * line the whole feature is drawn along, applied to a field that happens to look
 * like UI text.
 *
 * Keeping the maps keyed by the English value is what makes that safe: add a
 * mealtime to the enum and TypeScript demands a key here, so a new value can't
 * silently render as blank.
 */

const MEALTIME_KEYS: Record<Mealtime, StringKey> = {
  Breakfast: 'mealtime.breakfast',
  Lunch: 'mealtime.lunch',
  Dinner: 'mealtime.dinner',
  Snack: 'mealtime.snack',
}

const DIFFICULTY_KEYS: Record<Difficulty, StringKey> = {
  Beginner: 'difficulty.beginner',
  Intermediate: 'difficulty.intermediate',
  Advanced: 'difficulty.advanced',
}

/** Labels a mealtime, or the dashboard's `'All'` pseudo-filter. */
export function useMealtimeLabel() {
  const t = useT()
  return (value: Mealtime | 'All') =>
    value === 'All' ? t('filter.all') : t(MEALTIME_KEYS[value])
}

export function useDifficultyLabel() {
  const t = useT()
  return (value: Difficulty) => t(DIFFICULTY_KEYS[value])
}

/**
 * Day-of-week labels for the planner's strip.
 *
 * Indexed by `Date.getDay()`, which is **Sunday-0** — so this array starts on
 * Sunday even though the strip renders Monday-first. Reordering it to match the
 * visual order is the obvious tidy-up and would shift every label by a day;
 * `weekDays()` in `lib/week.ts` owns the Monday-first ordering instead.
 *
 * Not `toLocaleDateString`: that follows the *device* locale, which has nothing
 * to do with the in-app language toggle, so a Khmer UI on an English phone would
 * grow English day names in the middle of it.
 */
const DAY_KEYS: StringKey[] = [
  'day.sun',
  'day.mon',
  'day.tue',
  'day.wed',
  'day.thu',
  'day.fri',
  'day.sat',
]

export function useDayLabel() {
  const t = useT()
  return (date: Date) => t(DAY_KEYS[date.getDay()])
}
