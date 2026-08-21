import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  hasKhmerDigits,
  localiseDigits,
  padded,
  parseNumeric,
  parseWholeNumber,
  toKhmerDigits,
  toLatinDigits,
} from '@/lib/numerals'

/**
 * The numeral rule, tested where it can be: `lib/numerals.ts` imports nothing,
 * so it runs under plain Node with no React, no react-native and no mocks.
 *
 * `parseNumeric`/`parseWholeNumber` are the half worth testing hardest. They
 * are a bug fix, not a formatting nicety — `Number('២')` is `NaN`, and a NaN
 * reaching `JSON.stringify` becomes `null`, so a Khmer-typed quantity used to
 * arrive at the API as an absent field rather than as a wrong one.
 */

describe('toKhmerDigits', () => {
  it('maps every digit', () => {
    assert.equal(toKhmerDigits('0123456789'), '០១២៣៤៥៦៧៨៩')
  })

  it('leaves unit symbols and punctuation alone', () => {
    // The README is explicit: symbols stay Latin in both languages. Only the
    // word-units translate, and that happens in `data/units.km.ts`.
    assert.equal(toKhmerDigits('250 g'), '២៥០ g')
    assert.equal(toKhmerDigits('1.5 ml'), '១.៥ ml')
    assert.equal(toKhmerDigits('10 — 16 AUGUST'), '១០ — ១៦ AUGUST')
  })

  it('leaves Khmer script untouched', () => {
    assert.equal(toKhmerDigits('៤ ស្លាបព្រា'), '៤ ស្លាបព្រា')
  })

  it('is idempotent', () => {
    assert.equal(toKhmerDigits(toKhmerDigits('42')), '៤២')
  })
})

describe('toLatinDigits', () => {
  it('maps every digit back', () => {
    assert.equal(toLatinDigits('០១២៣៤៥៦៧៨៩'), '0123456789')
  })

  it('round-trips', () => {
    for (const value of ['0', '9', '1000', '1.5', '0.75', '2026-08-14']) {
      assert.equal(toLatinDigits(toKhmerDigits(value)), value)
    }
  })

  it('leaves the decimal point and thousands comma alone', () => {
    // Khmer uses the same two marks, so there is nothing to map — the comma
    // swap some callers do is about European decimal commas, not about script.
    assert.equal(toLatinDigits('១,០០០.៥'), '1,000.5')
  })
})

describe('hasKhmerDigits', () => {
  it('finds one anywhere in the string', () => {
    assert.equal(hasKhmerDigits('12៣'), true)
    assert.equal(hasKhmerDigits('123'), false)
  })

  it('does not carry regex state between calls', () => {
    // The bug this guards: a `/g` regex keeps `lastIndex` across `.test()`
    // calls, so the same input answers true then false. Invisible in review,
    // obvious here.
    assert.equal(hasKhmerDigits('៥'), true)
    assert.equal(hasKhmerDigits('៥'), true)
    assert.equal(hasKhmerDigits('៥'), true)
  })

  it('is false for Khmer letters with no digits', () => {
    assert.equal(hasKhmerDigits('ស្លាបព្រា'), false)
  })
})

describe('localiseDigits', () => {
  it('converts in both directions from one call', () => {
    assert.equal(localiseDigits('50', 'km'), '៥០')
    assert.equal(localiseDigits('៥០', 'en'), '50')
  })

  it('normalises rather than only converting', () => {
    // A string that already carries the wrong script must come out right, not
    // be left alone — content can arrive mixed after a paste.
    assert.equal(localiseDigits('៥0', 'km'), '៥០')
    assert.equal(localiseDigits('៥0', 'en'), '50')
  })
})

describe('parseNumeric', () => {
  it('parses Khmer digits — the whole reason it exists', () => {
    assert.equal(Number.isNaN(Number('២')), true) // the bug, pinned
    assert.equal(parseNumeric('២'), 2)
    assert.equal(parseNumeric('១.៥'), 1.5)
    assert.equal(parseNumeric('១២៣៤'), 1234)
  })

  it('still parses Latin', () => {
    assert.equal(parseNumeric('2'), 2)
    assert.equal(parseNumeric('1.5'), 1.5)
    assert.equal(parseNumeric(' 7 '), 7)
  })

  it('accepts a decimal comma', () => {
    assert.equal(parseNumeric('1,5'), 1.5)
    assert.equal(parseNumeric('១,៥'), 1.5)
  })

  it('returns null rather than NaN', () => {
    // `JSON.stringify(NaN)` is `null`, which the backend reads as "field
    // omitted" — so a wrong number would silently clear a column instead of
    // being rejected. null forces the caller to decide.
    assert.equal(parseNumeric(''), null)
    assert.equal(parseNumeric('   '), null)
    assert.equal(parseNumeric('abc'), null)
    assert.equal(parseNumeric('ស្លាបព្រា'), null)
  })

  it('rejects infinity', () => {
    assert.equal(parseNumeric('Infinity'), null)
    assert.equal(parseNumeric('1e400'), null)
  })

  it('keeps a genuine zero', () => {
    // `?? 0` and `|| 1` behave differently here and the callers rely on it: a
    // quantity of 0 is a real value, not a blank field.
    assert.equal(parseNumeric('0'), 0)
    assert.equal(parseNumeric('០'), 0)
  })
})

describe('parseWholeNumber', () => {
  it('parses Khmer digits', () => {
    assert.equal(parseWholeNumber('៣០'), 30)
    assert.equal(parseWholeNumber('៤'), 4)
  })

  it('rejects decimals as text, not by rounding', () => {
    // `Number('30.5')` is a fine number, so an `isInteger` check on the parsed
    // value would silently accept and round. Servings must be whole.
    assert.equal(parseWholeNumber('30.5'), null)
    assert.equal(parseWholeNumber('៣០.៥'), null)
    assert.equal(parseWholeNumber('30,5'), null)
  })

  it('rejects blanks, signs and junk', () => {
    assert.equal(parseWholeNumber(''), null)
    assert.equal(parseWholeNumber('-4'), null)
    assert.equal(parseWholeNumber('4 servings'), null)
  })

  it('rejects values past the safe-integer range', () => {
    assert.equal(parseWholeNumber('9'.repeat(20)), null)
  })

  it('keeps zero', () => {
    assert.equal(parseWholeNumber('0'), 0)
  })
})

describe('padded', () => {
  it('pads before converting', () => {
    assert.equal(padded(1, 2, 'en'), '01')
    assert.equal(padded(1, 2, 'km'), '០១')
    assert.equal(padded(8, 2, 'km'), '០៨')
  })

  it('does not truncate a number wider than the pad', () => {
    assert.equal(padded(123, 2, 'en'), '123')
  })

  it('defaults to two places in Latin', () => {
    assert.equal(padded(3), '03')
  })
})
