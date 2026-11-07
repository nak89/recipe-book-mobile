import { useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { measure, scrollTo, useAnimatedStyle, useFrameCallback, useScrollOffset, useSharedValue } from 'react-native-reanimated'
import type { AnimatedRef, SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { dinnerDropTarget } from '@/lib/dinnerDraft'
import type { DinnerEntry } from '@/lib/dinnerDraft'
import { grabFeedback, dropFeedback } from '@/lib/haptics'
import { dinnerDrag, duration, radius, spacing, useMotion, useTheme } from '@/theme'

/** Dates stay in place; the lifted dish follows the finger on the UI thread. */
export default function DinnerDragList({ entries, disabled, scrollRef, contentHeight, onMove, onDragChange, renderHeader, renderDish }: {
  entries: DinnerEntry[]; disabled: boolean
  scrollRef: AnimatedRef<Animated.ScrollView>; contentHeight: SharedValue<number>
  onMove: (from: string, to: string) => void; onDragChange: (dragging: boolean) => void
  renderHeader: (entry: DinnerEntry) => ReactNode; renderDish: (entry: DinnerEntry) => ReactNode
}) {
  const { colors: c } = useTheme()
  const { reduced } = useMotion()
  const tops = useSharedValue<number[]>([]), heights = useSharedValue<number[]>([])
  const active = useSharedValue(-1), target = useSharedValue(-1)
  const dx = useSharedValue(0), dy = useSharedValue(0), pointerY = useSharedValue(0)
  const startScroll = useSharedValue(0)
  const scroll = useScrollOffset(scrollRef)
  const measured = useRef<{ tops: number[]; heights: number[] }>({ tops: [], heights: [] })
  const frames = useFrameCallback(frame => {
    const index = active.get()
    if (index < 0) return
    const viewport = measure(scrollRef)
    if (viewport) {
      const y = pointerY.get()
      const top = viewport.pageY + dinnerDrag.edge, bottom = viewport.pageY + viewport.height - dinnerDrag.edge
      const velocity = y < top ? -Math.min(1, (top - y) / dinnerDrag.edge) : y > bottom ? Math.min(1, (y - bottom) / dinnerDrag.edge) : 0
      if (velocity) {
        const next = scroll.get() + velocity * dinnerDrag.scrollSpeed * Math.min(frame.timeSincePreviousFrame ?? 16, 32) / 1000
        scrollTo(scrollRef, 0, Math.max(0, Math.min(contentHeight.get() - viewport.height, next)), false)
      }
    }
    const position = tops.get()[index] + heights.get()[index] / 2 + dy.get() + scroll.get() - startScroll.get()
    target.set(dinnerDropTarget(tops.get(), heights.get(), position))
  }, false)

  const begin = useCallback(() => { frames.setActive(true); grabFeedback(); onDragChange(true) }, [frames, onDragChange])
  const finish = useCallback((from: number, to: number) => {
    frames.setActive(false)
    if (to >= 0 && from !== to && entries[from] && entries[to]) { onMove(entries[from].date, entries[to].date); dropFeedback() }
    onDragChange(false)
  }, [entries, frames, onMove, onDragChange])
  useEffect(() => () => { frames.setActive(false); onDragChange(false) }, [frames, onDragChange])

  return <View style={styles.list}>
    {entries.map((entry, index) => {
      const pan = Gesture.Pan().enabled(!disabled && !!entry.recipeId).maxPointers(1).activateAfterLongPress(duration.dinnerDragHold)
        .onStart(event => {
          if (active.get() !== -1 || tops.get().filter(Number.isFinite).length !== entries.length) return
          active.set(index); target.set(index); dx.set(0); dy.set(0); pointerY.set(event.absoluteY); startScroll.set(scroll.get())
          scheduleOnRN(begin)
        })
        .onUpdate(event => {
          if (active.get() !== index) return
          dx.set(event.translationX); dy.set(event.translationY); pointerY.set(event.absoluteY)
          target.set(dinnerDropTarget(tops.get(), heights.get(), tops.get()[index] + heights.get()[index] / 2 + event.translationY + scroll.get() - startScroll.get()))
        })
        .onFinalize((_event, success) => {
          if (active.get() !== index) return
          const destination = success ? target.get() : -1
          active.set(-1); target.set(-1); dx.set(0); dy.set(0)
          scheduleOnRN(finish, index, destination)
        })
      return <DragRow key={entry.date} index={index} active={active} target={target} dx={dx} dy={dy} scroll={scroll} startScroll={startScroll}
        reduced={reduced} background={c.bg} highlight={c.accentPill} border={c.primary}
        onLayout={(y, height) => {
          measured.current.tops[index] = y; measured.current.heights[index] = height
          tops.set([...measured.current.tops]); heights.set([...measured.current.heights])
        }} header={renderHeader(entry)}>
        <GestureDetector gesture={pan}><Animated.View collapsable={false}>{renderDish(entry)}</Animated.View></GestureDetector>
      </DragRow>
    })}
  </View>
}

function DragRow({ index, active, target, dx, dy, scroll, startScroll, reduced, background, highlight, border, onLayout, header, children }: {
  index: number; active: SharedValue<number>; target: SharedValue<number>; dx: SharedValue<number>; dy: SharedValue<number>
  scroll: SharedValue<number>; startScroll: SharedValue<number>; reduced: boolean; background: string; highlight: string; border: string
  onLayout: (y: number, height: number) => void; header: ReactNode; children: ReactNode
}) {
  const layer = useAnimatedStyle(() => ({ zIndex: active.get() === index ? 10 : 0, backgroundColor: target.get() === index && active.get() !== index ? highlight : 'transparent' }))
  const lifted = useAnimatedStyle(() => {
    const held = active.get() === index
    return { backgroundColor: background, borderColor: held ? border : 'transparent', transform: [{ translateX: held ? dx.get() : 0 }, { translateY: held ? dy.get() + scroll.get() - startScroll.get() : 0 }, { scale: held && !reduced ? dinnerDrag.liftScale : 1 }] }
  })
  return <Animated.View onLayout={e => onLayout(e.nativeEvent.layout.y, e.nativeEvent.layout.height)} style={[styles.cell, layer]}>
    {header}
    <Animated.View style={[styles.dish, lifted]}>{children}</Animated.View>
  </Animated.View>
}
const styles = StyleSheet.create({
  list: { gap: spacing.md }, cell: { borderRadius: radius.thumb },
  dish: { borderRadius: radius.thumb, borderWidth: 1 },
})
