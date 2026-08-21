import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { paperColors } from './palettes'
import type { ThemeColors } from './palettes'

/**
 * One palette, and no way to choose another.
 *
 * This used to be a three-state preference — `'system' | 'light' | 'dark'` —
 * persisted in AsyncStorage and resolved against `useColorScheme()`. Chronicle
 * removes it, and not as a simplification: the direction *is* a printed page,
 * cream stock with one ink, and the design system names exactly two background
 * colours (`paper` and `oat`), both of them paper. There is no night palette to
 * switch to, and paper does not invert.
 *
 * The alternative — keeping the machinery and pointing both palettes at
 * Chronicle — was considered and rejected. It would have left `isDark`
 * permanently false and thirty-odd conditional branches that can never be
 * taken: dead code that reads as live. Deleting the flag instead makes the
 * compiler name every site that assumed a second palette existed.
 *
 * What deliberately survives is the *shape*: colours arrive through a context
 * and reach a screen as an argument to its `makeStyles` factory, never as a
 * module-scope import. That indirection is not about theming — `StyleSheet.create`
 * runs once at import, so a palette read there is baked in forever — and it is
 * held in place anyway by the type scale, which is language-dependent and must
 * stay dynamic. Restoring a flat `colors` export would break Khmer, not just a
 * future dark mode.
 *
 * If a night palette is ever designed, it returns here as a real second
 * `ThemeColors` and a preference above it. Nothing about this file makes that
 * harder than it was.
 */
interface ThemeValue {
  colors: ThemeColors
}

const ThemeContext = createContext<ThemeValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Constant, but still memoised and still a context rather than a bare export:
  // consumers destructure `{ colors }` and pass it to a style factory, and that
  // contract is what has to hold if a second palette ever arrives.
  const value = useMemo<ThemeValue>(() => ({ colors: paperColors }), [])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside a ThemeProvider')
  return value
}

// `useThemedStyles` used to live here. It moved to `./index` when the type
// scale became language-dependent: it reads `@/i18n` now, and importing that
// from this module would point the dependency back the way it isn't allowed to
// run (palettes + typography -> ThemeContext -> index).
