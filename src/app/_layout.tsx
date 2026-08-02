import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
  useFonts,
} from '@expo-google-fonts/instrument-serif'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/i18n'
import { ThemeProvider, useTheme } from '@/theme'

export default function RootLayout() {
  // Instrument Serif is used by exactly one screen — the intro carousel — but a
  // font can only be registered at the root, so it loads here.
  //
  // Nothing is gated on the result. The handoff asks to hold the splash until
  // the face is ready, but that trades a wrong-font headline on one screen for
  // a blank app on every screen, including for returning users who will never
  // see the carousel again. The headline falls back to the system serif for the
  // frame or two it takes.
  useFonts({ InstrumentSerif_400Regular, InstrumentSerif_400Regular_Italic })

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
  const { colors: c, isDark } = useTheme()
  return (
    <>
      {/* Inverted, not fixed: on a dark background the bar's content has to be
          light or the clock and battery icons vanish into the header. */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </>
  )
}
