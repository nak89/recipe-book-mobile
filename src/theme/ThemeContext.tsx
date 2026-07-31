import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { darkColors, lightColors } from './palettes'
import type { ThemeColors } from './palettes'

/**
 * `'system'` is a real, persistent state rather than "no preference yet": it
 * keeps tracking the phone — including a scheduled switch at sunset — until the
 * user touches the toggle, at which point their explicit choice wins for good.
 */
export type ThemePreference = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme-preference'

interface ThemeValue {
  colors: ThemeColors
  isDark: boolean
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeValue | null>(null)

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system')

  // `useColorScheme` is synchronous, so the very first frame is already correct
  // for anyone on 'system' — which is everyone until they touch the switch.
  // AsyncStorage is not, so reading it first would mean either a white flash or
  // a gate on every launch. Instead the stored value only ever *corrects* the
  // first render, and only for someone who overrode against their own phone.
  const systemScheme = useColorScheme()

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && isPreference(stored)) setPreferenceState(stored)
      })
      .catch(() => {
        // A theme we couldn't read back is not worth surfacing — 'system' is a
        // sane answer and the user can set it again.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    // Set state first so the switch moves under the finger; persistence is
    // allowed to lose the race, exactly like the optimistic favourite toggle.
    setPreferenceState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }, [])

  const value = useMemo<ThemeValue>(() => {
    const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark'
    return {
      colors: isDark ? darkColors : lightColors,
      isDark,
      preference,
      setPreference,
    }
  }, [preference, systemScheme, setPreference])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside a ThemeProvider')
  return value
}

/**
 * The replacement for a module-scope `StyleSheet.create`.
 *
 * Pass a factory declared at module scope — it's a stable reference, so the
 * memo only recomputes when the palette actually changes, and the stylesheet is
 * built once per theme rather than once per render.
 *
 *     const styles = useThemedStyles(makeStyles)
 *     ...
 *     const makeStyles = (c: ThemeColors) => StyleSheet.create({ ... })
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const { colors } = useTheme()
  return useMemo(() => factory(colors), [factory, colors])
}
