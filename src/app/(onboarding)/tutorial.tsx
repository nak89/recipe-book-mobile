import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePager } from '@/components/onboarding/usePager'
import { useAuth } from '@/context/AuthContext'
import { TUTORIAL_BACKDROP, TUTORIAL_SLIDES } from '@/data/tutorialSlides'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'
import { useT } from '@/i18n'

/**
 * The last step, and the only optional one.
 *
 * Finishing calls `completeOnboarding()`. Skipping is a decision, not a
 * deferral — re-offering the tutorial on the next launch would turn a dismissal
 * into a nag, and the whole flow is gated on a flag that means "has been through
 * this", not "has completed this". The skip affordance itself now lives on the
 * welcome screen ahead of this one.
 *
 * The slides carry their own captions and step counter in the artwork, so this
 * screen deliberately draws no headline, no dots and no chrome of its own. Two
 * indicators disagreeing about which step you're on is worse than one you can't
 * restyle — and the artwork is a picture of a full screen, so it is given the
 * full screen: no header, no side padding, no rounded frame. Anything drawn
 * around it reads as a phone inside a phone.
 *
 * That leaves exactly one control, on the last slide: the way out. You move
 * between slides by swiping, so a Next button would only duplicate the gesture
 * — but nothing about a swipe says "and now let me into the app".
 */
export default function TutorialScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { completeOnboarding, onboarded } = useAuth()

  const { ref, index, pageWidth, onLayout, scrollHandler } = usePager(TUTORIAL_SLIDES.length)
  const [finishing, setFinishing] = useState(false)

  const onLastSlide = index === TUTORIAL_SLIDES.length - 1
  // Reached from the profile screen rather than from onboarding. Same slides, but
  // it's a thing you're reading, not a step you're completing — so it has
  // nothing to commit and it goes back where you came from.
  const revisiting = onboarded

  async function finish() {
    if (finishing) return

    if (revisiting) {
      router.back()
      return
    }

    setFinishing(true)
    try {
      await completeOnboarding()
      // The (app) guard takes over the moment `onboardedAt` lands, so this only
      // has to point at the dashboard rather than unwind the onboarding stack.
      router.replace('/')
    } catch {
      // A flag we couldn't persist is not worth stranding anyone over — let them
      // through and let the gate offer the flow again next launch.
      router.replace('/')
    }
  }

  return (
    <View style={styles.container}>
      {/* Always light, and not derived from the theme: this screen's backdrop is
          the artwork's own mid-grey in both themes, and the clock has to sit on
          that rather than on `bg`. */}
      <StatusBar style="light" />

      <Animated.ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={onLayout}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.pager}
      >
        {TUTORIAL_SLIDES.map((slide) => (
          <View key={slide.label} style={[styles.page, { width: pageWidth }]}>
            <Image
              source={slide.image}
              style={styles.shot}
              // contain, not cover: these are screenshots, and cropping one to
              // fill would cut ~6% off each side — into the caption that does
              // the teaching. The slack that leaves above and below is hidden by
              // the container's colour rather than by cropping the picture.
              contentFit="contain"
              accessibilityLabel={slide.label}
              accessibilityIgnoresInvertColors
            />
          </View>
        ))}
      </Animated.ScrollView>

      {/* Only on the last slide. Advancing is the swipe — the slides are a
          picture book, and a Next button beside a finger-tracked pager just
          duplicates it. What can't be swiped is leaving, so the one button here
          is the one that does that. */}
      {onLastSlide && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <Pressable
            accessibilityRole="button"
            onPress={finish}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaLabel}>{revisiting ? t('common.done') : t('tutorial.startCooking')}</Text>
            <Ionicons name="arrow-forward" size={16} color={c.onPrimary} />
          </Pressable>
        </View>
      )}
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  // The artwork's own edge colour rather than `bg`, in both themes — see
  // TUTORIAL_BACKDROP. It's what makes the slack above and below a slide
  // disappear instead of reading as two bars.
  container: { flex: 1, backgroundColor: TUTORIAL_BACKDROP },
  pager: { flex: 1 },
  page: { flex: 1 },
  // The artwork is a light-theme screenshot and stays that way in both themes —
  // it's a picture of the app, and repainting a photograph of a screen is no
  // more sensible than repainting a photograph of a plate. It runs edge to edge
  // and under the status bar, square-cornered: a rounded, inset frame turns a
  // picture of a screen into a picture of a phone. `contain` never crops it, so
  // `width: '100%'` is what it fills and the height is whatever that implies.
  shot: { flex: 1, width: '100%' },
  // Absolute so the artwork keeps the whole screen and the button rides over it
  // rather than shortening it.
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'flex-end',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 26,
    borderRadius: radius.pill,
    backgroundColor: c.primary,
  },
  ctaPressed: { opacity: 0.85 },
  ctaLabel: { fontSize: 15, fontWeight: '600', color: c.onPrimary },
})
