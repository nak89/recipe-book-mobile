import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { en, km } from './strings'
import type { StringKey, Strings } from './strings'

/**
 * The UI language. English is the default and the fallback.
 *
 * This switches **chrome only**. Recipe titles, descriptions, ingredients and
 * steps are whatever the user typed and are never touched — flipping this must
 * not alter a byte of a saved recipe, nor change how one already renders. The
 * pantry and cuisine pickers are the one place that rule needs care, since they
 * are chrome that *writes into* content; see `data/ingredients.ts`.
 */
export type Language = 'en' | 'km'

const STORAGE_KEY = 'language-preference'

const DICTIONARIES: Record<Language, Strings> = { en, km }

interface LanguageValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: StringKey) => string
}

const LanguageContext = createContext<LanguageValue | null>(null)

function isLanguage(value: string | null): value is Language {
  return value === 'en' || value === 'km'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  // Unlike the theme, there is **no synchronous source** for this. `useColorScheme()`
  // lets ThemeProvider get the very first frame right; AsyncStorage cannot, so a
  // Khmer user gets an English frame or two on cold start while this resolves.
  //
  // That's accepted rather than gated. The root layout already refuses to hold
  // launch on the font load for the same reason — a blank app for everyone is a
  // worse trade than a brief wrong render for the minority who overrode the
  // default. Gating here would make every English user, who are the majority and
  // gain nothing, wait on a disk read.
  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!cancelled && isLanguage(stored)) setLanguageState(stored)
      })
      .catch(() => {
        // A preference we couldn't read back isn't worth surfacing — English is
        // the documented default and the switch is two taps away.
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setLanguage = useCallback((next: Language) => {
    // State first so the UI turns over under the finger; persistence is allowed
    // to lose the race, exactly like the theme preference and the favourite toggle.
    setLanguageState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {})
  }, [])

  const value = useMemo<LanguageValue>(() => {
    const dictionary = DICTIONARIES[language]
    return {
      language,
      setLanguage,
      t: (key: StringKey) => dictionary[key],
    }
  }, [language, setLanguage])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

function useLanguageValue(): LanguageValue {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside a LanguageProvider')
  return value
}

/** The current language and the setter — for the two language controls. */
export function useLanguage() {
  const { language, setLanguage } = useLanguageValue()
  return { language, setLanguage }
}

/**
 * The translator.
 *
 *     const t = useT()
 *     <Text>{t('profile.recipes')}</Text>
 *
 * `StringKey` is derived from the English dictionary, so a typo'd key is a
 * compile error rather than a blank label — and `km` is annotated `Strings`, so
 * a key added to `en` and forgotten in `km` fails the build too.
 */
export function useT() {
  return useLanguageValue().t
}
