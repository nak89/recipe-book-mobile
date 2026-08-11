import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import { useTheme, useTypeScale } from '@/theme'

export default function AppLayout() {
  const { colors: c } = useTheme()
  const t = useT()
  // `headerTitleStyle` is a navigation option, not a stylesheet entry, so it
  // never passes through a `makeStyles` factory and has to read the scale
  // directly. What it takes from the Khmer scale is the *absence* of a pinned
  // lineHeight — the header's title box is tight, and a fixed line box is what
  // clips a Khmer cluster's stacked marks.
  const type = useTypeScale()
  const { session, loading, onboarded } = useAuth()

  // Without this guard you get a redirect flash to /login on cold start,
  // before the persisted session has been read back out of AsyncStorage.
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.primary} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  // Signed in but never set up — including anyone who force-quit partway
  // through, since the flag is only written when the flow ends. Accounts that
  // predate onboarding pass through here once as well, which is intended.
  if (!onboarded) {
    return <Redirect href="/name" />
  }

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: type.section,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      {/* The tab group draws its own chrome. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Add is a modal, not a tab — it's an action, not a destination.

          These titles are translated here rather than on the screens themselves
          because the Stack owns them, and this component re-renders when the
          language changes, so the options follow it. */}
      <Stack.Screen
        name="recipe/new"
        options={{ title: t('nav.newRecipe'), presentation: 'modal' }}
      />
      {/* Profile is a pushed screen rather than a tab: somewhere you go and come
          back from, where the dock's two entries are the places you swipe
          between. Reached from the initials avatar in either header. */}
      <Stack.Screen name="profile" options={{ title: t('nav.profile') }} />
      <Stack.Screen name="recipe/[id]/index" options={{ headerShown: false }} />
      {/* headerBackTitle is explicit because iOS labels the back button with the previous
          screen's title, and the detail screen draws its own header (headerShown: false,
          no title) — leaving it to fall back to the raw route name, "recipe/[id]/index". */}
      <Stack.Screen
        name="recipe/[id]/edit"
        options={{ title: t('nav.editRecipe'), headerBackTitle: t('nav.recipe') }}
      />
    </Stack>
  )
}
