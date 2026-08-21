/**
 * Step timers: how a duration is written, and what a step is allowed to hold.
 *
 * Pure and Latin-digit, exactly like `lib/grocery.ts`'s `formatAmount` and for
 * the same two reasons — the numeral script belongs to the screen (the caller
 * wraps the result in `useNum()`), and this module has to stay importable by the
 * offline test suite, which has no React in its graph.
 */

/**
 * Mirrors `MAX_STEP_SECONDS` in the backend's `validation.ts`. Twelve hours: a
 * stock or a cure genuinely runs that long, so this is a bound against a
 * slipped keystroke rather than a product rule.
 *
 * This is the fourth constant duplicated across the two repositories, after
 * `MAX_RECIPE_BYTES`, the `foldForCompare` fold and the nutrition caps. They
 * have to agree or the wizard lets a value through that the API then rejects
 * along with the whole recipe.
 */
export const MAX_STEP_SECONDS = 12 * 60 * 60

/**
 * What the timer chip offers, in seconds.
 *
 * A fixed list rather than a free-entry field. Cooking times are conventional —
 * nobody simmers for 7 minutes — and a number pad on a card in a wizard is a
 * lot of control for a value most steps will never set. Anything outside this
 * list can still be *stored* (the column is an integer and the schema accepts
 * 1..43200); the picker is a shortcut, the same way the pantry and the cuisine
 * list are.
 */
export const TIMER_PRESETS = [
  30,
  60,
  90,
  2 * 60,
  3 * 60,
  5 * 60,
  10 * 60,
  15 * 60,
  20 * 60,
  30 * 60,
  45 * 60,
  60 * 60,
  90 * 60,
  2 * 60 * 60,
]

/**
 * `600` → `10:00`, `5400` → `1:30:00`.
 *
 * Minutes-and-seconds until an hour, then hours-minutes-seconds — the shape a
 * clock uses, so a countdown reads without a legend. Seconds and minutes are
 * zero-padded and the leading unit is not, because `01:30:00` reads as a
 * duration typed by a machine.
 *
 * **Latin digits.** `useNum()` converts them at the call site and leaves the
 * colons alone.
 */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`
}

/**
 * The same duration written as words for a screen reader and for the picker's
 * list, where `0:30` beside `1:30` is ambiguous about which unit is which.
 *
 * Returns the *parts*, not a sentence, so the caller can join them with
 * translated unit words rather than having English baked in here.
 */
export function durationParts(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.round(totalSeconds))
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

/**
 * How far through a countdown we are, `0`–`1`.
 *
 * Guards the zero-duration case rather than returning `NaN`: a `NaN` width is a
 * silently-missing progress bar, and `width: 'NaN%'` is not an error anything
 * reports.
 */
export function timerProgress(remaining: number, total: number): number {
  if (total <= 0) return 0
  const done = (total - remaining) / total
  return Math.min(1, Math.max(0, done))
}
