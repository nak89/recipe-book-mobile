import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono'
import { KantumruyPro_400Regular, KantumruyPro_500Medium } from '@expo-google-fonts/kantumruy-pro'
import { Moul_400Regular } from '@expo-google-fonts/moul'
import { Newsreader_400Regular, Newsreader_500Medium } from '@expo-google-fonts/newsreader'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/i18n'
import { ThemeProvider, useTheme } from '@/theme'

// Module scope, so the splash is pinned before the first render rather than one
// effect too late. It rejects if the splash has already gone (a fast reload),
// which is not a condition worth surfacing.
void SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  // Chronicle sets the whole product in four bundled faces, so unlike the old
  // arrangement — one serif on one onboarding screen, deliberately ungated —
  // every screen now depends on these being ready.
  //
  // That is why the splash holds. Ungated, the app would draw once in the OS
  // fallbacks and again in the real faces, and the reflow would be the whole
  // page rather than one headline. It is worse in Khmer than the shuffle
  // suggests: the Khmer scale pins line-heights measured against Kantumruy's
  // ascent, and for those frames they would be applied to whatever Khmer face
  // the OS supplies — a shorter ascent clips the line box **from the top**,
  // which is where a Khmer cluster carries its vowel signs. Khmer would appear
  // decapitated on every cold start and then repair itself.
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_400Regular,
    Newsreader_500Medium,
    KantumruyPro_400Regular,
    KantumruyPro_500Medium,
    Moul_400Regular,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  })

  // `fontError` is part of the condition, not just logged. Gating on
  // `fontsLoaded` alone means a single unreadable font file holds the splash
  // forever and the app never starts — a worse failure than the wrong typeface.
  // Falling through renders in the OS fallbacks, which is survivable.
  const ready = fontsLoaded || fontError != null

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {})
  }, [ready])

  // Null rather than a spinner: the splash is still up, and drawing a second
  // loading state behind it would show through the moment it hides.
  if (!ready) return null

  return (
    // Required by react-native-gesture-handler, and required *at the root*.
    // Gestures below it work on iOS without one but silently never fire on
    // Android — the tab dock's drag is the app's first gesture-handler use, so
    // nothing needed this until now.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          {/* Outside AuthProvider on purpose: the language has to be readable on
              the pre-auth screens, which is where a Khmer speaker needs it most.
              Nothing is gated on its AsyncStorage read — see LanguageContext. */}
          <LanguageProvider>
            <AuthProvider>
              <RootStack />
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

/**
 * Split out because a component can't read a context it mounts itself —
 * `useTheme()` in RootLayout would run above its own provider.
 */
function RootStack() {
  const { colors: c } = useTheme()
  return (
    <>
      {/* Fixed now, where it used to invert with the theme: the ground is cream
          in every state the app has, so the clock and battery are always dark
          content on a light bar. Cook mode is the one screen that will need to
          override this locally rather than derive it. */}
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </>
  )
}
