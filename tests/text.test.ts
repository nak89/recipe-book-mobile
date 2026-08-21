import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { foldForCompare, hasKhmer } from '@/lib/text'

/**
 * The comparison fold, and the Khmer-script test the strikethrough rule hangs
 * off.
 *
 * Both are duplicated in the backend (`lib/text.ts`) and must agree with it
 * exactly — a fold that differs by one character means the app's duplicate-title
 * check and the server's 409 disagree, and a grocery tick lands on a key the
 * server never derived.
 */

describe('foldForCompare', () => {
  it('lowercases and trims', () => {
    assert.equal(foldForCompare('  Fish Amok  '), 'fish amok')
  })

  it('strips the zero-width space Khmer keyboards emit', () => {
    // The whole reason the function exists: U+200B is category Cf, so `trim`,
    // `toLowerCase` and `normalize` all leave it in place, and two titles that
    // are pixel-identical on screen compare unequal.
    assert.equal(foldForCompare('ត្រី​អាម៉ុក'), foldForCompare('ត្រីអាម៉ុក'))
  })

  it('strips the rest of the invisible set', () => {
    for (const invisible of ['­', '‌', '‍', '⁠', '﻿']) {
      assert.equal(foldForCompare(`am${invisible}ok`), 'amok')
    }
  })

  it('composes canonically', () => {
    // é as one code point vs e + combining acute.
    assert.equal(foldForCompare('café'), foldForCompare('café'))
  })

  it('leaves an already-folded value alone', () => {
    assert.equal(foldForCompare(foldForCompare('  Fish​ Amok ')), 'fish amok')
  })

  it('does not collapse interior spaces', () => {
    // The fold is for comparison, not normalisation of user copy — two words
    // separated by two spaces are still two words, and rewriting that would be
    // editing what someone typed.
    assert.equal(foldForCompare('fish  amok'), 'fish  amok')
  })
})

describe('hasKhmer', () => {
  it('finds Khmer consonants, vowels and digits', () => {
    assert.equal(hasKhmer('ត្រី'), true)
    assert.equal(hasKhmer('៥០'), true)
  })

  it('is false for Latin', () => {
    assert.equal(hasKhmer('Fish amok'), false)
    assert.equal(hasKhmer('250 g'), false)
    assert.equal(hasKhmer(''), false)
  })

  it('is true for a mixed string', () => {
    // The strikethrough rule is about whether *any* mark could be crossed out,
    // so one Khmer cluster in an English sentence is enough to suppress it.
    assert.equal(hasKhmer('2 ស្លាបព្រា of oil'), true)
  })

  it('has no regex state to leak between calls', () => {
    assert.equal(hasKhmer('ត្រី'), true)
    assert.equal(hasKhmer('ត្រី'), true)
  })
})
