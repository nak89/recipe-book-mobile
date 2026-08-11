/**
 * Two palettes, one shape.
 *
 * Every colour is named by role rather than hue, which is what makes a second
 * palette possible at all: no screen asks for "fresh 500", it asks for
 * `primary`. It's also what has made each palette change since — warm stone to
 * near-neutral green, and now this — a change to two files rather than thirty.
 *
 * **One green: `#0FC44A`, and nothing deeper than it exists in the system.**
 * A darker green beside it reads as a second brand, and the darker one always
 * wins the eye. The ramp is three stops and stops there: the green itself,
 * `primaryPressed` a step *lighter* (press has nowhere darker to go), and
 * `accentSoft` for the rare soft fill.
 *
 * **Everything that isn't the green is neutral.** Surfaces, lines and type are
 * near-grey with only a whisper of green in them, which is what lets the one
 * saturated colour carry the whole brand. The previous palette tinted the
 * surfaces green too, and that is precisely what made it read as green-on-green:
 * once everything is slightly green, nothing is green.
 *
 * **There is no flat `colors` export.** Reading a palette directly would bake
 * one theme into a module-scope `StyleSheet.create`, which is exactly the bug
 * that made dark mode impossible before. Use `useThemedStyles` instead.
 */
const light = {
  // Surfaces. `bg` and `surface` are the same value, as they have been through
  // every palette this app has had — a card is defined by its border and shadow
  // here, not by sitting on a different colour, and splitting them now would
  // quietly change that relationship on every screen.
  bg: '#FCFDFC',
  bgSubtle: '#F7F8F8',
  surface: '#FCFDFC',
  surfaceAlt: '#F1F3F2',
  surfaceSunken: '#E9ECEA',

  // Lines
  border: '#E2E6E4',
  borderStrong: '#D0D5D2',

  // Type. Near-grey rather than the deep green it used to be: the type is part
  // of the neutral ground now, not part of the tint. 17.7:1 and 5.3:1 on `bg`.
  text: '#15181A',
  textMuted: '#636C67',
  // Placeholders must read as absent, never as a prefilled value. ~2.9:1 on
  // `bg` — deliberately below the readability floor that `textMuted` clears.
  textPlaceholder: '#8E9793',
  textInverse: '#FFFFFF',
  textOnPhoto: '#FFFFFF',

  // The one token here named by hue rather than role, mirroring the design
  // system's own `--white` base token. It exists for physical control parts
  // that are white in both themes because that is what the part *is* — the
  // switch thumb, and nothing else so far. `textInverse` can't stand in (it
  // follows the fill, so it goes near-black at night) and `textOnPhoto` is
  // about photographs. Reach for a semantic token first; this is a last resort.
  white: '#FFFFFF',

  // Actions. The green at full strength, and the only place it appears at full
  // strength. What sits *on* a primary fill is ink, not white: white on this
  // green is 2.1:1 and ink is 7.8:1 — and the ink is also what keeps the button
  // reading as bright paint rather than as a dark slab. Press moves *lighter*,
  // since there is nothing darker in the ramp to move to.
  primary: '#0FC44A',
  primaryPressed: '#33D66F',
  onPrimary: '#15181A',

  // `accent` is an alias of `primary` and has no colour of its own. It was a
  // second, deeper green for the shuffle action; an accent that is a *different
  // green* from the primary action is the inconsistency, not the feature. The
  // alias is kept so the two existing usages still resolve — the welcome mark's
  // squircle, which is the brand mark on the first screen and is meant to be
  // green, and the shuffle button, which is now a neutral icon button.
  accent: '#0FC44A',
  accentSoft: '#E8FCEF',

  // Favourites only. A filled heart has to read as red or it doesn't read as a
  // heart, so this is the one place a second saturated colour earns its keep —
  // and the one token the green must not reach, since red against green is the
  // strongest separation available and that is the entire point of it.
  favourite: '#EF4444',
  favouriteSoft: '#FEE2E2',

  // Untinted for the same reason as `favourite`: a warning that shares the hue
  // of the surface it warns about isn't a warning.
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',

  // Scrim under text overlaid on photos.
  scrim: 'rgba(0,0,0,0.55)',
  scrimStrong: 'rgba(0,0,0,0.75)',
  // For a photo nothing is written on — the welcome hero, where the darkening
  // exists only to keep the status bar legible and to stop the image glaring
  // against the sheet. `scrim` at 0.55 is built to carry text and reads as a
  // deliberate dimming here rather than as light falling off.
  scrimSoft: 'rgba(0,0,0,0.35)',
  scrimNone: 'rgba(0,0,0,0)',

  // The specular sweep across the welcome screen's primary button.
  //
  // NOTE: this still inverts between themes, but the reason it used to has gone.
  // `primary` was the far end of the neutral scale and swapped ends at night, so
  // a white sheen would have been invisible on the near-white night button. The
  // green is now the constant across themes, so the same button gets a white
  // sweep by day and a dark one by night for no reason the palette can state.
  // Transcribed as specified rather than quietly "fixed" — see the note in the
  // handoff summary; it's a design call, not a transcription error.
  //
  // `sheenNone` exists for the same reason `scrimNone` does: a gradient that
  // fades to a *differently* coloured transparent interpolates through grey and
  // leaves a fringe, so the end stops have to share the middle stop's rgb.
  sheen: 'rgba(255,255,255,0.22)',
  sheenNone: 'rgba(255,255,255,0)',

  // Floating translucent chrome (the tab dock). These have to be alpha
  // colours: the whole point is the content scrolling underneath showing
  // through, so an opaque `surface` can't stand in. `glass` is the floor under
  // the blur — on iOS 26 the real material replaces it, on Android the blur is
  // weak enough that without it the pill loses its edges over a photo.
  // The tint painted *over* the blur (see `Veil` in GlassSurface). Its alpha is
  // the one dial here: it's how much of the pill is guaranteed light versus how
  // much is blurred backdrop. Too low and dark recipe photos drag the pill to
  // grey in light mode; too high and it stops looking like glass at all.
  //
  // 0.55 keeps 45% of the blur visible while holding the pill light over even
  // the darkest photo. It carries `bg`'s tint rather than pure white so the
  // dock belongs to the same palette as everything it floats over.
  glass: 'rgba(252,253,252,0.55)',
  // Translucent *white* in both palettes, not a dark edge in light. It's the
  // specular lip along the top of a real glass element, and it only reads as
  // glass if it's lighter than what it sits on. In light mode that leaves it
  // near-invisible over a light background — which is why the dock carries
  // `shadow.floating`, and why the shadow is doing the separating, not the edge.
  glassBorder: 'rgba(255,255,255,0.55)',
  // The sliding capsule behind the selected tab. Alpha again, and deliberately
  // faint: it sits *on* glass, so an opaque fill would punch a hole in the
  // material it's supposed to be part of. Built from `text`'s rgb rather than
  // pure black, so the capsule darkens toward the palette instead of away.
  glassHighlight: 'rgba(21,24,26,0.07)',
  // An unselected icon sitting on glass. Not `textPlaceholder`, which is far
  // too light here: the pill's colour moves with whatever scrolls under it, and
  // over a dark photo that pairing measures ~1:1 — invisible, not subtle.
  onGlassMuted: '#4B5450',
}

/**
 * Annotating both palettes with this rather than inferring each separately is
 * load-bearing: a key present in one and missing from the other is a compile
 * error, so the two can never drift.
 */
export type ThemeColors = Record<keyof typeof light, string>

export const lightColors: ThemeColors = light

/**
 * Dark swaps the neutral scale for its dark-read twin and **leaves the green
 * alone**. That's the headline difference from every previous version of this
 * file: the green is the constant across themes, not the thing that flips, and
 * a saturated green at this lightness holds up on near-white and near-black
 * alike. `primary` no longer inverts to the light end of the scale — the button
 * is the brand, and the brand doesn't change colour at night.
 *
 * Two tokens deliberately break the mirror:
 *
 * - `surfaceSunken` steps the *opposite* way. In light it sits below `bg` (a
 *   recessed well — photo placeholders and skeleton blocks); in dark it has to
 *   sit above `bg` or every skeleton block disappears into the background.
 *   Semantic tokens invert their relationship, not their position on the scale.
 * - `danger` and `favourite` converge. Light splits them into red-600 and
 *   red-500 because the deeper red reads better as text on a light surface; on
 *   near-black both roles need the same brightness and the distinction stops
 *   paying off.
 */
export const darkColors: ThemeColors = {
  // Surfaces
  bg: '#0C0E0F',
  bgSubtle: '#141719',
  surface: '#141719',
  surfaceAlt: '#1D2123',
  surfaceSunken: '#141719',

  // Lines
  border: '#1D2123',
  borderStrong: '#2E3437',

  // Type
  text: '#F3F7F5',
  textMuted: '#9DA6A2',
  textPlaceholder: '#6E7975',
  textInverse: '#0C0E0F',
  // Unchanged: white text on a photo is white text on a photo.
  textOnPhoto: '#FFFFFF',
  // Unchanged, and that is the whole point of it — see light.
  white: '#FFFFFF',

  // Actions. Identical to light, deliberately — see the note above.
  primary: '#0FC44A',
  primaryPressed: '#33D66F',
  onPrimary: '#0C0E0F',

  // `accent` tracks `primary` here too. `accentSoft` is the one that has to
  // move: a pale green tint is a bright rectangle on a near-black screen, so at
  // night the soft fill is simply a raised neutral surface and the green comes
  // from the glyph sitting on it.
  accent: '#0FC44A',
  accentSoft: '#1D2123',

  favourite: '#F87171',
  favouriteSoft: '#2A1517',

  danger: '#F87171',
  dangerSoft: '#2A1517',

  // Unchanged for the same reason as textOnPhoto — these darken a photograph
  // so overlaid text stays legible, and that job is identical in both themes.
  scrim: 'rgba(0,0,0,0.55)',
  scrimStrong: 'rgba(0,0,0,0.75)',
  scrimSoft: 'rgba(0,0,0,0.35)',
  scrimNone: 'rgba(0,0,0,0)',

  // Still inverted; see the note on light's `sheen` for why that no longer
  // follows from the palette.
  sheen: 'rgba(0,0,0,0.18)',
  sheenNone: 'rgba(0,0,0,0)',

  // Darker and slightly more opaque than light's: a blur over near-black has
  // far less to work with, so the pill needs more of its own body to read as a
  // surface. The border flips to a light edge, which is how a raised glass
  // element catches light at night.
  // Slightly stronger than light's, and for the mirrored reason: a bright photo
  // scrolling under the pill at night drags it light, which is the more jarring
  // direction on a near-black screen.
  glass: 'rgba(20,23,25,0.60)',
  glassBorder: 'rgba(255,255,255,0.12)',
  // Lighter rather than darker: on a near-black pill the selected tab has to be
  // lifted out, and a darker capsule would read as a hole.
  glassHighlight: 'rgba(255,255,255,0.12)',
  // The exact mirror of light's, and it fixes the same bug in the other
  // direction: `textPlaceholder` on a dark pill sitting over a *bright* photo
  // measures ~1.3:1. Same invisibility, just harder to stumble into.
  onGlassMuted: '#9DA6A2',
}
