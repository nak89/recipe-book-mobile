import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider, useTheme } from '@/theme'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootStack />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
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
