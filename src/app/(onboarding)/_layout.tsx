import { Redirect, Stack, usePathname } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/theme'

/**
 * The post-signup flow: name, starter packs, tutorial.
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
  const pathname = usePathname()

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

  // The tutorial is the one screen here that outlives onboarding: the profile
  // tab links to it so you can read it again without resetting your account.
  // Everything else is once-only and belongs behind the flag.
  const isRevisitableTutorial = onboarded && pathname === '/tutorial'

  if (onboarded && !isRevisitableTutorial) {
    return <Redirect href="/" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
        // The flow is forward-only. iOS's edge swipe would otherwise pop you
        // back to a step you have already committed — off the pack picker to
        // the name you just saved — which reads as undo but isn't. Re-reading
        // the tutorial later isn't a flow, so there the swipe-back is welcome.
        gestureEnabled: isRevisitableTutorial,
      }}
    />
  )
}
