/**
 * Two palettes, one shape.
 *
 * Every colour is named by role rather than hue, which is what makes a second
 * palette possible at all: no screen asks for "warm white", it asks for `bg`.
 *
 * The palette is deliberately almost colourless — warm near-black chrome on
 * warm white, inverted at night — with amber reserved for the shuffle action
 * and red for the favourite heart. Recipe photography supplies all the other
 * colour, which is what stops the app reading as generic.
 *
 * **There is no flat `colors` export.** Reading a palette directly would bake
 * one theme into a module-scope `StyleSheet.create`, which is exactly the bug
 * that made dark mode impossible before. Use `useThemedStyles` instead.
 */
const light = {
  // Surfaces
  bg: '#FFFFFF',
  bgSubtle: '#FAFAF9',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F5F4',
  surfaceSunken: '#EFEDEB',

  // Lines
  border: '#E7E5E4',
  borderStrong: '#D6D3D1',

  // Type
  text: '#1C1917',
  textMuted: '#78716C',
  // Placeholders must read as absent, never as a prefilled value.
  textPlaceholder: '#A8A29E',
  textInverse: '#FFFFFF',
  textOnPhoto: '#FFFFFF',

  // Actions
  primary: '#1C1917',
  primaryPressed: '#000000',
  onPrimary: '#FFFFFF',

  // Reserved for the shuffle action — the only amber in the app.
  accent: '#F59E0B',
  accentSoft: '#FEF3C7',

  // Favourites only. A filled heart has to read as red or it doesn't read as a
  // heart, so this is the one place a second accent earns its keep.
  favourite: '#EF4444',
  favouriteSoft: '#FEE2E2',

  danger: '#DC2626',
  dangerSoft: '#FEF2F2',

  // Scrim under text overlaid on photos.
  scrim: 'rgba(0,0,0,0.55)',
  scrimStrong: 'rgba(0,0,0,0.75)',
  scrimNone: 'rgba(0,0,0,0)',
}

/**
 * Annotating both palettes with this rather than inferring each separately is
 * load-bearing: a key present in one and missing from the other is a compile
 * error, so the two can never drift.
 */
export type ThemeColors = Record<keyof typeof light, string>

export const lightColors: ThemeColors = light

/**
 * The same Tailwind `stone` scale the light palette is built from, read
 * downward — which is what keeps the warm cast at night instead of dropping to
 * a neutral grey that would look like a different app's dark theme.
 *
 * Two tokens deliberately break the mirror:
 *
 * - `surfaceSunken` steps the *opposite* way. In light it sits below `bg` (a
 *   recessed well — photo placeholders and skeleton blocks); in dark it has to
 *   sit above `bg` or every skeleton block disappears into the background.
 *   Semantic tokens invert their relationship, not their position on the scale.
 * - `danger` and `favourite` converge. Light splits them into red-600 and
 *   red-500 because the deeper red reads better as text on white; on near-black
 *   both roles need the same brightness and the distinction stops paying off.
 *
 * `primary` inverting to near-white is the honest mirror of light, where
 * `primary` and `text` are also the same value — the button fill is simply
 * "the far end of the neutral scale".
 */
export const darkColors: ThemeColors = {
  // Surfaces
  bg: '#0C0A09',
  bgSubtle: '#1C1917',
  surface: '#1C1917',
  surfaceAlt: '#292524',
  surfaceSunken: '#1C1917',

  // Lines
  border: '#292524',
  borderStrong: '#44403C',

  // Type
  text: '#FAFAF9',
  textMuted: '#A8A29E',
  textPlaceholder: '#78716C',
  textInverse: '#0C0A09',
  // Unchanged: white text on a photo is white text on a photo.
  textOnPhoto: '#FFFFFF',

  // Actions
  primary: '#FAFAF9',
  primaryPressed: '#FFFFFF',
  onPrimary: '#0C0A09',

  accent: '#FBBF24',
  accentSoft: '#2E2005',

  favourite: '#F87171',
  favouriteSoft: '#2A1517',

  danger: '#F87171',
  dangerSoft: '#2A1517',

  // Unchanged for the same reason as textOnPhoto — these darken a photograph
  // so overlaid text stays legible, and that job is identical in both themes.
  scrim: 'rgba(0,0,0,0.55)',
  scrimStrong: 'rgba(0,0,0,0.75)',
  scrimNone: 'rgba(0,0,0,0)',
}
