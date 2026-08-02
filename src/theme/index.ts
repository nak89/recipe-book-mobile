import { useMemo } from 'react'
import { Platform, StyleSheet } from 'react-native'
import { useLanguage } from '@/i18n'
import { useTheme } from './ThemeContext'
import { TYPE_SCALES } from './typography'
import type { ThemeColors } from './palettes'
import type { TypeScale } from './typography'

// `@/theme` stays the single import path for everything design-system, so no
// screen ever needs to know that the palettes, the type scales and the hooks
// live in separate modules. They're split only to keep the dependency running
// one way: palettes + typography -> ThemeContext -> index, never back.
export { darkColors, lightColors } from './palettes'
export type { ThemeColors } from './palettes'
export { ThemeProvider, useTheme } from './ThemeContext'
export type { ThemePreference } from './ThemeContext'
export { fonts, sized, type, typeKm } from './typography'
export type { TypeScale } from './typography'

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

/**
 * The replacement for a module-scope `StyleSheet.create`.
 *
 * Pass a factory declared at module scope — it's a stable reference, so the
 * memo only recomputes when the palette or the language actually changes, and
 * the stylesheet is built once per combination rather than once per render.
 *
 *     const styles = useThemedStyles(makeStyles)
 *     ...
 *     const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({ ... })
 *
 * The second argument is why the module-level `type` export is *not* what a
 * screen should spread. The Khmer scale's whole content is the *absence* of a
 * pinned `lineHeight` (see `typography.ts`), and a factory that reached past its
 * parameter for the static scale would set Khmer in a Latin line box and clip
 * its own headline the moment the language toggle moved — the same class of bug
 * as reading a palette at module scope, which is what `useThemedStyles` exists
 * to prevent in the first place.
 *
 * It lives here rather than in `ThemeContext` because it now reads two
 * contexts, and `ThemeContext` importing `@/i18n` would point the dependency
 * back the way it isn't allowed to run.
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors, type: TypeScale) => T): T {
  const { colors } = useTheme()
  const scale = useTypeScale()
  return useMemo(() => factory(colors, scale), [factory, colors, scale])
}

/**
 * The scale on its own, for the handful of places that style text *outside* a
 * `StyleSheet` — chiefly react-navigation's `headerTitleStyle`, which is an
 * option object rather than a stylesheet entry and so never reaches a
 * `makeStyles` factory.
 */
export function useTypeScale(): TypeScale {
  const { language } = useLanguage()
  return TYPE_SCALES[language]
}

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
      shadowColor: '#10201A',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    default: { boxShadow: '0 4px 12px rgba(16,32,26,0.06)' },
  }),
  raised: Platform.select({
    ios: {
      shadowColor: '#10201A',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 8 },
    default: { boxShadow: '0 6px 16px rgba(16,32,26,0.18)' },
  }),
  /**
   * Deeper and much softer than `raised` — for the floating dock, which has no
   * edge of its own to sit against and has to look detached from the content
   * scrolling beneath it. A large radius at low opacity is what reads as
   * "hovering" rather than "outlined".
   */
  floating: Platform.select({
    ios: {
      shadowColor: '#10201A',
      shadowOpacity: 0.22,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 12 },
    default: { boxShadow: '0 10px 24px rgba(16,32,26,0.22)' },
  }),
} as const

export const hairline = StyleSheet.hairlineWidth
