/**
 * Motion, transcribed from the design system's `tokens/motion.css`.
 *
 * The app has no decorative animation. Everything that moves is either an
 * entrance stagger, a press response, or a control tracking a finger. Nothing
 * bounces for fun; the one spring in the system is the release of a press, and
 * it is short.
 *
 * Two curves cover almost all of it: `outCubic` for anything arriving, and
 * `inOutSine` for anything that loops.
 *
 * These numbers were already in the app — inlined as local consts in
 * `welcome.tsx`, `TabBar.tsx` and `Skeleton.tsx`. They are the same values;
 * this module is where they live now, so the next palette-style change is an
 * edit to one file rather than a hunt through thirty.
 */
import { useMemo } from 'react'
import { Easing, useReducedMotion } from 'react-native-reanimated'

/**
 * The curves as raw cubic-bezier control points.
 *
 * Exported alongside the built easing functions below because the app animates
 * with two different libraries: Reanimated on the UI thread for anything that
 * tracks a finger, and React Native's own `Animated` for the skeleton pulse
 * (which predates the worklet code and has no reason to move). Both take
 * bezier control points; only the constructor differs.
 */
export const curve = {
  outCubic: [0.33, 1, 0.68, 1],
  inOutSine: [0.37, 0, 0.63, 1],
  outQuart: [0.25, 1, 0.5, 1],
  /**
   * The press release. This is the CSS *approximation* — in React Native the
   * real thing is `spring.pressOut` below, which is what `motion.css` says in
   * its own comment. Prefer the spring; this exists so the curve is transcribed
   * rather than silently dropped.
   */
  springOut: [0.2, 1.25, 0.5, 1],
} as const

/** The curves as Reanimated easing functions — what `withTiming` takes. */
export const ease = {
  outCubic: Easing.bezier(...curve.outCubic),
  inOutSine: Easing.bezier(...curve.inOutSine),
  outQuart: Easing.bezier(...curve.outQuart),
  springOut: Easing.bezier(...curve.springOut),
} as const

/**
 * The one spring in the system, named by `motion.css` as the React Native
 * expression of `--ease-spring-out`. Press in fast and linear, out on this —
 * the asymmetry is the feel.
 */
export const spring = {
  pressOut: { damping: 9, stiffness: 380, mass: 0.4 },
} as const

/**
 * Durations in milliseconds.
 *
 * Split into two groups because the reduced-motion contract treats them
 * differently — see `DECORATIVE` below. The split is `motion.css`'s, not one
 * invented here: its `prefers-reduced-motion` block collapses exactly the
 * seven listed there and leaves everything else alone.
 */
export const duration = {
  // Press. In fast, out springy.
  pressIn: 90,
  pressOut: 260,
  /** Opacity and colour state changes on ordinary controls. */
  state: 150,
  /** Sheets, dialogs and the dock hiding on scroll. */
  sheet: 260,
  reveal: 320,
  /** Onboarding entrances. */
  rise: 660,
  sheetRise: 820,
  veil: 900,
  /** Photo cross-fade when an image finishes decoding. */
  image: 200,
  /** Ambient loops — timeline-independent, they never settle. */
  kenBurns: 22000,
  float: 5500,
  sheen: 4600,
  dotWave: 2400,
  /**
   * The skeleton pulse. One value per screen, so the whole layout breathes
   * together — independently blinking grey boxes read as broken, not loading.
   * Deliberately NOT in `DECORATIVE`: a pulse is what tells you the screen is
   * still working, so removing it removes information rather than decoration.
   */
  pulse: 700,
} as const

export type DurationKey = keyof typeof duration

// The entrance stagger (`riseDistance`, `stagger`, `staggerDelay`) went with
// the Chronicle rework: its motion section allows four transitions in the whole
// product and none of them is content arriving. "The paper does not bounce."

/**
 * The durations `prefers-reduced-motion` collapses, straight from the media
 * query at the bottom of `motion.css`.
 *
 * Note what is *not* here: press, state, sheet, reveal, image and pulse all
 * survive. Reduced motion is a request to stop things moving for effect, not a
 * request to strip the feedback that tells you a control responded. A button
 * that no longer dims when pressed is broken, not calm.
 */
const DECORATIVE = [
  'rise',
  'sheetRise',
  'veil',
  'kenBurns',
  'float',
  'sheen',
  'dotWave',
] as const satisfies readonly DurationKey[]

const REDUCED_DURATION = Object.fromEntries(
  Object.entries(duration).map(([key, value]) => [
    key,
    (DECORATIVE as readonly string[]).includes(key) ? 1 : value,
  ]),
) as typeof duration

/**
 * Durations for the current accessibility setting.
 *
 * Reanimated already honours the OS setting inside `withTiming`/`withSpring` by
 * default, which handles a one-shot entrance on its own. This hook exists for
 * the case that default cannot cover: an *infinite* `withRepeat` should not be
 * started at all, and a staggered list should not hold its items back by delays
 * that no longer buy anything. Reading the flag lets a screen skip the work
 * rather than run it at 1ms.
 *
 *     const { duration, reduced } = useMotion()
 *     if (!reduced) drift.value = withRepeat(withTiming(1, { duration: duration.kenBurns }), -1, true)
 */
export function useMotion(): { duration: typeof duration; reduced: boolean } {
  const reduced = useReducedMotion()
  return useMemo(
    () => ({ duration: reduced ? REDUCED_DURATION : duration, reduced }),
    [reduced],
  )
}
