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
  //
  // The display name used to be its own step and now lives on the sign-up form,
  // so what is left of the flow is the one screen this points at.
  if (!onboarded) {
    return <Redirect href="/taste" />
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
          back from, where the dock's three entries are the places you swipe
          between. Reached from the initials avatar in either header.

          `headerBackTitle` for the same reason the edit screen below sets one:
          iOS labels the back button with the *previous screen's* title, and the
          screen behind this one is the tab group, which draws its own chrome
          and so has no title to lend — leaving the button showing the raw route
          name, "(tabs)". It can't name the tab you came from either, since all
          three of them push this same screen, so "Back" is the honest label. */}
      <Stack.Screen
        name="profile"
        options={{ title: t('nav.profile'), headerBackTitle: t('nav.back') }}
      />
      <Stack.Screen name="recipe/[id]/index" options={{ headerShown: false }} />
      {/* Cook mode draws its own chrome and inverts the page to ink, so a paper
          navigation bar over it would be the brightest thing on a screen built
          to be read across a kitchen. `fullScreenModal` rather than a push: it
          is a mode you are *in*, and it keeps iOS's edge-swipe from popping you
          out mid-step — the way out is the ✕, which is where § 8 puts it. */}
      <Stack.Screen
        name="recipe/[id]/cook"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      {/* A library recipe, pushed from Explore. It draws its own header for the
          same reason the recipe page does — the photograph runs under the status
          bar, and a navigation bar over it would cut the hero in half. */}
      <Stack.Screen name="library/[id]" options={{ headerShown: false }} />
      {/* headerBackTitle is explicit because iOS labels the back button with the previous
          screen's title, and the detail screen draws its own header (headerShown: false,
          no title) — leaving it to fall back to the raw route name, "recipe/[id]/index". */}
      <Stack.Screen
        name="recipe/[id]/edit"
        // No `headerBackTitle` any more: SCREENS.md § 14 draws a bare `‹` on
        // all four pages of the wizard, and `RecipeForm` sets
        // `headerBackButtonDisplayMode: 'minimal'` for both of its screens. A
        // label here would be overridden on mount and read as a live setting.
        options={{ title: t('nav.editRecipe') }}
      />
    </Stack>
  )
}
