/**
 * Calendar-day arithmetic for the meal planner.
 *
 * Every function here works in **local time** and returns `YYYY-MM-DD` strings.
 * That combination is the entire point of the module, and it is easy to get
 * wrong in a way that only breaks for some of your users:
 *
 * - `new Date().toISOString().slice(0, 10)` is the obvious way to get today's
 *   key, and it is wrong. `toISOString` converts to UTC first, so at 9pm in
 *   Phnom Penh (UTC+7) it returns *tomorrow*, and the planner opens on the wrong
 *   day for the whole evening. Anywhere west of UTC it does the same in reverse.
 * - Adding days by adding `86_400_000` milliseconds is wrong for the same family
 *   of reasons: a day is not always 24 hours where daylight saving applies, and
 *   the arithmetic silently lands mid-afternoon on the previous day.
 *
 * So: build keys from the local `getFullYear`/`getMonth`/`getDate`, and step
 * days by mutating `setDate`, which the platform normalises across month, year
 * and DST boundaries for us.
 */

/** Monday-first, matching the design's day strip. */
export const DAYS_IN_WEEK = 7

/** The `YYYY-MM-DD` key for a Date, read in local time. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * A `YYYY-MM-DD` key back to a Date at **local** midnight.
 *
 * `new Date('2026-08-09')` parses as UTC midnight — the one date format the spec
 * pins that way — so it lands on the 8th for anyone behind UTC. Passing the
 * parts separately is what keeps the day intact.
 */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** `n` days after `date` (negative to go back), normalised across months. */
export function addDays(date: Date, n: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + n)
  return next
}

/**
 * The Monday of the week containing `date`.
 *
 * `getDay()` is Sunday-0, and the design's strip runs Monday-first, so Sunday
 * has to fall at the *end* of its week rather than the start of the next one —
 * hence the `(day + 6) % 7` rather than a bare subtraction.
 */
export function startOfWeek(date: Date): Date {
  const day = date.getDay()
  return addDays(date, -((day + 6) % 7))
}

/** The seven days of the week containing `date`, Monday first. */
export function weekDays(date: Date): Date[] {
  const monday = startOfWeek(date)
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(monday, i))
}

/** True when both Dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b)
}
