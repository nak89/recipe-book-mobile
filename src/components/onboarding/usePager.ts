import { useCallback, useState } from 'react'
import { Dimensions, Platform } from 'react-native'
import type { LayoutChangeEvent } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { selectionFeedback } from '@/lib/haptics'

/**
 * The plumbing behind onboarding's swipeable carousels.
 *
 * A hook rather than a component because the two consumers lay out completely
 * differently — the intro is a photo over an editorial text block, the tutorial
 * is a full-bleed screenshot — and a component general enough to be both would
 * be all props and no opinion. What they genuinely share is this: page width,
 * a live scroll offset, the settled index, and a way to jump.
 *
 * `scrollX` is exposed so an indicator can be driven from the *live* offset
 * rather than from the settled index. That's the same reason `TabBar`'s capsule
 * reads the pager's offset: an indicator that only moves once the gesture ends
 * snaps, and stops feeling connected to the finger.
 */
export function usePager(count: number) {
  const ref = useAnimatedRef<Animated.ScrollView>()
  const scrollX = useSharedValue(0)
  const [index, setIndex] = useState(0)

  // Seeded from the window on native, exactly as RecipeForm's pager is. Starting
  // at 0 renders nothing until onLayout fires, which pushes the whole mount one
  // frame later and lands it on the screen transition. Web still starts at 0 —
  // the window isn't the container there, and there's no presentation animation
  // to protect.
  const [pageWidth, setPageWidth] = useState(
    Platform.OS === 'web' ? 0 : Dimensions.get('window').width
  )

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    // Authoritative: the form is a modal on iOS and a resizable window on web,
    // so the window width is a seed, never the answer.
    setPageWidth(event.nativeEvent.layout.width)
  }, [])

  const settle = useCallback((next: number) => {
    setIndex((current) => {
      if (current === next) return current
      selectionFeedback()
      return next
    })
  }, [])

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
    onMomentumEnd: (event) => {
      runOnJS(settle)(Math.round(event.contentOffset.x / Math.max(event.layoutMeasurement.width, 1)))
    },
    // Momentum never starts on a slow drag that lands on a page boundary, so
    // without this the index silently stops tracking after one lazy swipe.
    onEndDrag: (event) => {
      runOnJS(settle)(Math.round(event.contentOffset.x / Math.max(event.layoutMeasurement.width, 1)))
    },
  })

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0), count - 1)
      settle(clamped)
      ref.current?.scrollTo({ x: clamped * pageWidth, animated: true })
    },
    [count, pageWidth, ref, settle]
  )

  return { ref, scrollX, index, pageWidth, onLayout, scrollHandler, goTo }
}
