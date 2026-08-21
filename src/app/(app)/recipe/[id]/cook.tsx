import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useAuth } from '@/context/AuthContext'
import { getRecipe } from '@/lib/api'
import { selectionFeedback, favouriteFeedback } from '@/lib/haptics'
import { formatDuration, timerProgress } from '@/lib/timer'
import TextLink from '@/components/ui/TextLink'
import { useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { contentType, fonts, radius, sized, spacing, useScreenTopPad, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { Recipe, Step } from '@/types/recipe'

/**
 * Cook mode — SCREENS.md § 8. One step at a time, hands free.
 *
 * ## Why it is a pager and not a list
 *
 * The whole point of the screen is that exactly one instruction is on the glass.
 * A list would put the next step in your peripheral vision, which is what the
 * recipe page already does better. It is a horizontal paging `ScrollView` rather
 * than `react-native-pager-view` for the reason `RecipeForm` gives: pager-view
 * ships no web implementation, and this app runs in a browser. `pageWidth` is
 * authoritative from `onLayout` and **seeded** from `Dimensions` on native, so
 * the first frame isn't empty.
 *
 * ## The timers keep running
 *
 * A step's countdown belongs to the step, not to the page you are looking at:
 * you start the rice, swipe ahead to read what's next, and the rice keeps
 * counting. So `remaining` is a map keyed by step id and the tick is a single
 * interval over the whole screen, not one per page. That is also why pausing is
 * per-step — two things can be on the hob at once.
 *
 * **`Date.now()` deltas, not a decrementing counter.** `setInterval` is not a
 * clock: it drifts, and JS timers are throttled hard when an app is backgrounded
 * — which is exactly what happens when you put the phone down to cook. A counter
 * that decrements by one per tick would silently run slow and be minutes out by
 * the time you looked. Each running timer stores the wall-clock instant it will
 * finish at, and the interval only re-reads it.
 *
 * ## The status bar
 *
 * It doesn't touch it. This screen used to be the one place allowed to override
 * the app's status-bar style, because the page was reversed to ink and a dark
 * clock would have been invisible on it. The page is paper again, per
 * SCREENS.md § 8, so the root layout's derivation is simply correct here too.
 */
export default function CookModeScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const topPad = useScreenTopPad()

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<StringKey | null>(null)
  const [index, setIndex] = useState(0)

  // Seeded on native so the first page isn't a blank frame; authoritative from
  // `onLayout`, because this is a full-screen route on a phone and a resizable
  // window on the web.
  const [pageWidth, setPageWidth] = useState(() =>
    Dimensions.get('window').width > 0 ? Dimensions.get('window').width : 0
  )
  const pagerRef = useRef<ScrollView>(null)

  /**
   * Per-step timer state, keyed by step id.
   *
   * `endsAt` is a wall-clock instant for a running timer; `remaining` is the
   * frozen number of seconds for a paused or never-started one. Exactly one of
   * them is meaningful at a time, which is what `running` says.
   */
  type TimerState = { running: boolean; endsAt: number; remaining: number }
  const [timers, setTimers] = useState<Record<string, TimerState>>({})
  // Bumped once a second purely to re-render a running countdown. The value is
  // never read — the numbers are derived from `Date.now()`, not from this.
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!token || !id) return
    let cancelled = false
    getRecipe(id, token)
      .then((data) => {
        if (!cancelled) setRecipe(data)
      })
      .catch((err) => {
        if (!cancelled) setError(apiErrorKey(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, token])

  const steps: Step[] = recipe
    ? [...recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber)
    : []

  const anyRunning = Object.values(timers).some((s) => s.running)

  // One interval for the screen, and only while something is actually counting
  // — a timer left ticking on a screen with nothing to show wakes the JS thread
  // once a second for no reason.
  useEffect(() => {
    if (!anyRunning) return
    const handle = setInterval(() => setTick((v) => v + 1), 250)
    return () => clearInterval(handle)
  }, [anyRunning])

  /** Seconds left on a step's timer, from the wall clock rather than from a count. */
  const remainingFor = useCallback(
    (step: Step): number => {
      const total = step.durationSeconds ?? 0
      const state = timers[stepId(step)]
      if (!state) return total
      if (!state.running) return state.remaining
      return Math.max(0, Math.round((state.endsAt - Date.now()) / 1000))
    },
    [timers]
  )

  function toggleTimer(step: Step) {
    const key = stepId(step)
    const total = step.durationSeconds ?? 0
    if (total <= 0) return
    selectionFeedback()
    setTimers((prev) => {
      const state = prev[key]
      // Never started, or finished and being started again.
      if (!state || (!state.running && state.remaining <= 0)) {
        return { ...prev, [key]: { running: true, endsAt: Date.now() + total * 1000, remaining: total } }
      }
      if (state.running) {
        const left = Math.max(0, Math.round((state.endsAt - Date.now()) / 1000))
        return { ...prev, [key]: { running: false, endsAt: 0, remaining: left } }
      }
      return {
        ...prev,
        [key]: { running: true, endsAt: Date.now() + state.remaining * 1000, remaining: state.remaining },
      }
    })
  }

  function resetTimer(step: Step) {
    const key = stepId(step)
    selectionFeedback()
    setTimers((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function goTo(next: number) {
    const clamped = Math.max(0, Math.min(steps.length - 1, next))
    setIndex(clamped)
    pagerRef.current?.scrollTo({ x: clamped * pageWidth, animated: true })
  }

  function onMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth <= 0) return
    const landed = Math.round(e.nativeEvent.contentOffset.x / pageWidth)
    if (landed !== index) {
      setIndex(landed)
      selectionFeedback()
    }
  }

  function onPagerLayout(e: LayoutChangeEvent) {
    const width = e.nativeEvent.layout.width
    if (width > 0 && width !== pageWidth) setPageWidth(width)
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centred]}>
        <ActivityIndicator color={c.primary} />
      </View>
    )
  }

  if (!recipe || steps.length === 0) {
    return (
      <View style={[styles.container, styles.centred]}>
        <Text style={styles.emptyTitle}>{t(error ?? 'cook.noSteps')}</Text>
        <TextLink label={t('cook.exit')} onPress={() => router.back()} />
      </View>
    )
  }

  const current = steps[index]
  const onLastStep = index === steps.length - 1

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        {/* `TITLE · COOKING` at half strength — you know what you are cooking;
            this is a reminder, not a headline. The title is content, so its face
            follows its own script. */}
        <Text style={styles.headerTitle} numberOfLines={1}>
          <Text style={contentType('metadataSmall', recipe.title)}>
            {recipe.title.toUpperCase()}
          </Text>
          {` · ${t('cook.cooking')}`}
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('cook.exit')}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <View style={styles.closeA} />
          <View style={styles.closeB} />
        </Pressable>
      </View>

      {/* One 3px segment per step: completed and current in tamarind, the rest
          at .15. A bar with a percentage would be less useful — what you want to
          know mid-cook is how many things are left, and these are countable. */}
      <View style={styles.rail}>
        {steps.map((step, i) => (
          <View
            key={stepId(step)}
            style={[styles.railSegment, i <= index && styles.railSegmentDone]}
          />
        ))}
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onLayout={onPagerLayout}
        onMomentumScrollEnd={onMomentumEnd}
        style={styles.pager}
      >
        {steps.map((step, i) => (
          <ScrollView
            key={stepId(step)}
            style={{ width: pageWidth }}
            contentContainerStyle={styles.page}
            showsVerticalScrollIndicator={false}
          >
            {/* The ghosted numeral — the one place `stepNumeral` is used, and
                what its 100/.9 exists for. A numeral, so it follows the
                language like every other one on the screen. */}
            <Text style={styles.ghostNumeral}>{n(i + 1)}</Text>
            {/* `margin-top: -4` per § 8, closing the instruction up under the
                numeral without overlapping it. */}
            <Text style={[styles.stepText, contentType('cookStep', step.instruction)]}>
              {step.instruction}
            </Text>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={[styles.foot, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {/* The timer block belongs to the step you are looking at, and is drawn
            only where that step has one. Most steps don't, and a permanently
            empty control at the bottom of the screen would be worse than none:
            it would read as broken rather than as absent. */}
        {current.durationSeconds != null && (
          <Timer
            step={current}
            remaining={remainingFor(current)}
            running={timers[stepId(current)]?.running === true}
            endsAt={timers[stepId(current)]?.endsAt ?? 0}
            onToggle={() => toggleTimer(current)}
            onReset={() => resetTimer(current)}
          />
        )}

        <View style={styles.nav}>
          <Pressable
            onPress={() => goTo(index - 1)}
            disabled={index === 0}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('cook.previous')}
            style={({ pressed }) => [
              styles.navButton,
              styles.navBack,
              index === 0 && styles.navDisabled,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.arrowTop, styles.arrowCentred]} />
            <View style={[styles.arrowBottom, styles.arrowCentred]} />
          </Pressable>

          <Text style={styles.count}>
            {`${n(index + 1)} ${t('cook.ofSteps')} ${n(steps.length)}`}
          </Text>

          {onLastStep ? (
            <Pressable
              onPress={() => {
                favouriteFeedback()
                router.back()
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
            >
              <Text style={styles.doneLabel}>{t('cook.done')}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => goTo(index + 1)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('cook.next')}
              style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
            >
              <View style={[styles.arrowTop, styles.arrowForward]} />
              <View style={[styles.arrowBottom, styles.arrowBackward]} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}

/**
 * A step's id, or its number when the row has none.
 *
 * Steps come back from the API with real ids, so this is a fallback rather than
 * the normal path — but the timer map is keyed by it, and a collision would
 * point two steps at one countdown.
 */
function stepId(step: Step): string {
  return step.id ?? `n${step.stepNumber}`
}

/**
 * § 8's timer block: the countdown, a pill button, and a 4px progress bar.
 *
 * The countdown is IBM Plex Mono at 62 with tight tracking — it is the largest
 * number in the product and the one thing here you read from across a room.
 * **Mono specifically**, because a proportional face makes a counting-down
 * number jitter horizontally as its digits change width.
 */
function Timer({
  step,
  remaining,
  running,
  endsAt,
  onToggle,
  onReset,
}: {
  step: Step
  remaining: number
  running: boolean
  endsAt: number
  onToggle: () => void
  onReset: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const total = step.durationSeconds ?? 0
  const finished = remaining <= 0
  const started = running || remaining < total

  /**
   * The bar's own progress, animated on the UI thread rather than re-rendered.
   *
   * `remaining` is whole seconds — `remainingFor` rounds it, because that is
   * what the countdown displays — so a width derived from it advances in
   * one-second blocks however often the screen re-renders. Ticking faster is not
   * the fix: the interval deliberately runs at 250ms and waking the JS thread
   * every frame to move a 4pt bar is exactly the cost this codebase avoids
   * elsewhere.
   *
   * So the bar is told where it is *going* and left to get there by itself: one
   * linear `withTiming` to 1 over the true milliseconds left, read from the
   * wall clock rather than from the rounded seconds. It re-arms once a second
   * with a freshly derived start and duration, which costs one worklet per
   * second and makes the animation self-correcting — a backgrounded app resumes
   * on the clock instead of drifting with the timeline it was mid-way through.
   *
   * **`ReduceMotion.Never` is deliberate.** Reanimated's default would collapse
   * this to an instant jump to the *end* value, which for a bar animating toward
   * 1 means showing a full bar while the timer still runs — reduced motion would
   * make it lie. This is the same call `duration.pulse` documents: it carries
   * information, not decoration, so it survives the setting.
   */
  const progress = useSharedValue(0)

  useEffect(() => {
    if (total <= 0) {
      cancelAnimation(progress)
      progress.value = 0
      return
    }
    if (running) {
      const msLeft = Math.max(0, endsAt - Date.now())
      progress.value = 1 - msLeft / (total * 1000)
      progress.value = withTiming(1, {
        duration: msLeft,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      })
    } else {
      // Paused, reset or never started: hold exactly where the clock says.
      cancelAnimation(progress)
      progress.value = timerProgress(remaining, total)
    }
  }, [running, endsAt, remaining, total, progress])

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }))

  return (
    <View style={styles.timer}>
      <View style={styles.timerRow}>
        {/* The digits are converted; the colons are not. `formatDuration`
            returns Latin for exactly this reason. */}
        <Text style={[styles.countdown, finished && styles.countdownDone]}>
          {n(formatDuration(remaining))}
        </Text>

        <View style={styles.timerButtons}>
          {started && !running && (
            <Pressable
              onPress={onReset}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('cook.reset')}
              style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
            >
              <Text style={styles.resetLabel}>{t('cook.reset')}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onToggle}
            accessibilityRole="button"
            style={({ pressed }) => [styles.timerPill, pressed && styles.pressed]}
          >
            <Text style={styles.timerPillLabel}>
              {t(running ? 'cook.pause' : finished ? 'cook.start' : started ? 'cook.resume' : 'cook.start')}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* A percentage width, so it must **not** go through `n()` — a Khmer digit
          in a style value is a broken layout, not a translation. The worklet
          builds the same string on the UI thread, where `n()` isn't in scope
          anyway. */}
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  )
}

/**
 * How far `stepNumeral`'s line box runs on below the ink, in points.
 *
 * A line box holds the baseline plus the face's declared descent, and a numeral
 * has no descender to put in it, so that space is always empty. The two faces
 * reserve very different amounts of it — read from their own `hhea` tables:
 * Newsreader −0.265em, Moul −0.586em, i.e. more than twice as much under a
 * Khmer numeral as under a Latin one at nearly the same size.
 */
/** The nav button's box, and the two numbers its chevron is built from. */
const NAV = 44
const ARROW_THICK = 1.4
/** How far a 10pt stroke at 45° reaches from its own centre, vertically. */
const ARROW_REACH = (10 / 2) * Math.SQRT1_2

const DESCENT: Record<string, number> = {
  [fonts.serifMedium]: 0.265,
  [fonts.khmerDisplay]: 0.586,
}

const numeralDescent = (type: TypeScale) =>
  Math.round(type.stepNumeral.fontSize * (DESCENT[type.stepNumeral.fontFamily ?? ''] ?? 0))

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    /**
     * Paper, like every other screen in the product.
     *
     * This used to reverse the page to ink by hand — `text` and `bg` swapped
     * throughout — on the reasoning that cook mode wants to be legible across a
     * kitchen. It reads well and it is not the design: SCREENS.md § 8 and the
     * mockup both put this screen on the same `#f8f2e6` paper with `#241e18`
     * type as everywhere else, and the inversion was a divergence rather than a
     * decision. It also quietly cost the screen its dark mode — a hand-made swap
     * has nowhere left to go once the palette itself has inverted, so at night
     * cook mode was the one screen that went *light*.
     */
    container: { flex: 1, backgroundColor: c.bg },
    centred: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.gutter },
    emptyTitle: { ...type.emptyTitle, color: c.text, textAlign: 'center' },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.gutter,
      paddingBottom: spacing.md,
    },
    headerTitle: { ...type.metadataSmall, color: c.text, opacity: 0.5, flex: 1, minWidth: 0 },
    close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
    // A ✕ from two 1.4px rules, matching every other icon in the product.
    closeA: {
      position: 'absolute',
      width: 15,
      height: 1.4,
      backgroundColor: c.text,
      transform: [{ rotate: '45deg' }],
    },
    closeB: {
      position: 'absolute',
      width: 15,
      height: 1.4,
      backgroundColor: c.text,
      transform: [{ rotate: '-45deg' }],
    },
    pressed: { opacity: 0.6 },

    rail: { flexDirection: 'row', gap: 5, paddingHorizontal: spacing.gutter },
    railSegment: {
      flex: 1,
      height: 3,
      borderRadius: radius.pill,
      // The design's own `rgba(36,30,24,.15)` — ink at 15%, read literally now
      // that the page underneath it is paper again.
      backgroundColor: c.text,
      opacity: 0.15,
    },
    railSegmentDone: { backgroundColor: c.primary, opacity: 1 },

    pager: { flex: 1 },
    page: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
    // This is `type.stepNumeral`'s only consumer — see the token for why its
    // line box is 0.965 rather than the specced 0.9.
    ghostNumeral: { ...type.stepNumeral, color: c.accentGhost },
    /**
     * The instruction closes up under the numeral, and the pull is derived.
     *
     * § 8 draws it at `margin-top: -4px` and is explicit that the two must not
     * overlap. A flat −4 only works if the numeral's line box ends where its ink
     * does, and it doesn't: the box reserves the face's full descent below the
     * baseline — 26.5pt under Newsreader's digits, **56.3pt under Moul's** —
     * which is dead space the design never drew. Left in, the Khmer step text
     * sat half a screen below its own numeral.
     *
     * So: take that reserved descent back out, then hold the design's own gap.
     * Derived from the token rather than typed as a number, because the two
     * scales need very different pulls and a single literal can only be right
     * for one of them.
     */
    stepText: { color: c.text, marginTop: spacing.sm - numeralDescent(type) },

    foot: {
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.lg,
      gap: spacing.lg,
      borderTopWidth: 1.5,
      borderTopColor: c.text,
    },

    timer: { gap: spacing.md },
    timerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
    countdown: {
      ...sized(type.metadata, 62),
      color: c.text,
      letterSpacing: -1.86,
    },
    countdownDone: { color: c.primary },
    timerButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    // 1.2px border, r99, 11×22 — § 8's own, and the compact variant of the
    // secondary button DESIGN_SYSTEM.md § 4 describes.
    timerPill: {
      borderWidth: 1.2,
      borderColor: c.text,
      borderRadius: radius.pill,
      paddingHorizontal: 22,
      paddingVertical: 11,
    },
    timerPillLabel: { ...type.button, color: c.text, textTransform: 'uppercase' },
    resetButton: { paddingVertical: 6 },
    resetLabel: { ...type.metadataSmall, color: c.text, opacity: 0.5 },
    /**
     * The track's 15% is an alpha *colour*, never `opacity` on the view.
     *
     * `opacity` composites the whole subtree, so it took the tamarind `fill`
     * down with it and the bar rendered at 15% strength — a pale wash instead of
     * the accent. The `opacity: 1` that used to sit on `fill` could not undo it:
     * a child's opacity is relative to its parent's layer, not absolute.
     *
     * `border` is ink at .16, which is the design's own .15 to within a
     * hundredth and is already the token for a hairline on paper.
     */
    track: { height: 4, borderRadius: radius.pill, backgroundColor: c.border, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: radius.pill, backgroundColor: c.primary },

    nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    navButton: { width: NAV, height: NAV, justifyContent: 'center' },
    /**
     * Back is a drawn control, not a bare glyph: a hairline box on paper, the
     * same idiom as the timer pill beside it. `borderWidth` is inside the box in
     * RN, so the 44pt hit target is unchanged.
     *
     * Only the *back* arrow gets this. Forward is the step the cook is reaching
     * for, and boxing both would make the pair read as two equal choices.
     */
    navBack: { borderWidth: 1.5, borderColor: c.border, borderRadius: radius.chip },
    navDisabled: { opacity: 0.25 },
    // Same geometry as the planner's week arrows, and the same fix: a 10pt bar
    // at 45° reaches 10/2·sin45 ≈ 3.54 from its own centre, so each half sits
    // exactly that far from the button's middle and the two close at the point.
    // Both were inset 15 from their own edge, which left a 5.6pt gap and made
    // the arrowheads look snapped off.
    arrowTop: {
      position: 'absolute',
      left: 12,
      top: NAV / 2 - ARROW_REACH - ARROW_THICK / 2,
      width: 10,
      height: ARROW_THICK,
      backgroundColor: c.text,
      transform: [{ rotate: '-45deg' }],
    },
    arrowBottom: {
      position: 'absolute',
      left: 12,
      bottom: NAV / 2 - ARROW_REACH - ARROW_THICK / 2,
      width: 10,
      height: ARROW_THICK,
      backgroundColor: c.text,
      transform: [{ rotate: '45deg' }],
    },
    arrowForward: { transform: [{ rotate: '45deg' }] },
    arrowBackward: { transform: [{ rotate: '-45deg' }] },
    /**
     * Centres the chevron once there is a box around it.
     *
     * The bare arrows sit at `left: 12`, which puts their 10pt bars' shared
     * centre at 17 in a 44pt button — fine when the edge is invisible, visibly
     * off-centre once it isn't. Same arithmetic as `ARROW_REACH`: half the bar's
     * length in from the middle.
     */
    arrowCentred: { left: (NAV - 10) / 2 },
    count: { ...type.metadataSmall, color: c.text, opacity: 0.5, textTransform: 'uppercase' },
    doneButton: {
      backgroundColor: c.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 22,
      paddingVertical: 12,
    },
    doneLabel: { ...type.button, color: c.onPrimary, textTransform: 'uppercase' },
  })
