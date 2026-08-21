/**
 * How far the OS is allowed to scale a given type size.
 *
 * Split from `components/ui/Text.tsx` for the same reason `lib/numerals.ts` is
 * split from `i18n/numerals.ts`: the test suite runs under plain Node via
 * `tsx`, so anything it covers has to keep React and `react-native` out of its
 * import graph. This module is the arithmetic; the component is the wiring.
 *
 * React Native defaults `allowFontScaling` to true, so every size in
 * `theme/typography.ts` is multiplied at render by the phone's Display → Text
 * Size setting — up to ~1.35× at the largest ordinary size and ~3.1× at the
 * accessibility sizes. Nothing else in the layout moves with it: a
 * `numberOfLines={1}` cap still truncates at one line and a 44pt circle is
 * still 44pt. That mismatch is what makes type look "too big and cut off" on
 * one phone and correct on another.
 *
 * Disabling scaling would fix the clipping and is the wrong fix — someone who
 * enlarged their system type asked for larger type. So this clamps by
 * **result** rather than by ratio:
 *
 *     multiplier = clamp(MIN, CEILING / fontSize, MAX)
 *
 * A flat ratio cap is the wrong shape, because the same 1.35× is harmless on a
 * 10pt kicker and catastrophic on cook mode's 100pt `stepNumeral`. Capping the
 * *rendered* size means small type scales all the way — a 10pt label reaches
 * its full 13.5pt, since 34/10 exceeds the cap — while display type barely
 * moves and the 100pt numeral holds still. Scaling lands where it helps
 * (labels, body, metadata) and is withheld only where the glyph is already far
 * past legible.
 *
 * At the default text size every multiplier the OS applies is 1.0 and none of
 * this changes a pixel. It engages only once the user has moved the slider.
 */

/**
 * The largest rendered size, in points, the layouts are known to absorb.
 * Measured from the tightest real containers rather than chosen: the 44pt
 * `ProfileButton` circle, `minHeights.button` at 52, and the dock's 58pt bar
 * all still hold their content at this ceiling.
 */
export const FONT_SCALE_CEILING = 34

/**
 * The ratio cap that applies before the ceiling bites. iOS's largest
 * *non*-accessibility text size is ~1.35×, so this covers the whole ordinary
 * range and treats the accessibility sizes as the thing being clamped.
 */
export const FONT_SCALE_MAX = 1.35

/** Never scale *down*: a small phone is not a reason to shrink type. */
export const FONT_SCALE_MIN = 1

/**
 * The clamp for a piece of text set at `fontSize`. An unknown size falls back
 * to the ratio cap — that is the same bound an unstyled `<Text>` would want,
 * and it is never looser than the app-wide maximum.
 */
export function maxFontSizeMultiplierFor(fontSize: number | undefined): number {
  if (!fontSize || fontSize <= 0) return FONT_SCALE_MAX
  const byCeiling = FONT_SCALE_CEILING / fontSize
  return Math.max(FONT_SCALE_MIN, Math.min(FONT_SCALE_MAX, byCeiling))
}
