import { Redirect, Stack } from 'expo-router'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import BlankLoadingState from '@/components/ui/BlankLoadingState'
import NavigationButton from '@/components/ui/NavigationButton'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import { sizes, spacing, useScreenTopPad, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

export default function AppLayout() {
  const { colors: c } = useTheme()
  const t = useT()
  const { session, loading, onboarded } = useAuth()

  // Without this guard you get a redirect flash to /login on cold start,
  // before the persisted session has been read back out of AsyncStorage.
  if (loading) {
    return <BlankLoadingState />
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
        header: ({ navigation, options, back }) => (
          <ScreenHeader
            title={options.title ?? ''}
            onBack={back ? navigation.goBack : undefined}
            actions={options.headerRight?.({ canGoBack: !!back, tintColor: c.text })}
          />
        ),
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      {/* The tab group draws its own chrome. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="generate-week" options={{ headerShown: false, gestureEnabled: false }} />
      {/* Add is a modal, not a tab — it's an action, not a destination.

          These titles are translated here rather than on the screens themselves
          because the Stack owns them, and this component re-renders when the
          language changes, so the options follow it. */}
      <Stack.Screen
        name="recipe/new"
        options={{ title: t('nav.newRecipe'), presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen name="profile" options={{ title: t('nav.profile') }} />
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
      <Stack.Screen name="library/[id]/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="library/[id]/cook"
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
      <Stack.Screen name="recipe/[id]/edit" options={{ title: t('nav.editRecipe') }} />
    </Stack>
  )
}

function ScreenHeader({ title, onBack, actions }: { title: string; onBack?: () => void; actions?: ReactNode }) {
  const topPad = useScreenTopPad()
  const styles = useThemedStyles(makeStyles)

  return (
    <View style={[styles.header, { paddingTop: topPad }]}>
      <View style={styles.headerSide}>
        {onBack && <NavigationButton action="back" onPress={onBack} />}
      </View>
      <Text accessibilityRole="header" style={styles.headerTitle}>{title}</Text>
      <View style={[styles.headerSide, styles.trailing]}>{actions}</View>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm, backgroundColor: c.bg,
  },
  headerSide: { width: sizes.hitMin + spacing.xl, alignItems: 'flex-start' },
  trailing: { alignItems: 'flex-end' },
  headerTitle: { ...type.section, flex: 1, minWidth: 0, color: c.text, textAlign: 'center' },
})
