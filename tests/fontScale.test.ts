import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  FONT_SCALE_CEILING,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  maxFontSizeMultiplierFor,
} from '@/lib/fontScale'
import { type, typeKm } from '@/theme/typography'
import type { TypeScale } from '@/theme/typography'

/**
 * The OS font-scaling clamp, checked offline.
 *
 * This is the rule that makes the app survive a phone with Larger Text on, and
 * it is exactly the class of thing a screenshot review cannot catch: web has no
 * Dynamic Type at all, and on a device it only shows up for someone who has
 * moved the slider. So it is pinned here instead.
 */

const SCALES: [string, TypeScale][] = [
  ['type', type],
  ['typeKm', typeKm],
]

describe('maxFontSizeMultiplierFor', () => {
  it('never scales text down', () => {
    for (const size of [8, 10, 15, 25, 40, 62, 100, 500]) {
      assert.ok(
        maxFontSizeMultiplierFor(size) >= FONT_SCALE_MIN,
        `${size}pt got ${maxFontSizeMultiplierFor(size)}, under the floor`
      )
    }
  })

  it('never exceeds the ratio cap', () => {
    for (const size of [1, 4, 8, 10, 15, 25, 100]) {
      assert.ok(maxFontSizeMultiplierFor(size) <= FONT_SCALE_MAX)
    }
  })

  it('lets small type scale all the way', () => {
    // 34/10 is 3.4, far past the cap, so a 10pt label takes the full 1.35.
    assert.equal(maxFontSizeMultiplierFor(10), FONT_SCALE_MAX)
    assert.equal(maxFontSizeMultiplierFor(15), FONT_SCALE_MAX)
  })

  it('holds display type almost still', () => {
    // The whole point of clamping by result: the big tokens barely move.
    assert.ok(maxFontSizeMultiplierFor(32) < 1.1)
    assert.equal(maxFontSizeMultiplierFor(FONT_SCALE_CEILING), 1)
    // Cook mode's 100pt numeral must not grow at all.
    assert.equal(maxFontSizeMultiplierFor(100), 1)
  })

  it('falls back to the cap for an unknown size', () => {
    assert.equal(maxFontSizeMultiplierFor(undefined), FONT_SCALE_MAX)
    assert.equal(maxFontSizeMultiplierFor(0), FONT_SCALE_MAX)
    // A negative size is nonsense rather than a signal to shrink.
    assert.equal(maxFontSizeMultiplierFor(-12), FONT_SCALE_MAX)
  })

  /**
   * The load-bearing one. Whatever the clamp does, no token in either scale may
   * render past the ceiling — that is the number every fixed container in the
   * app was measured against.
   */
  it('keeps every token in both scales inside the ceiling', () => {
    for (const [name, scale] of SCALES) {
      for (const [role, token] of Object.entries(scale)) {
        const rendered = token.fontSize * maxFontSizeMultiplierFor(token.fontSize)
        assert.ok(
          rendered <= FONT_SCALE_CEILING + 0.001 || token.fontSize >= FONT_SCALE_CEILING,
          `${name}.${role}: ${token.fontSize}pt renders at ${rendered}pt, past the ${FONT_SCALE_CEILING}pt ceiling`
        )
      }
    }
  })
})
