import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import { TUTORIAL_SLIDES } from '@/data/tutorialSlides'
import { radius, shadow, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * A stand-in, exactly like the intro carousel's three. The design hands over a
 * striped block labelled "hero photo — full bleed, slow drift", so the shot was
 * never taken; this is an Unsplash id already in use by `seed-dummy.ts`, so it
 * is known to resolve. Replacing it with the real thing is one string.
 *
 * The brief: one dish, shot from above, warm and slightly dark — it spends its
 * whole life under a scrim with a white sheet over the bottom half, so a busy
 * or bright frame has nowhere to read.
 */
const HERO_PHOTO = 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1600&q=80'

/**
 * Entrance timings, straight from the handoff, in ms. The stagger is the
 * design: mark, then copy, then each button, then the step count — the eye is
 * walked down the sheet in the order the screen wants reading.
 */
const ENTRANCE = {
  veil: { delay: 60, duration: 900 },
  sheet: { delay: 180, duration: 820, distance: 64 },
  mark: { delay: 500, duration: 620, distance: 14, scaleFrom: 0.86 },
  headline: { delay: 620, duration: 660, distance: 22 },
  body: { delay: 720, duration: 660, distance: 22 },
  tour: { delay: 840, duration: 660, distance: 22 },
  skip: { delay: 920, duration: 660, distance: 22 },
  steps: { delay: 1000, duration: 660, distance: 22 },
} as const

/** Ambient loops, timeline-independent — they never settle. */
const AMBIENT = {
  /** Full there-and-back drift across the hero. */
  ken: 22000,
  /** The mark's bob, once it has landed. */
  float: 5500,
  /** One sweep of the highlight across the primary button. */
  sheen: 4600,
  sheenLead: 1800,
  /** One pass of the wave along the step dots. */
  dots: 2400,
} as const

/**
 * First launch, after the name and the starter packs: the screen that offers
 * the tutorial.
 *
 * It exists so the tutorial doesn't have to ask for itself. A tour that opens
 * uninvited has to carry its own Skip on every slide, which is three chances to
 * leave and a control competing with the artwork; asking once, here, means the
 * tutorial can be nothing but pictures.
 *
 * **Both buttons are exits.** "Skip for now" writes `onboardedAt` rather than
 * deferring — skipping is a decision, the same reading the rest of the flow
 * takes — so declining the tour can't leave an account that gets asked again on
 * the next launch.
 *
 * The motion is the design here, not decoration on top of it: the photo settles
 * out of the background colour, the sheet lifts in, and its contents stagger up
 * behind it. All of it runs on the UI thread through Reanimated, so the
 * entrance can't be hitched by the navigation transition that starts it.
 */
export default function WelcomeScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { completeOnboarding } = useAuth()
  const { width, height } = useWindowDimensions()
  const [leaving, setLeaving] = useState(false)
  const t = useT()

  const sheet = useRise(ENTRANCE.sheet)
  const headline = useRise(ENTRANCE.headline)
  const body = useRise(ENTRANCE.body)
  const tour = useRise(ENTRANCE.tour)
  const skip = useRise(ENTRANCE.skip)
  const steps = useRise(ENTRANCE.steps)

  const veil = useSharedValue(1)
  const ken = useSharedValue(0)
  const mark = useSharedValue(0)
  const float = useSharedValue(0)
  const sheen = useSharedValue(0)
  const dots = useSharedValue(0)

  useEffect(() => {
    veil.value = withDelay(
      ENTRANCE.veil.delay,
      withTiming(0, { duration: ENTRANCE.veil.duration, easing: Easing.out(Easing.cubic) })
    )
    mark.value = withDelay(
      ENTRANCE.mark.delay,
      withTiming(1, { duration: ENTRANCE.mark.duration, easing: Easing.out(Easing.cubic) })
    )
    // Reversing halves are how a `withTiming` loop becomes a cosine: the design
    // writes these as one continuous wave, and a non-reversing repeat would
    // snap back to the start of the drift every cycle.
    ken.value = withRepeat(
      withTiming(1, { duration: AMBIENT.ken / 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    )
    float.value = withDelay(
      ENTRANCE.mark.delay + ENTRANCE.mark.duration,
      withRepeat(
        withTiming(1, { duration: AMBIENT.float / 2, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    )
    // Linear and non-reversing: this one is a sweep with a long pause after it,
    // not an oscillation, so the shape lives in the style rather than the curve.
    sheen.value = withDelay(
      AMBIENT.sheenLead,
      withRepeat(withTiming(1, { duration: AMBIENT.sheen, easing: Easing.linear }), -1, false)
    )
    dots.value = withRepeat(
      withTiming(1, { duration: AMBIENT.dots, easing: Easing.linear }),
      -1,
      false
    )

    // The three loops run forever by definition, so they have to be stopped by
    // hand — an infinite `withRepeat` outlives the component otherwise.
    return () => {
      cancelAnimation(ken)
      cancelAnimation(float)
      cancelAnimation(sheen)
      cancelAnimation(dots)
    }
  }, [veil, ken, mark, float, sheen, dots])

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }))

  // Percentages aren't available to a transform, so the drift is derived from
  // the window instead — which is also what keeps it proportional on a tablet
  // and on a resized browser window.
  const kenStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1.06 + 0.09 * ken.value },
      { translateX: -0.016 * width * ken.value },
      { translateY: -0.016 * height * ken.value },
    ],
  }))

  // The one element doing two things at once: landing, and then breathing. They
  // share a transform, so they have to share a style.
  const markStyle = useAnimatedStyle(() => ({
    opacity: mark.value,
    transform: [
      { translateY: ENTRANCE.mark.distance * (1 - mark.value) - 5 * float.value },
      { scale: ENTRANCE.mark.scaleFrom + (1 - ENTRANCE.mark.scaleFrom) * mark.value },
    ],
  }))

  const ctaWidth = width - spacing.xl * 2
  const sheenStyle = useAnimatedStyle(() => {
    // Crosses in the first 55% of the cycle and waits out the rest, so the
    // button is left alone far longer than it's swept.
    const p = Math.min(sheen.value / 0.55, 1)
    const travel = 1 - Math.pow(1 - p, 3)
    return { transform: [{ translateX: ctaWidth * (-1.4 + 3.8 * travel) }] }
  })

  function takeTour() {
    router.push('/tutorial')
  }

  async function skipTour() {
    if (leaving) return
    setLeaving(true)
    try {
      await completeOnboarding()
    } catch {
      // Same tolerance as the tutorial's own finish: a flag we couldn't persist
      // is not worth stranding anyone over. The gate offers the flow again next
      // launch, which is the harmless side of the failure.
    }
    router.replace('/')
  }

  return (
    <View style={styles.container}>
      {/* Full-bleed rather than the handoff's fixed 560pt band. The sheet covers
          everything below it on every phone the app runs on, so the only thing a
          fixed height can do is leave a strip of `bg` between photo and sheet on
          a screen nobody tested. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, kenStyle]}>
          <Image
            source={HERO_PHOTO}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
        <LinearGradient
          colors={[c.scrimSoft, c.scrimNone, c.scrimNone, c.scrimSoft]}
          locations={[0, 0.34, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />
        {/* The photo settles out of the page rather than out of white: in dark
            mode the screen it's arriving on is near-black, and a white flash
            would be the brightest thing in the app. */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }, veilStyle]}
        />
      </View>

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.lg },
          sheet,
        ]}
      >
        <View style={styles.intro}>
          <Animated.View style={[styles.mark, markStyle]}>
            <Ionicons name="restaurant" size={26} color={c.accent} />
          </Animated.View>

          <View style={styles.copy}>
            <Animated.Text style={[styles.headline, headline]}>
              {t('welcome.headline')}
            </Animated.Text>
            <Animated.Text style={[styles.body, body]}>{t('welcome.body')}</Animated.Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Animated.View style={tour}>
            <Pressable
              accessibilityRole="button"
              onPress={takeTour}
              disabled={leaving}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <Text style={styles.ctaLabel}>{t('welcome.takeTour')}</Text>
              <Ionicons name="arrow-forward" size={17} color={c.onPrimary} />
              <Animated.View style={[styles.sheen, sheenStyle]} pointerEvents="none">
                <LinearGradient
                  colors={[c.sheenNone, c.sheen, c.sheenNone]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </Pressable>
          </Animated.View>

          <Animated.View style={skip}>
            <Pressable
              accessibilityRole="button"
              onPress={skipTour}
              disabled={leaving}
              style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
            >
              <Text style={styles.secondaryLabel}>{t('common.skipForNow')}</Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* Counted from the slides themselves. The dots and the label are a
            promise about what "Take the tour" costs, and a fourth slide that
            didn't update them would make it a lie. */}
        <Animated.View style={[styles.steps, steps]}>
          {TUTORIAL_SLIDES.map((slide, i) => (
            <Dot key={slide.label} index={i} pulse={dots} style={styles.dot} />
          ))}
          {/* Still counted from the slides — the number leads in both languages,
              so a template literal is enough. */}
          <Text style={styles.stepsLabel}>
            {`${TUTORIAL_SLIDES.length} ${t('welcome.quickSteps')}`}
          </Text>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

/**
 * A staggered fade-up. Every element in the sheet arrives this way and only the
 * numbers differ, so the shape is written once — the alternative is six near
 * identical pairs of `useSharedValue` and `useAnimatedStyle` inline.
 */
function useRise({
  delay,
  duration,
  distance,
  scaleFrom = 1,
}: {
  delay: number
  duration: number
  distance: number
  scaleFrom?: number
}) {
  const p = useSharedValue(0)

  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }))
  }, [p, delay, duration])

  return useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [
      { translateY: distance * (1 - p.value) },
      { scale: scaleFrom + (1 - scaleFrom) * p.value },
    ],
  }))
}

/**
 * One dot of the wave. A component rather than a loop of hooks, since the count
 * comes from the slide list and hooks can't be called from a `map`.
 */
function Dot({
  index,
  pulse,
  style,
}: {
  index: number
  pulse: SharedValue<number>
  style: object
}) {
  const animated = useAnimatedStyle(() => {
    const phase = pulse.value * Math.PI * 2 - index * 0.8
    return { opacity: 0.28 + 0.72 * ((1 - Math.cos(phase)) / 2) }
  })

  return <Animated.View style={[style, animated]} />
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  // Bottom-anchored and absolute: the sheet is as tall as its contents, and the
  // photograph fills everything it doesn't.
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.surface,
    // The app already has a sheet corner — `ActionSheet` uses this one — and two
    // different sheet radii in one product reads as an accident. This is the
    // single place the handoff was overruled (it asks for 32).
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.xl,
    ...shadow.raised,
  },
  intro: { gap: spacing.lg, alignItems: 'flex-start' },
  // The one place outside the shuffle button that earns the amber: it's the
  // brand mark on the first screen of the app, not a third accent loose in the
  // UI. Nothing else on this screen carries colour.
  mark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: c.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { gap: spacing.sm },
  // `displayLarge` is the app's tallest Khmer setting; the Khmer scale gives
  // it a 1.42× line box so the vowel signs above and the subscript consonants
  // below a cluster aren't shaved off. See `typeKm` in the theme.
  headline: { ...type.displayLarge, color: c.text },
  body: { ...type.bodyLarge, color: c.textMuted, maxWidth: 310 },
  actions: { gap: spacing.md },
  cta: {
    position: 'relative',
    overflow: 'hidden',
    height: 56,
    borderRadius: radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: c.primary,
  },
  ctaPressed: { opacity: 0.92 },
  ctaLabel: { fontSize: 16, fontWeight: '600', color: c.onPrimary },
  // Wider than a hairline so the sweep reads as light moving over a surface
  // rather than as a line crossing it. Positioned by transform only.
  sheen: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '34%' },
  secondary: {
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryPressed: { backgroundColor: c.surfaceAlt },
  secondaryLabel: { fontSize: 16, fontWeight: '600', color: c.textMuted },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: c.text },
  stepsLabel: { ...type.caption, letterSpacing: 0.5, color: c.textPlaceholder, marginLeft: 5 },
})
