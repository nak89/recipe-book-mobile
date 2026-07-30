import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { colors } from '@/theme'

export default function AppLayout() {
  const { session, loading } = useAuth()

  // Without this guard you get a redirect flash to /login on cold start,
  // before the persisted session has been read back out of AsyncStorage.
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {/* The tab group draws its own chrome. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Add is a modal, not a tab — it's an action, not a destination. */}
      <Stack.Screen
        name="recipe/new"
        options={{ title: 'New Recipe', presentation: 'modal' }}
      />
      <Stack.Screen name="recipe/[id]/index" options={{ headerShown: false }} />
      {/* headerBackTitle is explicit because iOS labels the back button with the previous
          screen's title, and the detail screen draws its own header (headerShown: false,
          no title) — leaving it to fall back to the raw route name, "recipe/[id]/index". */}
      <Stack.Screen
        name="recipe/[id]/edit"
        options={{ title: 'Edit Recipe', headerBackTitle: 'Recipe' }}
      />
    </Stack>
  )
}
