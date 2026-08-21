import { Redirect, Stack, usePathname } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useSeenIntro } from '@/lib/onboarding'
import { useTheme } from '@/theme'

export default function AuthLayout() {
  const { colors: c } = useTheme()
  const { session, loading } = useAuth()
  const { seen } = useSeenIntro()
  const pathname = usePathname()

  // Spinner rather than the sign-in form while the persisted session *or* the
  // intro flag loads. Both are async reads out of AsyncStorage, and acting on
  // either before it resolves is a visible redirect flash on cold start — the
  // session one would flash sign-in at a signed-in user, the intro one would
  // flash the language picker at someone who has already chosen.
  if (loading || seen === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} />
      </View>
    )
  }

  if (session) {
    return <Redirect href="/" />
  }

  // First run on this device. **Both** pre-auth screens are exempt, not just
  // the first: the flag isn't written until `/about` is left, so without
  // `/about` in this list, choosing a language would redirect straight back to
  // the picker. That is a two-screen trap with no way into the app, and it is
  // the other half of the reason `markIntroSeen` publishes before it persists.
  if (!seen && pathname !== '/language' && pathname !== '/about') {
    return <Redirect href="/language" />
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
  )
}
