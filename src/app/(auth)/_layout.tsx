import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/theme'

export default function AuthLayout() {
  const { colors: c } = useTheme()
  const { session, loading } = useAuth()

  // Spinner rather than the login form while the persisted session loads —
  // otherwise a signed-in user sees login flash past on cold start.
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} />
      </View>
    )
  }

  if (session) {
    return <Redirect href="/" />
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
  )
}
