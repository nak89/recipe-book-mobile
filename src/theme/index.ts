import { Platform, StyleSheet } from 'react-native'

// `@/theme` stays the single import path for everything design-system, so no
// screen ever needs to know that the palettes and the hooks live in separate
// modules. They're split only to keep the dependency running one way:
// palettes -> ThemeContext -> index, never back.
export { darkColors, lightColors } from './palettes'
export type { ThemeColors } from './palettes'
export { ThemeProvider, useTheme, useThemedStyles } from './ThemeContext'
export type { ThemePreference } from './ThemeContext'

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
 *
 * Not theme-aware, and it doesn't need to be: a near-black shadow at 6% opacity
 * is invisible on a near-black background, and all four places this is used are
 * already legible in dark by other means — a photograph, a near-white circle,
 * and two sheets floating over a scrim. Elevation at night comes from surface
 * lightness instead.
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
