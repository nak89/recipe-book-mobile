import { useRouter } from 'expo-router'
import { StyleSheet } from 'react-native'
import { Text } from '@/components/ui/Text'
import { MastheadAction } from '@/components/ui/Masthead'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import { contentType, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'

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
 *
 * **It is a `MastheadAction`, not a circle of its own.** It used to be a solid
 * tamarind disc with the initials knocked out of it, which made it the loudest
 * mark on every screen in the app — a filled brand-coloured circle beside two
 * hairline ones reads as the primary action, and going to settings is not the
 * primary action anywhere. Sharing the primitive is also what guarantees the
 * three circles in the Market masthead stay the same size: there is now one
 * definition of that geometry rather than two that have to be kept in step.
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

  const mark = initials(displayName)

  return (
    <MastheadAction
      onPress={() => router.push('/profile')}
      accessibilityLabel={t('nav.profile')}
    >
      {/* Initials are a name, not a sentence — allowFontScaling still applies,
          but two glyphs in a fixed 44pt circle can't wrap, so cap the lines.

          The face comes from `contentType`, i.e. from the **initial**, not from
          the interface language. A name is content: it does not change when the
          toggle does, so neither should the letter standing for it. Reading the
          language-keyed scale instead re-cut a Latin initial in Kantumruy the
          moment you switched to Khmer — the mark visibly changing shape while
          naming the same person. */}
      <Text style={[styles.label, contentType('bodyLargeStrong', mark)]} numberOfLines={1}>
        {mark}
      </Text>
    </MastheadAction>
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    // Colour only. Every type property comes from `contentType` at the call
    // site, so the two can't half-merge — a `letterSpacing` left behind from the
    // other scale is exactly the residue that survives a review. The role there
    // is `bodyLargeStrong` rather than `bodyStrong` because the letterform is
    // doing the work the tamarind disc used to do: at 15 in a 44pt ring it reads
    // as a gap with a letter in it.
    label: { color: c.text },
  })
