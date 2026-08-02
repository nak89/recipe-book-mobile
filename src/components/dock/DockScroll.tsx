import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  useAnimatedScrollHandler,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

/**
 * How far the dock is tucked away: 0 is fully out, 1 fully minimised.
 *
 * It lives in a context rather than in the dock because the thing that decides
 * it — a scrolling list — is on the other side of the navigator. One value is
 * shared by both tabs, so the dock doesn't pop back into view just because you
 * swiped sideways while scrolled down.
 *
 * A `SharedValue` rather than React state on purpose: this changes on every
 * scroll frame, and routing that through a re-render would cost the 60fps the
 * whole thing exists to protect.
 */
type DockScroll = { hidden: SharedValue<number> }

const DockScrollContext = createContext<DockScroll | null>(null)

export function DockScrollProvider({ children }: { children: ReactNode }) {
  const hidden = useSharedValue(0)
  const value = useMemo(() => ({ hidden }), [hidden])
  return <DockScrollContext.Provider value={value}>{children}</DockScrollContext.Provider>
}

export function useDockHidden() {
  const context = useContext(DockScrollContext)
  if (!context) throw new Error('useDockHidden must be used inside a DockScrollProvider')
  return context.hidden
}

/** Below this, there's too little scrolled away to be worth reclaiming the space. */
const ENGAGE_AFTER = 48
/** Ignores the sub-pixel jitter a finger resting on a list produces. */
const DIRECTION_THRESHOLD = 2

const HIDE = { duration: 220 }
// Springy and fast: coming back has to feel like the dock was waiting for you,
// while leaving can afford to be a slide.
const REVEAL = { damping: 18, stiffness: 260, mass: 0.5 }

/**
 * Attach to a screen's `Animated.ScrollView`/`Animated.FlatList` as `onScroll`.
 * Runs entirely on the UI thread.
 */
export function useDockScrollHandler() {
  const hidden = useDockHidden()
  const lastY = useSharedValue(0)
  // The animation's destination, tracked separately from `hidden` because
  // `hidden` is mid-flight most of the time. Without it, every scroll frame
  // would restart the same animation from wherever it had got to, and the dock
  // would creep instead of move.
  const target = useSharedValue(0)

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y
      const delta = y - lastY.value
      lastY.value = y

      let next = target.value
      if (y <= ENGAGE_AFTER) next = 0
      else if (delta > DIRECTION_THRESHOLD) next = 1
      else if (delta < -DIRECTION_THRESHOLD) next = 0

      if (next === target.value) return
      target.value = next
      hidden.value = next === 1 ? withTiming(1, HIDE) : withSpring(0, REVEAL)
    },
  })
}
