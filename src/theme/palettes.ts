/**
 * Two palettes, one shape.
 *
 * Every colour is named by role rather than hue, which is what makes a second
 * palette possible at all: no screen asks for "warm white", it asks for `bg`.
 * It's also what made the switch from the original warm-stone scale to this
 * green one a change to two files rather than to thirty.
 *
 * The palette is a **near-neutral green**: surfaces, lines and type are all cut
 * from one low-chroma green scale, so the app reads green everywhere without
 * any single element being green. Saturated colour is still rationed to two
 * roles — `accent` for the shuffle action, `favourite` for the heart — and
 * recipe photography supplies the rest. That rationing is the reason the tint
 * can be applied this widely without the app looking like a brand exercise.
 *
 * **There is no flat `colors` export.** Reading a palette directly would bake
 * one theme into a module-scope `StyleSheet.create`, which is exactly the bug
 * that made dark mode impossible before. Use `useThemedStyles` instead.
 */
const light = {
  // Surfaces. `bg` and `surface` are the same value, as they were when both
  // were pure white — a card is defined by its border and shadow here, not by
  // sitting on a different colour, and splitting them now would quietly change
  // that relationship on every screen.
  bg: '#FCFDFC',
  bgSubtle: '#F4F8F5',
  surface: '#FCFDFC',
  surfaceAlt: '#EDF3EF',
  surfaceSunken: '#E3EBE6',

  // Lines
  border: '#DCE7E0',
  borderStrong: '#BFD1C6',

  // Type. Not pure black-with-a-tint: the darkest token is a deep green whose
  // hue matches the surfaces, which is what stops the type reading as a
  // separate, colder palette laid over a green one.
  text: '#10201A',
  textMuted: '#5F7268',
  // Placeholders must read as absent, never as a prefilled value. ~2.5:1 on
  // `bg` — deliberately below the readability floor that `textMuted` clears.
  textPlaceholder: '#93A69D',
  textInverse: '#FFFFFF',
  textOnPhoto: '#FFFFFF',

  // Actions. `primary` is the far end of the same scale, exactly as it was when
  // that end was near-black — deep enough to read as chrome rather than as a
  // green button, at 14:1 against `onPrimary`.
  primary: '#14311F',
  primaryPressed: '#0A1D12',
  onPrimary: '#FFFFFF',

  // Reserved for the shuffle action — the only saturated green in the app, and
  // several steps up in chroma from the surfaces so the one button that is
  // *meant* to be green doesn't dissolve into a green screen. It replaced an
  // amber, and reads better than it did: 2.7:1 on `accentSoft` against 1.9:1.
  accent: '#16A34A',
  accentSoft: '#DCFCE7',

  // Favourites only. A filled heart has to read as red or it doesn't read as a
  // heart, so this is the one place a second accent earns its keep — and the
  // one token the green scale must not reach, since red against green is the
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

  // The specular sweep across the welcome screen's primary button. It has to
  // mirror rather than repeat: `primary` is deep green in light and near-white
  // in dark, so a white sheen would be invisible at night — a passing highlight
  // is a lightening of the surface in one theme and a darkening in the other.
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
  glassHighlight: 'rgba(16,32,26,0.07)',
  // An unselected icon sitting on glass. Not `textPlaceholder`, which is far
  // too light here: the pill's colour moves with whatever scrolls under it, and
  // over a dark photo that pairing measures ~1:1 — invisible, not subtle.
  // Held darker than the warm grey it replaced, and by more than the hue change
  // alone needs: `glass` now carries `bg`'s tint instead of being pure white, so
  // the pill itself sits a shade darker and the icon has to make that back.
  // Measured at 3.2:1 against the darkest the pill gets, against the old 3.0.
  onGlassMuted: '#304035',
}

/**
 * Annotating both palettes with this rather than inferring each separately is
 * load-bearing: a key present in one and missing from the other is a compile
 * error, so the two can never drift.
 */
export type ThemeColors = Record<keyof typeof light, string>

export const lightColors: ThemeColors = light

/**
 * The same low-chroma green scale the light palette is built from, read
 * downward — which is what keeps the green cast at night instead of dropping to
 * a neutral grey that would look like a different app's dark theme. The green
 * has to be carried further here than a warm tint did: a cool hue at very low
 * lightness is easy to mistake for plain black, so the dark surfaces sit at
 * slightly higher chroma than their light counterparts.
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
 *
 * `primary` inverting to near-white is the honest mirror of light, where
 * `primary` and `text` are also the same value — the button fill is simply
 * "the far end of the neutral scale".
 */
export const darkColors: ThemeColors = {
  // Surfaces
  bg: '#070D0A',
  bgSubtle: '#101B15',
  surface: '#101B15',
  surfaceAlt: '#182720',
  surfaceSunken: '#101B15',

  // Lines
  border: '#182720',
  borderStrong: '#2E463A',

  // Type
  text: '#F2F8F4',
  textMuted: '#9BAFA4',
  textPlaceholder: '#6B8177',
  textInverse: '#070D0A',
  // Unchanged: white text on a photo is white text on a photo.
  textOnPhoto: '#FFFFFF',

  // Actions
  primary: '#F2F8F4',
  primaryPressed: '#FFFFFF',
  onPrimary: '#070D0A',

  // Brighter and less saturated than light's, the same way the old amber
  // stepped up at night: a mid-chroma green that carries on a light background
  // goes muddy on near-black.
  accent: '#4ADE80',
  accentSoft: '#052E16',

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

  // Inverted, unlike the scrims: this one sits on `primary`, which flips ends
  // of the scale between themes, not on a photograph, which doesn't.
  sheen: 'rgba(0,0,0,0.18)',
  sheenNone: 'rgba(0,0,0,0)',

  // Darker and slightly more opaque than light's: a blur over near-black has
  // far less to work with, so the pill needs more of its own body to read as a
  // surface. The border flips to a light edge, which is how a raised glass
  // element catches light at night.
  // Slightly stronger than light's, and for the mirrored reason: a bright photo
  // scrolling under the pill at night drags it light, which is the more jarring
  // direction on a near-black screen.
  glass: 'rgba(16,27,21,0.60)',
  glassBorder: 'rgba(255,255,255,0.12)',
  // Lighter rather than darker: on a near-black pill the selected tab has to be
  // lifted out, and a darker capsule would read as a hole.
  glassHighlight: 'rgba(255,255,255,0.12)',
  // The exact mirror of light's, and it fixes the same bug in the other
  // direction: `textPlaceholder` on a dark pill sitting over a *bright* photo
  // measures ~1.3:1. Same invisibility, just harder to stumble into.
  onGlassMuted: '#C9D8CF',
}
