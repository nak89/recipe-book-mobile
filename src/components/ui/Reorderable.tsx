import { useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import type { LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'
import { useT } from '@/i18n'
import { dropIndex } from '@/lib/reorder'
import { dropFeedback, grabFeedback } from '@/lib/haptics'
import { sizes, spring, useMotion, useTheme } from '@/theme'

/**
 * A vertical list whose rows can be dragged into a new order.
 *
 * Built here rather than pulled in: the two lists that need it — a recipe's
 * ingredients and its method — sit inside a vertical scroller which is itself
 * inside the form's horizontal pager, and the usual drag libraries own their
 * own scroll container. This one owns nothing. It lays rows out in a plain
 * `View`, measures them, and moves them with transforms, so it drops into a
 * page that is already scrolling and paging.
 *
 * ## The gesture starts on the handle, and only there
 *
 * Every row here contains live `TextInput`s — an ingredient's name, a step's
 * instruction. A long-press anywhere on the row is the OS's own text-selection
 * gesture, so grabbing "the row" would mean fighting it. The `⋮⋮` handle is
 * the grab point instead: a `Pan` on it, claiming the gesture after 8px of
 * vertical travel, which is early enough to feel instant and late enough that
 * a tap is still a tap. `failOffsetX` hands a mostly-horizontal drag back, so
 * a finger that starts on a handle can still turn the page.
 *
 * ## Why the parent has to stop scrolling
 *
 * The rows live in a `ScrollView`, and a vertical drag is exactly what that
 * scroller is for. `onDragChange` fires on pickup and on drop so the page can
 * set `scrollEnabled` — one re-render at each end of the gesture, which is the
 * cheapest honest way to stop the list and the page moving at once.
 *
 * ## Heights are measured, not assumed
 *
 * Step cards are as tall as their instruction, so nothing here may assume a
 * row height. Each row records its own `y` and height on layout; the rows
 * between the grabbed one and its destination shift by the height the grabbed
 * row **vacated**, which is one number regardless of how tall any of them are.
 */
export default function Reorderable({
  ids,
  onReorder,
  onDragChange,
  renderItem,
  gap = 0,
}: {
  /** One stable id per row, in draw order. Length drives everything else. */
  ids: string[]
  onReorder: (from: number, to: number) => void
  /** Fired true on pickup and false on drop — lock the parent scroller with it. */
  onDragChange?: (dragging: boolean) => void
  /** `handle` is the grab target; place it inside the row wherever it belongs. */
  renderItem: (id: string, index: number, handle: ReactNode) => ReactNode
  /** The vertical gap between rows, so a shift clears the space as well as the row. */
  gap?: number
}) {
  const motion = useMotion()
  const { colors: c } = useTheme()
  const t = useT()
  // Layout, in the order the rows are drawn. Shared values rather than refs
  // because the gesture reads them on the UI thread; assigned whole, never
  // mutated in place, which is the only way a shared value sees a change.
  const tops = useSharedValue<number[]>([])
  const heights = useSharedValue<number[]>([])
  // -1 when nothing is being dragged. Every row's style keys off these three.
  const active = useSharedValue(-1)
  const target = useSharedValue(-1)
  const offset = useSharedValue(0)

  // Written from layout callbacks, which fire per row and out of order — the
  // shared value is replaced from this once, rather than rebuilt per callback.
  const measured = useRef<{ tops: number[]; heights: number[] }>({ tops: [], heights: [] })

  const publish = useCallback(() => {
    tops.value = [...measured.current.tops]
    heights.value = [...measured.current.heights]
  }, [tops, heights])

  const onRowLayout = (index: number) => (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout
    measured.current.tops[index] = y
    measured.current.heights[index] = height
    publish()
  }

  const begin = useCallback(() => {
    grabFeedback()
    onDragChange?.(true)
  }, [onDragChange])

  const finish = useCallback(
    (from: number, to: number) => {
      if (from !== to) {
        dropFeedback()
        onReorder(from, to)
      }
      onDragChange?.(false)
    },
    [onReorder, onDragChange]
  )

  return (
    <View style={gap ? { gap } : undefined}>
      {ids.map((id, index) => {
        const pan = Gesture.Pan()
          // Vertical travel only: 8px is past a tap and short of a scroll, and
          // a mostly-horizontal drag is released back to the pager.
          .activeOffsetY([-8, 8])
          .failOffsetX([-12, 12])
          .onStart(() => {
            active.value = index
            target.value = index
            offset.value = 0
            runOnJS(begin)()
          })
          .onUpdate((event) => {
            offset.value = event.translationY
            const top = tops.value[index] ?? 0
            const height = heights.value[index] ?? 0
            target.value = dropIndex(tops.value, top + height / 2 + event.translationY)
          })
          .onEnd(() => {
            runOnJS(finish)(index, target.value)
          })
          // Runs whether the gesture ended or was cancelled — a cancelled drag
          // still has to put the row back and unlock the scroller.
          .onFinalize(() => {
            active.value = -1
            target.value = -1
            offset.value = 0
          })

        // §16's `⋮⋮` — six dots in two columns, drawn rather than set as a
        // glyph so its weight comes from the palette instead of from whatever
        // face happens to cover U+22EE. Ink at .4 (`textPlaceholder`): present
        // when looked for, silent when not, which is the whole job of a handle
        // sitting beside content people are reading.
        const handle = (
          <GestureDetector gesture={pan}>
            {/* The only control on these rows with no text of its own, so it
                needs a name — a screen reader otherwise announces a button
                that could be anything. */}
            <View
              style={styles.handle}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={t('form.reorder')}
            >
              <View style={styles.handleColumns}>
                {[0, 1].map((column) => (
                  <View key={column} style={styles.handleColumn}>
                    {[0, 1, 2].map((dot) => (
                      <View
                        key={dot}
                        style={[styles.handleDot, { backgroundColor: c.textPlaceholder }]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </GestureDetector>
        )

        return (
          <Row
            key={id}
            index={index}
            active={active}
            target={target}
            offset={offset}
            heights={heights}
            gap={gap}
            reduced={motion.reduced}
            onLayout={onRowLayout(index)}
          >
            {renderItem(id, index, handle)}
          </Row>
        )
      })}
    </View>
  )
}

/**
 * One row's animated wrapper.
 *
 * Split out because `useAnimatedStyle` is a hook and the rows are a `.map` —
 * calling it inside the loop would break the rules of hooks the moment a row
 * is added or removed, which on these two lists is the common case.
 */
function Row({
  index,
  active,
  target,
  offset,
  heights,
  gap,
  reduced,
  onLayout,
  children,
}: {
  index: number
  active: SharedValue<number>
  target: SharedValue<number>
  offset: SharedValue<number>
  heights: SharedValue<number[]>
  gap: number
  reduced: boolean
  onLayout: (event: LayoutChangeEvent) => void
  children: ReactNode
}) {
  const style = useAnimatedStyle(() => {
    const from = active.value
    // Nothing is being dragged: every row sits exactly where it was laid out.
    if (from === -1) return { transform: [{ translateY: 0 }, { scale: 1 }], zIndex: 0, opacity: 1 }

    if (index === from) {
      return {
        // The finger's own translation, untouched — an eased or sprung value
        // here would put the row behind the finger it is following.
        transform: [{ translateY: offset.value }, { scale: reduced ? 1 : 1.02 }],
        // Above every other row, or a tall neighbour draws over the row you
        // are holding.
        zIndex: 10,
        opacity: 0.96,
      }
    }

    // The space the dragged row leaves behind: its own height plus the gap it
    // was sitting in. One number, whatever the rows around it are.
    const vacated = (heights.value[from] ?? 0) + gap
    const to = target.value
    let shift = 0
    if (to > from && index > from && index <= to) shift = -vacated
    if (to < from && index >= to && index < from) shift = vacated

    return {
      transform: [
        { translateY: reduced ? shift : withSpring(shift, spring.pressOut) },
        { scale: 1 },
      ],
      zIndex: 0,
      opacity: withTiming(1),
    }
  })

  return (
    <Animated.View onLayout={onLayout} style={style}>
      {children}
    </Animated.View>
  )
}

// No colours here: this stylesheet is built once at import, so a palette read
// at this level would be frozen in whichever theme happened to load first —
// the reason there is no flat `colors` export in the first place. The dots take
// their fill inline, from `useTheme()`.
const styles = StyleSheet.create({
  // Narrow, but `hitMin` tall and stretched to the row: the mark is 8pt wide
  // and would be a miserable target on its own, and a handle you have to aim
  // for is one people stop using.
  handle: {
    width: 26,
    minHeight: sizes.hitMin,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  handleColumns: { flexDirection: 'row', gap: 3 },
  handleColumn: { gap: 3 },
  handleDot: { width: 2, height: 2, borderRadius: 1 },
})
