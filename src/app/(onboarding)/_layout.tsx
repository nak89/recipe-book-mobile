import { Redirect, Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/theme'

/**
 * The post-signup flow, now a single screen: the starter packs.
 *
 * This is the middle of three route groups, and each one means exactly one
 * thing — `(auth)` is "no session", this is "session but not set up", `(app)`
 * is "set up". Keeping the three guards disjoint is what stops them bouncing
 * off each other: every state matches precisely one group, so there is no
 * arrangement that redirects in a circle.
 *
 * These are real routes rather than one screen with an internal pager (the
 * shape `RecipeForm` uses) because each step commits on its own — the name goes
 * to Supabase, the packs go to the API — so there's no single submit for a
 * route boundary to endanger.
 */
export default function OnboardingLayout() {
  const { colors: c } = useTheme()
  const { session, loading, onboarded } = useAuth()

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

  // Nothing in this group outlives onboarding any more. The tutorial used to —
  // the profile screen linked back to it — and it took a `pathname` exception
  // in this guard to allow that. Both are gone: Chronicle teaches through the
  // "what it does" screen before sign-up rather than through a replayable tour.
  if (onboarded) {
    return <Redirect href="/" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
        // The flow is forward-only. iOS's edge swipe would otherwise pop you
        // back off the pack picker into the sign-up form you have already
        // submitted, which reads as undo but isn't.
        gestureEnabled: false,
      }}
    />
  )
}
