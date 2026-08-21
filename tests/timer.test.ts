import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  durationParts,
  formatDuration,
  timerProgress,
  MAX_STEP_SECONDS,
  TIMER_PRESETS,
} from '@/lib/timer'
import { toKhmerDigits } from '@/lib/numerals'

describe('formatDuration', () => {
  it('writes minutes and seconds under an hour', () => {
    assert.equal(formatDuration(30), '0:30')
    assert.equal(formatDuration(60), '1:00')
    assert.equal(formatDuration(90), '1:30')
    assert.equal(formatDuration(600), '10:00')
    assert.equal(formatDuration(3599), '59:59')
  })

  it('adds hours only once there are some', () => {
    // A leading `0:` on every timer would be noise on the ninety per cent of
    // steps that never reach an hour.
    assert.equal(formatDuration(3600), '1:00:00')
    assert.equal(formatDuration(5400), '1:30:00')
  })

  it('pads everything but the leading unit', () => {
    // `01:30:00` reads as something a machine typed.
    assert.equal(formatDuration(3661), '1:01:01')
    assert.equal(formatDuration(61), '1:01')
  })

  it('floors at zero rather than counting past it', () => {
    // A finished timer holds at 0:00; a negative one would be a bug on display.
    assert.equal(formatDuration(0), '0:00')
    assert.equal(formatDuration(-5), '0:00')
  })

  it('returns Latin digits for the caller to convert', () => {
    // Same contract as `formatAmount`: the numeral script belongs to the screen,
    // and `useNum` converts the digits while leaving the colons alone.
    assert.equal(formatDuration(600), '10:00')
    assert.equal(toKhmerDigits(formatDuration(600)), '១០:០០')
    assert.equal(toKhmerDigits(formatDuration(5400)), '១:៣០:០០')
  })
})

describe('durationParts', () => {
  it('splits a duration into its three units', () => {
    assert.deepEqual(durationParts(90), { hours: 0, minutes: 1, seconds: 30 })
    assert.deepEqual(durationParts(3661), { hours: 1, minutes: 1, seconds: 1 })
    assert.deepEqual(durationParts(0), { hours: 0, minutes: 0, seconds: 0 })
  })
})

describe('timerProgress', () => {
  it('runs from nothing done to all of it', () => {
    assert.equal(timerProgress(600, 600), 0)
    assert.equal(timerProgress(300, 600), 0.5)
    assert.equal(timerProgress(0, 600), 1)
  })

  it('never returns NaN for a zero-length timer', () => {
    // `width: 'NaN%'` is a silently-missing progress bar, and nothing reports it.
    assert.equal(timerProgress(0, 0), 0)
    assert.ok(Number.isFinite(timerProgress(10, 0)))
  })

  it('clamps rather than overshooting', () => {
    assert.equal(timerProgress(-30, 600), 1)
    assert.equal(timerProgress(900, 600), 0)
  })
})

describe('TIMER_PRESETS', () => {
  it('are all inside what the API will accept', () => {
    // The bound is mirrored from the backend's `MAX_STEP_SECONDS`. A preset
    // outside it would let the picker offer a value that fails validation and
    // takes the whole recipe down with it.
    for (const seconds of TIMER_PRESETS) {
      assert.ok(Number.isInteger(seconds), `${seconds} is not a whole number of seconds`)
      assert.ok(seconds >= 1 && seconds <= MAX_STEP_SECONDS, `${seconds} is out of range`)
    }
  })

  it('are strictly ascending and unique', () => {
    // The picker renders them in order, so a duplicate would be two identical
    // rows and a descending pair would read as a mistake.
    for (let i = 1; i < TIMER_PRESETS.length; i += 1) {
      assert.ok(TIMER_PRESETS[i] > TIMER_PRESETS[i - 1], `${TIMER_PRESETS[i]} is out of order`)
    }
  })
})
