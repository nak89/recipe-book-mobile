import { useT } from './LanguageContext'
import type { StringKey } from './strings'
import type { Aisle } from '@/data/aisles'
import type { Difficulty, Mealtime } from '@/types/recipe'
import type { LibrarySubject } from '@/lib/api'

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

/**
 * Aisles are stored English keys too, for the same reason mealtimes are: the
 * grouping is derived from the *stored* ingredient name, so it has to be stable
 * across a language switch. Keyed by the value, so adding an aisle is a compile
 * error here rather than a blank heading.
 */
const AISLE_KEYS: Record<Aisle, StringKey> = {
  Produce: 'grocery.aisleProduce',
  Protein: 'grocery.aisleProtein',
  Pantry: 'grocery.aislePantry',
  Other: 'grocery.aisleOther',
}

const DIFFICULTY_KEYS: Record<Difficulty, StringKey> = {
  Beginner: 'difficulty.beginner',
  Intermediate: 'difficulty.intermediate',
  Advanced: 'difficulty.advanced',
}

/**
 * Explore's BY SUBJECT chips. Same arrangement as the mealtimes above, for the
 * same reason: `subject` is a stored English value on the server's library, so a
 * chip reading "បង្អែម" still filters on `'Sweets'`.
 *
 * Four rather than SCREENS.md §11's five — `Noodles` was dropped because every
 * noodle recipe on the source site is a video with no transcript, so the chip
 * would have rendered and matched nothing.
 */
const SUBJECT_KEYS: Record<LibrarySubject, StringKey> = {
  Soups: 'subject.soups',
  Grilled: 'subject.grilled',
  Sweets: 'subject.sweets',
  Festival: 'subject.festival',
}

/** Labels a mealtime, or the dashboard's `'All'` pseudo-filter. */
export function useMealtimeLabel() {
  const t = useT()
  return (value: Mealtime | 'All') =>
    value === 'All' ? t('filter.all') : t(MEALTIME_KEYS[value])
}

/** Labels a subject, or Explore's own `'All'` pseudo-filter. */
export function useSubjectLabel() {
  const t = useT()
  return (value: LibrarySubject | 'All') =>
    value === 'All' ? t('explore.subjectAll') : t(SUBJECT_KEYS[value])
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

/**
 * The month name, from the app's language rather than the phone's.
 *
 * `toLocaleDateString(undefined, { month: 'long' })` reads the **device**
 * locale, which the toggle has no say over — so a Khmer UI on an English phone
 * printed `AUGUST ១៥`: Khmer numerals against an English month, in one line, on
 * the app's most-seen screen. Passing `km-KH` explicitly is not a fix either,
 * because Hermes ships a reduced ICU and can fall back to English without
 * saying so.
 *
 * Indexed from `getMonth() + 1`, i.e. the human month number, so the key
 * `month.8` is August and nobody has to remember which end is zero-based. That
 * is the opposite arrangement from `DAY_KEYS`, which is indexed by `getDay()`
 * and therefore starts on Sunday.
 */
export function useMonthLabel() {
  const t = useT()
  return (date: Date) => t(`month.${date.getMonth() + 1}` as StringKey)
}

/** Labels a grocery aisle. */
export function useAisleLabel() {
  const t = useT()
  return (value: Aisle) => t(AISLE_KEYS[value])
}
