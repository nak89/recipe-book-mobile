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

  // Spinner rather than the login form while the persisted session *or* the
  // intro flag loads. Both are async reads out of AsyncStorage, and acting on
  // either before it resolves is a visible redirect flash on cold start — the
  // session one would flash login at a signed-in user, the intro one would
  // flash the carousel at someone who has already seen it.
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

  // First run on this device, and the carousel isn't the screen we're already
  // on. The pathname check is what stops this redirecting /intro to itself.
  if (!seen && pathname !== '/intro') {
    return <Redirect href="/intro" />
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
  )
}
