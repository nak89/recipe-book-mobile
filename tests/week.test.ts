import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DAYS_IN_WEEK,
  addDays,
  fromDateKey,
  isSameDay,
  startOfWeek,
  toDateKey,
  weekDays,
} from '@/lib/week'

/**
 * The planner's date arithmetic.
 *
 * Everything here exists because of one class of bug: a date function that is
 * right in the timezone you wrote it in and wrong somewhere else, or right in
 * January and wrong on the 31st. Those don't show up in a screenshot — they show
 * up as a user in Phnom Penh opening the planner in the evening and seeing
 * tomorrow.
 *
 * The tests below therefore lean on **boundaries** rather than on typical days.
 */

describe('toDateKey', () => {
  it('reads local time, not UTC', () => {
    // 23:00 local on the 9th. `toISOString().slice(0,10)` returns the 10th east
    // of UTC and the 9th west of it; `toDateKey` must say the 9th everywhere.
    assert.equal(toDateKey(new Date(2026, 7, 9, 23, 0, 0)), '2026-08-09')
    assert.equal(toDateKey(new Date(2026, 7, 9, 0, 30, 0)), '2026-08-09')
  })

  it('zero-pads single-digit months and days', () => {
    assert.equal(toDateKey(new Date(2026, 0, 1)), '2026-01-01')
  })
})

describe('fromDateKey', () => {
  it('lands on local midnight, not UTC midnight', () => {
    // `new Date('2026-08-09')` is UTC midnight — the one format the spec pins
    // that way — which is the 8th for anyone behind UTC.
    const date = fromDateKey('2026-08-09')
    assert.equal(date.getFullYear(), 2026)
    assert.equal(date.getMonth(), 7)
    assert.equal(date.getDate(), 9)
    assert.equal(date.getHours(), 0)
  })

  it('round-trips through toDateKey', () => {
    for (const key of ['2026-01-01', '2026-02-28', '2026-08-09', '2026-12-31']) {
      assert.equal(toDateKey(fromDateKey(key)), key)
    }
  })
})

describe('addDays', () => {
  it('crosses a month boundary', () => {
    assert.equal(toDateKey(addDays(fromDateKey('2026-01-31'), 1)), '2026-02-01')
  })

  it('crosses a year boundary', () => {
    assert.equal(toDateKey(addDays(fromDateKey('2026-12-31'), 1)), '2027-01-01')
  })

  it('handles a leap day', () => {
    assert.equal(toDateKey(addDays(fromDateKey('2028-02-28'), 1)), '2028-02-29')
    assert.equal(toDateKey(addDays(fromDateKey('2026-02-28'), 1)), '2026-03-01')
  })

  it('goes backwards', () => {
    assert.equal(toDateKey(addDays(fromDateKey('2026-03-01'), -1)), '2026-02-28')
  })

  it('does not mutate its argument', () => {
    const original = fromDateKey('2026-08-09')
    addDays(original, 5)
    assert.equal(toDateKey(original), '2026-08-09')
  })

  it('stays on the right day across a DST shift', () => {
    // Adding 86_400_000ms instead lands at 23:00 or 01:00 the day before/after
    // wherever the clocks move. Stepping with setDate normalises it.
    // 2026-03-29 is the European spring-forward; 2026-11-01 the US fall-back.
    for (const key of ['2026-03-28', '2026-10-31', '2026-11-01']) {
      const next = addDays(fromDateKey(key), 1)
      assert.equal(next.getHours(), 0, `${key} + 1 day left the clock at ${next.getHours()}:00`)
    }
  })
})

describe('startOfWeek', () => {
  it('is Monday-first', () => {
    // 2026-08-09 is a Sunday. Monday-first means it belongs to the week that
    // *started* on the 3rd, not the one starting the next day.
    assert.equal(fromDateKey('2026-08-09').getDay(), 0)
    assert.equal(toDateKey(startOfWeek(fromDateKey('2026-08-09'))), '2026-08-03')
  })

  it('leaves a Monday where it is', () => {
    assert.equal(toDateKey(startOfWeek(fromDateKey('2026-08-10'))), '2026-08-10')
  })

  it('agrees for every day of one week', () => {
    for (let i = 0; i < DAYS_IN_WEEK; i++) {
      const day = addDays(fromDateKey('2026-08-10'), i)
      assert.equal(toDateKey(startOfWeek(day)), '2026-08-10')
    }
  })

  it('is idempotent', () => {
    const once = startOfWeek(fromDateKey('2026-08-09'))
    assert.equal(toDateKey(startOfWeek(once)), toDateKey(once))
  })
})

describe('weekDays', () => {
  it('returns seven consecutive days starting on Monday', () => {
    const days = weekDays(fromDateKey('2026-08-09')).map(toDateKey)
    assert.deepEqual(days, [
      '2026-08-03',
      '2026-08-04',
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
      '2026-08-08',
      '2026-08-09',
    ])
  })

  it('spans a month boundary without a gap', () => {
    const days = weekDays(fromDateKey('2026-09-02')).map(toDateKey)
    assert.equal(days.length, DAYS_IN_WEEK)
    assert.equal(days[0], '2026-08-31')
    assert.equal(days[6], '2026-09-06')
  })
})

describe('isSameDay', () => {
  it('ignores the time of day', () => {
    assert.equal(isSameDay(new Date(2026, 7, 9, 0, 0), new Date(2026, 7, 9, 23, 59)), true)
  })

  it('separates adjacent days', () => {
    assert.equal(isSameDay(new Date(2026, 7, 9, 23, 59), new Date(2026, 7, 10, 0, 0)), false)
  })
})
