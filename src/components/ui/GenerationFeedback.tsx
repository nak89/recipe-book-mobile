import { useEffect, useState } from 'react'
import { Image } from 'expo-image'
import { AppState, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useIsFocused } from 'expo-router'
import Animated, { cubicBezier, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import type { CSSAnimationKeyframes } from 'react-native-reanimated'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { Text } from '@/components/ui/Text'
import TextLink from '@/components/ui/TextLink'
import { useT, type StringKey } from '@/i18n'
import { curve, duration, ease, radius, spacing, useMotion, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

type Artwork = 'recipe' | 'video' | 'week'
type Scene = Artwork | 'photo' | 'photoRecipe' | 'caption'
type ScreenAction = { label: StringKey; onPress: () => void }

const scenes = {
  recipe: {
    title: 'generation.recipe',
    captions: ['generation.recipeDraft', 'generation.recipeSteps', 'generation.recipeReview'],
  },
  video: {
    title: 'generation.video',
    captions: ['generation.videoDraft', 'generation.videoSources', 'generation.videoStill'],
  },
  week: {
    title: 'generation.week',
    captions: ['generation.weekLoad', 'generation.weekExisting', 'generation.weekFridge'],
  },
  caption: {
    title: 'generation.recipe',
    captions: ['generation.captionDraft', 'generation.recipeSteps', 'generation.recipeReview'],
  },
  photoRecipe: {
    title: 'generation.recipe',
    captions: ['generation.photoSource', 'generation.recipeSteps', 'generation.recipeReview'],
  },
  photo: {
    title: 'import.creatingPhoto',
    captions: ['generation.photoDraft', 'generation.photoEdit'],
  },
} as const satisfies Record<Scene, { title: StringKey; captions: readonly StringKey[] }>

const art = {
  panPaper: require('../../../assets/images/generation/simmer-paper.png'),
  pan: require('../../../assets/images/generation/simmer-pan.png'),
  herbs: require('../../../assets/images/generation/simmer-ingredients.png'),
  filmPaper: require('../../../assets/images/generation/flipbook-paper.png'),
  film: require('../../../assets/images/generation/flipbook-film.png'),
  wave: require('../../../assets/images/generation/flipbook-wave.png'),
  calendar: require('../../../assets/images/generation/table-paper.png'),
  recoveryNote: require('../../../assets/images/generation/recovery-note.png'),
  recoveryFilm: require('../../../assets/images/generation/recovery-film.png'),
}
const plates = [
  require('../../../assets/images/generation/table-plate-1.png'),
  require('../../../assets/images/generation/table-plate-2.png'),
  require('../../../assets/images/generation/table-plate-3.png'),
  require('../../../assets/images/generation/table-plate-4.png'),
  require('../../../assets/images/generation/table-plate-5.png'),
  require('../../../assets/images/generation/table-plate-6.png'),
  require('../../../assets/images/generation/table-plate-7.png'),
]

const pan: CSSAnimationKeyframes = {
  '0%, 100%': { transform: [{ rotate: '-2deg' }] },
  '50%': { transform: [{ rotate: '2deg' }] },
}
const herbs: CSSAnimationKeyframes = {
  '0%, 100%': { transform: [{ translateX: -5 }, { translateY: 12 }, { rotate: '-4deg' }], opacity: 0.35 },
  '50%': { transform: [{ translateX: 5 }, { translateY: -12 }, { rotate: '4deg' }], opacity: 1 },
}
const film: CSSAnimationKeyframes = {
  '0%, 100%': { transform: [{ translateX: -5 }, { translateY: 3 }, { rotate: '-5deg' }] },
  '50%': { transform: [{ translateX: 6 }, { translateY: -3 }, { rotate: '3deg' }] },
}
const wave: CSSAnimationKeyframes = {
  '0%, 100%': { opacity: 0.4, transform: [{ scaleY: 0.7 }] },
  '50%': { opacity: 1, transform: [{ scaleY: 1.18 }] },
}
const plate: CSSAnimationKeyframes = {
  '0%, 100%': { opacity: 0 },
  '14%, 69%': { opacity: 1 },
}
const captionFade: CSSAnimationKeyframes = {
  from: { opacity: 0.4 },
  to: { opacity: 1 },
}

function Illustration({ scene, animate, compact, recovery }: {
  scene: Artwork
  animate: boolean
  compact?: boolean
  recovery?: boolean
}) {
  const styles = useThemedStyles(makeStyles)
  const timing = {
    animationTimingFunction: cubicBezier(...curve.inOutSine),
    animationIterationCount: 'infinite' as const,
    animationFillMode: 'both' as const,
  }
  const animation = (frames: CSSAnimationKeyframes, animationDuration: number, animationDelay?: number) =>
    animate ? { ...timing, animationName: frames, animationDuration, animationDelay } : undefined

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.illustration, compact && styles.compactIllustration, recovery && styles.recoveryIllustration]}
    >
      {recovery ? (
        <Image style={StyleSheet.absoluteFill} source={scene === 'video' ? art.recoveryFilm : art.recoveryNote} />
      ) : scene === 'recipe' ? (
        <>
          <Image style={StyleSheet.absoluteFill} source={art.panPaper} />
          <Animated.View style={[styles.panLayer, animation(pan, duration.generationSimmer)]}>
            <Image style={StyleSheet.absoluteFill} source={art.pan} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, animation(herbs, duration.generationSimmer)]}>
            <Image style={StyleSheet.absoluteFill} source={art.herbs} />
          </Animated.View>
        </>
      ) : scene === 'video' ? (
        <>
          <Image style={StyleSheet.absoluteFill} source={art.filmPaper} />
          <Animated.View style={[StyleSheet.absoluteFill, animation(film, duration.generationFilm)]}>
            <Image style={StyleSheet.absoluteFill} source={art.film} />
          </Animated.View>
          <Animated.View style={[styles.waveLayer, animation(wave, duration.generationWave)]}>
            <Image style={StyleSheet.absoluteFill} source={art.wave} />
          </Animated.View>
        </>
      ) : (
        <>
          <Image style={StyleSheet.absoluteFill} source={art.calendar} />
          {plates.map((source, index) => (
            <Animated.View
              key={source}
              style={[StyleSheet.absoluteFill, animation(plate, duration.generationPlates, index * duration.generationPlateDelay)]}
            >
              <Image style={StyleSheet.absoluteFill} source={source} />
            </Animated.View>
          ))}
        </>
      )}
    </View>
  )
}

export function useGenerationDelay(startedAt: number | null) {
  const [visibleFor, setVisibleFor] = useState<number | null>(null)
  useEffect(() => {
    if (startedAt === null) return
    const remaining = Math.max(0, startedAt + duration.generationDelay - performance.now())
    const timer = setTimeout(() => setVisibleFor(startedAt), remaining)
    return () => clearTimeout(timer)
  }, [startedAt])
  return startedAt !== null && visibleFor === startedAt
}

/** Let a visible bar finish before handing off the result. Aborting skips the handoff. */
export function finishGeneration(signal: AbortSignal, onComplete: () => void) {
  if (signal.aborted) return Promise.resolve()
  onComplete()
  return new Promise<void>(resolve => {
    function done() {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, duration.generationFinish)
    signal.addEventListener('abort', done, { once: true })
  })
}

function ProgressBar({ label, complete, motion }: { label: string; complete: boolean; motion: boolean }) {
  const styles = useThemedStyles(makeStyles)
  const value = useSharedValue(0)
  const fill = useAnimatedStyle(() => ({ width: `${value.get()}%` }))
  useEffect(() => {
    // The service returns a final result, so the fill waits below the end.
    value.set(complete
      ? motion ? withTiming(100, { duration: duration.state, easing: ease.outCubic }) : 100
      : motion ? withTiming(82, { duration: duration.generationFill, easing: ease.outQuart }) : 30)
  }, [complete, motion, value])
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: !complete }}
      accessibilityValue={complete ? { min: 0, max: 100, now: 100 } : undefined}
      accessible
    >
      <Animated.View style={[styles.fill, fill]} />
    </View>
  )
}

export function GenerationLoading({ scene, phase, complete = false, onCancel, bottomInset = 0, compact = false }: {
  scene: Scene
  phase?: StringKey
  complete?: boolean
  onCancel?: () => void
  bottomInset?: number
  compact?: boolean
}) {
  const t = useT()
  const styles = useThemedStyles(makeStyles)
  const { reduced } = useMotion()
  const focused = useIsFocused()
  const [appState, setAppState] = useState(AppState.currentState)
  const [caption, setCaption] = useState(0)
  const { title, captions } = scenes[scene]
  const moving = focused && (appState === 'active' || (Platform.OS === 'web' && appState === null)) && !reduced

  useEffect(() => {
    const listener = AppState.addEventListener('change', setAppState)
    return () => listener.remove()
  }, [])
  useEffect(() => {
    if (phase || complete || !focused || appState === 'background') return
    const timer = setInterval(() => setCaption(current => current + 1), duration.generationCaption)
    return () => clearInterval(timer)
  }, [appState, complete, focused, phase, scene])

  const artwork = <Illustration scene={scene === 'week' || scene === 'video' ? scene : 'recipe'} animate={moving && !complete} compact={compact} />
  const message = complete ? 'generation.completeDetail' : phase ?? captions[caption % captions.length]
  const label = t(complete ? 'generation.complete' : title)
  const progress = <ProgressBar label={label} complete={complete} motion={!reduced} />
  const content = (
    <>
      {artwork}
      <Text accessibilityRole={compact ? undefined : 'header'} style={compact ? styles.compactTitle : styles.title}>{label}</Text>
      <View style={!compact && styles.captionBox}>
        <Animated.View
          key={message}
          style={moving ? { animationName: captionFade, animationDuration: duration.state } : undefined}
        >
          <Text style={styles.caption}>{t(message)}</Text>
        </Animated.View>
      </View>
    </>
  )

  if (compact) return <View style={styles.compact}>{content}{progress}</View>

  return (
    <View style={styles.screen}>
      <View style={styles.masthead}><Text style={styles.brand}>{t('generation.brand')}</Text></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
        {content}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, spacing.lg) }]}>
        {onCancel && !complete && <TextLink label={t('common.cancel')} onPress={onCancel} style={styles.footerLink} />}
        {progress}
      </View>
    </View>
  )
}

export function GenerationRecovery({ video, title, detail, primary, secondary, bottomInset = 0 }: {
  video?: boolean
  title: StringKey
  detail: string
  primary: ScreenAction
  secondary?: ScreenAction
  bottomInset?: number
}) {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  return (
    <View style={styles.screen}>
      <View style={styles.masthead}><Text style={styles.brand}>{t('generation.brand')}</Text></View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
        <Illustration scene={video ? 'video' : 'recipe'} animate={false} recovery />
        <Text accessibilityRole="header" style={styles.title}>{t(title)}</Text>
        <Text accessibilityRole="alert" style={styles.caption}>{detail}</Text>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, spacing.lg) }]}>
        <PrimaryButton authoring label={t(primary.label)} onPress={primary.onPress} />
        {secondary && <TextLink label={t(secondary.label)} onPress={secondary.onPress} style={styles.footerLink} />}
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: spacing.gutter },
  masthead: { paddingVertical: spacing.lg, borderBottomWidth: 0.5, borderColor: c.border },
  brand: { ...type.metadata, color: c.textSecondary, textAlign: 'center', textTransform: 'uppercase' },
  scroll: { flex: 1 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  illustration: { width: '100%', maxWidth: 252, aspectRatio: 252 / 214 },
  compactIllustration: { maxWidth: 86 },
  recoveryIllustration: { maxWidth: 190 },
  panLayer: { ...StyleSheet.absoluteFill, transformOrigin: '50% 67%' },
  waveLayer: { ...StyleSheet.absoluteFill, transformOrigin: '20% 80%' },
  title: { ...type.generationTitle, color: c.text, textAlign: 'center' },
  captionBox: { minHeight: (type.bodyLarge.lineHeight ?? type.bodyLarge.fontSize) * 2 },
  caption: { ...type.bodyLarge, color: c.textSecondary, textAlign: 'center', maxWidth: 288 },
  compact: { width: '100%', maxWidth: 288, alignItems: 'center', gap: spacing.xs, padding: spacing.sm },
  compactTitle: { ...type.authoringOption, color: c.text, textAlign: 'center' },
  footer: { alignSelf: 'center', width: '100%', maxWidth: 440, paddingTop: spacing.md, gap: spacing.md },
  footerLink: { alignSelf: 'center' },
  track: { alignSelf: 'stretch', overflow: 'hidden', height: spacing.xs, borderRadius: radius.pill, backgroundColor: c.surfaceSunken },
  fill: { ...StyleSheet.absoluteFill, right: undefined, borderRadius: radius.pill, backgroundColor: c.primary },
})
