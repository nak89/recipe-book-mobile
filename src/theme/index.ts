import { Platform, StyleSheet } from 'react-native'

/**
 * The app is locked to light (`userInterfaceStyle: "light"` in app.json), but
 * every colour is still named semantically rather than by hue. Adding dark mode
 * later means swapping this one object behind a `useColorScheme()` hook — no
 * screen needs to change.
 *
 * The palette is deliberately almost colourless: warm near-black chrome on warm
 * white, with amber reserved for the shuffle action and red for the favourite
 * heart. Recipe photography supplies all the other colour, which is what stops
 * the app reading as generic.
 */
export const colors = {
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
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const

export const type = {
  display: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  section: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' },
  bodyStrong: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 12, fontWeight: '500' },
} as const

/**
 * iOS and Android express elevation differently; keeping both in one token
 * avoids every component re-deriving the platform branch.
 */
export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#1C1917',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: { boxShadow: '0 4px 12px rgba(28,25,23,0.06)' },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#1C1917',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 8 },
    default: { boxShadow: '0 6px 16px rgba(28,25,23,0.18)' },
  }),
} as const

export const hairline = StyleSheet.hairlineWidth
