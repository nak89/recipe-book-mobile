import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '@/context/AuthContext'
import { colors } from '@/theme'

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        {/* The app is locked to light, so the status bar is always dark-on-light. */}
        <StatusBar style="dark" />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
        />
      </AuthProvider>
    </SafeAreaProvider>
  )
}
