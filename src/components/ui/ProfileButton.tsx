import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import { radius, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * The initials avatar that replaced the profile tab.
 *
 * Profile stopped being a destination in the dock — a tab bar is only honest if
 * every tab is a place you'd swipe between, and settings isn't one. It lives in
 * the header of the two screens that *are* destinations instead, which is also
 * where the design system puts it.
 *
 * It renders initials rather than a photograph because there is no avatar upload
 * and deliberately isn't one; the fallback is the whole feature.
 */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export default function ProfileButton() {
  const styles = useThemedStyles(makeStyles)
  const router = useRouter()
  const t = useT()
  const { displayName } = useAuth()

  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel={t('nav.profile')}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      {/* Initials are a name, not a sentence — allowFontScaling still applies,
          but two glyphs in a fixed 44pt circle can't wrap, so cap the lines. */}
      <Text style={styles.label} numberOfLines={1}>
        {initials(displayName)}
      </Text>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    // 44 is the tap-target floor, and the button is exactly it: any smaller and
    // it needs a hit slop to stay reachable.
    button: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.85 },
    label: { ...type.bodyStrong, color: c.onPrimary },
  })
