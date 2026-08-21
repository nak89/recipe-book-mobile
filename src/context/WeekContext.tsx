import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { addDays, startOfWeek, toDateKey } from '@/lib/week'

/**
 * The week the user is working on, shared by the planner and the grocery list.
 *
 * These are two tabs you swipe between, and they are two views of one thing:
 * the grocery list is *built from* the week of plan on screen. If each kept its
 * own week, shifting the planner to next week and swiping across would hand you
 * this week's shopping — and shopping happens before the week you are shopping
 * for, so that is precisely backwards for the main case.
 *
 * One state, lifted here, is what keeps the two honest. The grocery screen
 * names the week in its header so the connection is never a guess.
 *
 * Deliberately **not** persisted. A week is where you are, not a preference:
 * coming back to the app tomorrow should land on the week containing today, not
 * on wherever you happened to be browsing last Tuesday.
 */
interface WeekValue {
  /** Monday of the week on screen. */
  weekStart: Date
  /** `YYYY-MM-DD` for Monday — the API's `from`, and a grocery line's address. */
  weekStartKey: string
  /** `YYYY-MM-DD` for Sunday — the API's `to`. */
  weekEndKey: string
  shiftWeek: (by: number) => void
  goToToday: () => void
}

const WeekContext = createContext<WeekValue | null>(null)

export function WeekProvider({ children }: { children: ReactNode }) {
  // `startOfWeek` is Monday-first and works in local time throughout — see
  // `lib/week.ts` for why neither of those is incidental.
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  const shiftWeek = useCallback((by: number) => {
    setWeekStart((current) => addDays(current, by * 7))
  }, [])

  const goToToday = useCallback(() => {
    setWeekStart(startOfWeek(new Date()))
  }, [])

  const value = useMemo(
    () => ({
      weekStart,
      weekStartKey: toDateKey(weekStart),
      weekEndKey: toDateKey(addDays(weekStart, 6)),
      shiftWeek,
      goToToday,
    }),
    [weekStart, shiftWeek, goToToday]
  )

  return <WeekContext.Provider value={value}>{children}</WeekContext.Provider>
}

export function useWeek(): WeekValue {
  const value = useContext(WeekContext)
  if (!value) throw new Error('useWeek must be used inside a WeekProvider')
  return value
}
