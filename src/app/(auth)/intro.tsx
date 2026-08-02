import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePager } from '@/components/onboarding/usePager'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { INTRO_SLIDES } from '@/data/introSlides'
import { useSeenIntro } from '@/lib/onboarding'
import { fonts, radius, spacing, type, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'

/** Photo height from the handoff, at the 402 × 874 reference. */
const PHOTO_HEIGHT = 470
/** Below this the fixed height eats the text block, so it becomes a fraction. */
const SHORT_SCREEN = 700

/**
 * The pre-auth intro carousel: three editorial slides, then out to sign-up.
 *
 * Two things here are unlike the rest of the app and both are deliberate. The
 * headline is a serif — the only one in the product — because this screen is
 * selling rather than working. And there are no borders and no shadows
 * anywhere: the photograph does the separating, so adding a card would flatten
 * exactly the contrast the layout is built on.
 *
 * The handoff specifies a 260ms cross-fade between slides. That can't coexist
 * with a finger-tracked pager, which the same handoff asks for in production —
 * a cross-fade has no meaningful mid-gesture state. The swipe wins, and the
 * progress rules are driven from the live offset instead, which is the part of
 * that spec that actually survives.
 */
export default function IntroScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { markSeen } = useSeenIntro()
  const { height } = useWindowDimensions()

  const { ref, scrollX, index, pageWidth, onLayout, scrollHandler, goTo } = usePager(
    INTRO_SLIDES.length
  )

  const photoHeight = height < SHORT_SCREEN ? height * 0.45 : PHOTO_HEIGHT
  const onLastSlide = index === INTRO_SLIDES.length - 1

  function leave() {
    markSeen()
    // replace, not push: the carousel is finished with, and a back gesture from
    // sign-up should not be able to reopen it.
    router.replace('/signup')
  }

  return (
    <View style={styles.container}>
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
        {INTRO_SLIDES.map((slide) => (
          <View key={slide.kicker} style={{ width: pageWidth }}>
            <Image
              source={slide.photo}
              style={{ width: pageWidth, height: photoHeight }}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
            <View style={styles.textBlock}>
              <Text style={styles.kicker}>{slide.kicker}</Text>
              <Text style={styles.headline}>
                {slide.headline.map((segment, i) => (
                  <Text key={i} style={segment.italic ? styles.headlineItalic : undefined}>
                    {segment.text}
                  </Text>
                ))}
              </Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          </View>
        ))}
      </Animated.ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xl) + 20 }]}>
        <View style={styles.rules} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {INTRO_SLIDES.map((slide, i) => (
            <Rule key={slide.kicker} index={i} scrollX={scrollX} pageWidth={pageWidth} color={c.text} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => (onLastSlide ? leave() : goTo(index + 1))}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaLabel}>{onLastSlide ? 'Open the book' : 'Next'}</Text>
          <Ionicons name="arrow-forward" size={16} color={c.onPrimary} />
        </Pressable>
      </View>

      {/* Absolute and outside the pager, so one pill sits over all three slides
          rather than three scrolling past under the finger. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        hitSlop={16}
        onPress={leave}
        style={[styles.skip, { top: insets.top + 2 }]}
      >
        <Text style={styles.skipLabel}>Skip</Text>
      </Pressable>

      {/* Mirrors Skip on the opposite corner, and absolute for the same reason —
          one control over all three slides rather than three scrolling past.
          This screen's own copy stays English permanently (its editorial serif
          has no Khmer glyphs and its italic emphasis has no Khmer equivalent),
          but the control still belongs here: it's the first screen a new user
          sees, and 'EN · ខ្មែរ' needs no reading to operate. */}
      <LanguageToggle variant="onPhoto" style={[styles.language, { top: insets.top + 2 }]} />
    </View>
  )
}

/**
 * One segment of the progress rule, lit by proximity to the live scroll offset
 * rather than by matching the settled index — so it fades under the finger
 * instead of flicking over when the gesture ends.
 */
function Rule({
  index,
  scrollX,
  pageWidth,
  color,
}: {
  index: number
  scrollX: SharedValue<number>
  pageWidth: number
  color: string
}) {
  const style = useAnimatedStyle(() => {
    if (pageWidth === 0) return { opacity: index === 0 ? 1 : 0.18 }
    return {
      opacity: interpolate(
        scrollX.value,
        [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth],
        [0.18, 1, 0.18],
        'clamp'
      ),
    }
  })

  return <Animated.View style={[{ flex: 1, height: 2, backgroundColor: color }, style]} />
}

/**
 * The one factory that deliberately ignores `useThemedStyles`' type-scale
 * argument and spreads the module-level Latin `type` instead.
 *
 * This screen's copy is English in both languages — the carousel runs before an
 * account exists and was cut from translation on purpose — so scaling it up for
 * Khmer would set English text at Khmer sizes with Khmer line boxes, loosening
 * an editorial layout that is set to the millimetre. The rule everywhere else
 * (take the parameter, never reach for the import) holds precisely because the
 * text is translated; here it isn't.
 */
const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  // No top safe-area inset: the photograph is meant to run under the status bar.
  pager: { flex: 1 },
  textBlock: { flex: 1, paddingTop: spacing.xxl, paddingHorizontal: spacing.xl, gap: 14 },
  kicker: { ...type.kicker, color: c.textMuted },
  headline: { ...type.editorialDisplay, color: c.text },
  // Nested Text inherits size and colour but not the family, so the italic face
  // has to be named again. It's a separate font file, not a synthesised slant.
  headlineItalic: { fontFamily: fonts.serifItalic },
  body: { ...type.body, lineHeight: 23, color: c.textMuted, maxWidth: 300 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  rules: { flex: 1, flexDirection: 'row', gap: 6 },
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
  skip: {
    position: 'absolute',
    right: 20,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    // Literal in both themes, like scrim: it sits on a photograph, and that job
    // doesn't change at night.
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  skipLabel: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  language: { position: 'absolute', left: 20 },
})
