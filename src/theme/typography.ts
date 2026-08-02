import { Platform } from 'react-native'
import type { TextStyle } from 'react-native'

/**
 * Font families that aren't the system face.
 *
 * Instrument Serif is loaded in the root layout and used *only* by onboarding's
 * editorial headline — everything else in the app is deliberately system-font,
 * and a serif leaking into a recipe screen would read as a different product.
 * The mono face is a platform lookup rather than a bundled font: RN has no
 * `ui-monospace`, and shipping a typeface for one 10pt kicker isn't worth it.
 */
export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
} as const

/**
 * The Latin scale. `useThemedStyles` hands this to every `makeStyles` factory
 * while the UI language is English.
 *
 * Only `editorialDisplay` and `displayLarge` pin a `lineHeight`; the rest leave
 * it unset and inherit the font's own metrics, which is right for Latin and
 * exactly wrong for Khmer — see `typeKm`.
 */
export const type = {
  // Onboarding only. The lineHeight sits far below the face's natural 1.3em
  // because the two lines are meant to close up into a block, which is what
  // makes the serif read as set rather than typed.
  //
  // 48 is a floor, not a taste: both platforms shrink the line box from the top
  // when lineHeight is under the font's own ascent, so the first line's
  // ascenders get shaved. Instrument Serif's tallest glyph in this copy reaches
  // 0.748em — 32.9pt at 44 — and iOS leaves only `lineHeight - descent` above
  // the baseline, so anything under ~47 clips. It was 43, which is exactly why
  // "Every recipe you" read as cut off along the top.
  editorialDisplay: {
    fontFamily: fonts.serif,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  kicker: { fontFamily: fonts.mono, fontSize: 10, fontWeight: '500', letterSpacing: 1.8 },
  // The top of the sans scale, for a screen whose headline *is* the content —
  // the welcome sheet. `display` sits one step below and titles a screen you're
  // working in, which is a different job and shouldn't grow to match.
  displayLarge: { fontSize: 32, fontWeight: '700', letterSpacing: -0.7, lineHeight: 37 },
  display: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  section: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  /**
   * A step above `body`, for text you type into or tap — form inputs, select
   * triggers, action-sheet rows, button labels.
   *
   * It existed before this token did, as a bare `fontSize: 16` written over a
   * spread `body` in eight places. The floor is a real constraint rather than a
   * preference: mobile Safari zooms the page when a focused input is under
   * 16px, and this app runs on web.
   */
  bodyLarge: { fontSize: 16, fontWeight: '400' },
  bodyLargeStrong: { fontSize: 16, fontWeight: '600' },
  /**
   * Body copy set as a paragraph — a recipe's description, a method step, a
   * dialog's message. The extra leading is for reading several lines, not for
   * fitting glyphs, which is why it's a token and not a hand-set `lineHeight`
   * over `body`: written by hand it would land on Khmer too, and a pinned line
   * box is what clips Khmer. `typeKm.bodyRead` leaves it unset.
   */
  bodyRead: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const

/**
 * One entry in the scale. Deliberately wider than what `type` infers under
 * `as const`: the literal types are useless to a consumer and would make the
 * Khmer scale unassignable the moment a size differed, which is the entire
 * point of having a second scale.
 */
interface TextToken {
  fontFamily?: string
  fontSize: number
  fontWeight?: TextStyle['fontWeight']
  letterSpacing?: number
  lineHeight?: number
}

/**
 * Every token a `makeStyles` factory can spread. `typeKm` is annotated with it
 * so a token added to one scale and not the other is a compile error — the same
 * guarantee `ThemeColors` gives the palettes and `Strings` gives the dictionary.
 */
export type TypeScale = Record<keyof typeof type, TextToken>

/**
 * The Khmer scale. Same sizes as Latin. Two departures, and only two:
 *
 * - **No `lineHeight` on any token.** This is the whole point of the scale, and
 *   it is the opposite of the obvious fix. A Khmer cluster stacks a vowel sign
 *   above the base consonant and a subscript consonant below it, so its ink runs
 *   past what Latin ascenders and descenders claim — and both platforms shrink
 *   the line box **from the top** when `lineHeight` is under the font's ascent,
 *   shaving the marks off the first line. Those marks are the vowels, so what
 *   gets clipped is meaning.
 *
 *   The trap is that raising `lineHeight` doesn't fix it. There is no constant
 *   that works: how far a cluster reaches depends on which marks it carries, so
 *   a value tall enough for ក becomes too short for ក្ដី, and one tall enough
 *   for everything overflows the fixed-height containers this app is full of
 *   (`Field` is 50pt, `SearchBar` 48, `PrimaryButton` 52) and clips the text
 *   whole. Both failures look identical on screen — cut-off text — which is why
 *   a first pass at ~1.45× made *every* string clip rather than fixing the one
 *   that started it.
 *
 *   Leaving it unset hands the measurement to the platform, which reads the
 *   ascent and descent out of the font that is actually rendering the glyphs.
 *   That is the only source that knows. **Do not add a `lineHeight` here, and do
 *   not hardcode one over a token in a screen** — see `bodyRead` for the one
 *   case that legitimately wants extra leading.
 *
 * - **`letterSpacing: 0` everywhere.** The Latin scale's negative tracking is a
 *   refinement for headlines in a face with generous sidebearings; applied to
 *   Khmer it crowds already-dense stacked clusters, and positive tracking is
 *   worse still — it visually detaches a combining mark from the consonant it
 *   belongs to. Khmer has no equivalent refinement, so tracking goes to zero
 *   rather than being scaled.
 *
 * Sizes match Latin exactly. An earlier version stepped every token up a point
 * on the reasoning that Khmer carries more detail per em; in the fixed-height
 * containers above, that bought a little legibility and a lot of clipping.
 *
 * `editorialDisplay` is carried over verbatim: it belongs to the intro
 * carousel, which stays English in both languages, so it is never set in Khmer.
 * It's here because the scale has to be complete, not because it's used.
 */
export const typeKm: TypeScale = {
  editorialDisplay: type.editorialDisplay,
  // No `fontFamily`: Menlo and Android's `monospace` carry no Khmer glyphs, so
  // naming either only hides a silent fallback to the system face.
  kicker: { fontSize: 10, fontWeight: '500', letterSpacing: 0 },
  // The one Latin token below `editorialDisplay` that pins a lineHeight (37 at
  // 32, tuned to close two lines into a block). Dropped rather than raised, for
  // the reason above — the welcome sheet's copy block is content-sized, so
  // natural leading costs a few points of height and nothing else.
  displayLarge: { fontSize: 32, fontWeight: '700', letterSpacing: 0 },
  display: { fontSize: 28, fontWeight: '700', letterSpacing: 0 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: 0 },
  section: { fontSize: 17, fontWeight: '700', letterSpacing: 0 },
  body: { fontSize: 15, fontWeight: '400', letterSpacing: 0 },
  bodyStrong: { fontSize: 15, fontWeight: '600', letterSpacing: 0 },
  bodyLarge: { fontSize: 16, fontWeight: '400', letterSpacing: 0 },
  bodyLargeStrong: { fontSize: 16, fontWeight: '600', letterSpacing: 0 },
  bodyRead: { fontSize: 15, fontWeight: '400', letterSpacing: 0 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: '500', letterSpacing: 0 },
}

export const TYPE_SCALES = { en: type, km: typeKm } as const

/**
 * Re-size a token, carrying its line box with it.
 *
 * `{ ...type.bodyStrong, fontSize: 14 }` was harmless while no token below
 * `displayLarge` set a `lineHeight` — the Latin scale still doesn't, so this is
 * a no-op there. The Khmer tokens all pin one, and keeping a 24pt line box on
 * text dropped to 14pt spaces two lines like three, which on a fixed-height
 * recipe tile eats the photograph.
 *
 * Use this instead of overriding `fontSize` on a spread token.
 */
export function sized(token: TypeScale[keyof TypeScale], fontSize: number): TextStyle {
  if (!token.lineHeight) return { ...token, fontSize }
  const ratio = token.lineHeight / token.fontSize
  return { ...token, fontSize, lineHeight: Math.round(fontSize * ratio) }
}
