import { useCallback, useEffect, useRef, useState } from 'react'
import { Image } from 'expo-image'
import { Pressable, StyleSheet, View } from 'react-native'
import type { LayoutChangeEvent } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedRef,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '@/components/ui/Text'
import { FilterIcon } from '@/components/ui/icons'
import type { GroceryDish } from '@/lib/api'
import { selectionFeedback } from '@/lib/haptics'
import { useNum, useT } from '@/i18n'
import { contentType, ease, duration, radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * The dish filter: `All dishes` and one chip per dish the week's plan was built
 * from, in a row that scrolls.
 *
 * **This is the one chip row in the app that scrolls rather than wraps**, and
 * the exception is deliberate. The rule exists because a horizontal scroller
 * cut `អាហារពេលល្ងាច` through the middle of a cluster on the Recipes index,
 * which reads as a rendering fault rather than as an affordance. Two things are
 * different here: the row is unbounded — a week can hold twenty-one dishes,
 * where the mealtime chips are four fixed options — and nothing is ever left
 * sliced, because the `+N` badge covers the right edge and every chip *fades*
 * out beneath it instead of being cut by it. That fade is the fix for the
 * failure the rule was written about, not a way around it.
 *
 * **The badge counts what is off the row, and it is the only thing that has to
 * be told in JS.** Everything else — the fade, the badge's own arrival, the
 * chips sliding out from under it — is interpolated from the scroll offset on
 * the UI thread, so a chip appears under your finger rather than after the
 * scroll settles. The count is read out of the same shared values through one
 * `useAnimatedReaction`, which re-renders only when the number itself changes.
 */

/** How far a chip travels out from under the badge as it is revealed. */
const REVEAL = 44
/** The badge's own gap from the chip it is covering. */
const BADGE_GAP = spacing.sm
/**
 * Trailing slack in the track, so the last chip can scroll out from under the
 * badge and the count can actually reach zero.
 *
 * It has to cover the badge's own width plus the gutter it sits in, and the
 * badge is a measured control (`+1` and `+12` are not the same width) — so this
 * is deliberately generous rather than exact. Being over is invisible: it is
 * scroll slack past the last chip. Being under leaves the badge parked on a
 * chip with nowhere left to scroll, reading `+1` forever.
 */
const TRAIL = 64
/** The design's chip thumbnail — a rounded square, not the ledger's 46pt tile. */
const THUMB = 18

export default function DishFilter({
  dishes,
  selected,
  onSelect,
}: {
  dishes: GroceryDish[]
  /** `null` is "All dishes", which is a real state rather than "nothing chosen". */
  selected: string | null
  onSelect: (dishId: string | null) => void
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()

  // `useAnimatedRef` rather than a plain one only because `Animated.ScrollView`
  // types its own ref; it is called from JS here, never from a worklet.
  const scrollRef = useAnimatedRef<Animated.ScrollView>()
  const scrollX = useSharedValue(0)
  const viewport = useSharedValue(0)
  const badgeWidth = useSharedValue(0)
  /**
   * Each chip's right edge in content coordinates, so it can be compared with
   * the scroll offset directly. A shared value rather than state: it is read on
   * every frame by the worklets below, and it changes only on layout.
   *
   * Written by replacing the array, never by mutating it in place — Reanimated
   * only notices the assignment.
   */
  const ends = useSharedValue<number[]>([])
  const measured = useRef<number[]>([])
  /** The count the badge draws. Shared for the fade, mirrored into state for the digits. */
  const hiddenCount = useSharedValue(0)
  const [hidden, setHidden] = useState(0)
  /**
   * The digits the badge draws, which lag `hidden` on the way down and only on
   * the way down. The badge fades out over 150ms when the count reaches zero,
   * and rendering the live count would spend that fade reading `+0` — a number
   * that is never true of anything.
   */
  const [badgeCount, setBadgeCount] = useState(0)
  useEffect(() => {
    if (hidden > 0) setBadgeCount(hidden)
  }, [hidden])

  /**
   * A week that loses a dish has to lose its measurement too. The array is
   * written by index from `onLayout`, and nothing fires a layout for a chip
   * that no longer exists — so a stale trailing entry would keep the badge
   * counting a chip that isn't there.
   */
  useEffect(() => {
    const count = dishes.length + 1
    if (measured.current.length <= count) return
    measured.current = measured.current.slice(0, count)
    ends.value = [...measured.current]
  }, [dishes.length, ends])

  const handleScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x
  })

  const onChipLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout
      // `x` is measured inside the content container, padding included, which
      // is the same space `contentOffset.x` is in. No gutter arithmetic needed.
      measured.current[index] = x + width
      ends.value = [...measured.current]
    },
    [ends]
  )

  /**
   * The first chip the badge is standing in front of, and where the row would
   * have to sit for it to clear. Both are worklet-free so the press handler can
   * use them; the numbers come off shared values, which are readable from JS.
   */
  function revealNext() {
    const edge = viewport.value - spacing.gutter - badgeWidth.value - BADGE_GAP
    const next = ends.value.find((end) => end > scrollX.value + edge + 0.5)
    if (next === undefined) return
    selectionFeedback()
    scrollRef.current?.scrollTo({ x: next - edge, animated: true })
  }

  useAnimatedReaction(
    () => {
      const edge =
        scrollX.value + viewport.value - spacing.gutter - badgeWidth.value - BADGE_GAP
      // Half a point of slack: a chip whose edge lands exactly on the boundary
      // is visible, and float arithmetic should not be allowed to disagree.
      return ends.value.filter((end) => end > edge + 0.5).length
    },
    (count, previous) => {
      if (count === previous) return
      hiddenCount.value = count
      runOnJS(setHidden)(count)
    }
  )

  const badgeStyle = useAnimatedStyle(() => {
    const shown = hiddenCount.value > 0 ? 1 : 0
    const timing = { duration: duration.state, easing: ease.outCubic }
    return {
      opacity: withTiming(shown, timing),
      transform: [{ scale: withTiming(shown ? 1 : 0.86, timing) }],
    }
  })

  return (
    <View style={styles.row} accessibilityLabel={t('grocery.filterByDish')}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={(event) => {
          viewport.value = event.nativeEvent.layout.width
        }}
        contentContainerStyle={styles.track}
      >
        <DishChip
          index={0}
          label={t('grocery.allDishes')}
          active={selected === null}
          icon={<FilterIcon color={selected === null ? c.onPrimary : c.textMuted} />}
          onPress={() => onSelect(null)}
          onChipLayout={onChipLayout}
          scrollX={scrollX}
          viewport={viewport}
          badgeWidth={badgeWidth}
          ends={ends}
        />
        {dishes.map((dish, i) => (
          <DishChip
            key={dish.id}
            index={i + 1}
            label={dish.title}
            active={selected === dish.id}
            photoUrl={dish.photoUrl}
            onPress={() => onSelect(dish.id)}
            onChipLayout={onChipLayout}
            scrollX={scrollX}
            viewport={viewport}
            badgeWidth={badgeWidth}
            ends={ends}
          />
        ))}
      </Animated.ScrollView>

      {/* Over the scroller, not in it. The gradient is what turns the row's
          right edge from a cut into a fade — the chips pass under it. */}
      <View style={styles.overflow} pointerEvents="box-none">
        <LinearGradient
          colors={[c.bgNone, c.bg]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.fade}
          pointerEvents="none"
        />
        <Animated.View style={badgeStyle}>
          <Pressable
            onPress={revealNext}
            // Nothing to reveal means nothing to press: the badge is invisible
            // at zero, and an invisible target that still takes a tap is worse
            // than one that doesn't exist.
            disabled={hidden === 0}
            accessibilityRole="button"
            accessibilityLabel={t('grocery.moreDishes').replace('{n}', String(hidden))}
            // Not focusable while it is fading out — a screen reader should not
            // land on a control that is on its way off the row.
            accessibilityElementsHidden={hidden === 0}
            importantForAccessibility={hidden === 0 ? 'no-hide-descendants' : 'auto'}
            onLayout={(event) => {
              badgeWidth.value = event.nativeEvent.layout.width
            }}
            style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
          >
            <Text style={styles.badgeLabel}>+{n(badgeCount)}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  )
}

/**
 * One chip, which knows how far out from under the badge it has come.
 *
 * The interpolation lives per chip rather than in a parent style, because each
 * one crosses the badge at its own moment — the row is not a pager and its
 * chips are not a fixed width.
 */
function DishChip({
  index,
  label,
  active,
  icon,
  photoUrl,
  onPress,
  onChipLayout,
  scrollX,
  viewport,
  badgeWidth,
  ends,
}: {
  index: number
  label: string
  active: boolean
  icon?: React.ReactNode
  photoUrl?: string | null
  onPress: () => void
  onChipLayout: (index: number, event: LayoutChangeEvent) => void
  scrollX: ReturnType<typeof useSharedValue<number>>
  viewport: ReturnType<typeof useSharedValue<number>>
  badgeWidth: ReturnType<typeof useSharedValue<number>>
  ends: ReturnType<typeof useSharedValue<number[]>>
}) {
  const styles = useThemedStyles(makeStyles)

  const revealStyle = useAnimatedStyle(() => {
    const end = ends.value[index]
    // Before layout there is nothing to interpolate against, so the chip is
    // fully drawn: a chip that defaulted to hidden would flash on its first
    // frame. The same three properties come back either way — an animated style
    // that changes which keys it sets is a Reanimated warning, not a shortcut.
    const edge =
      scrollX.value + viewport.value - spacing.gutter - badgeWidth.value - BADGE_GAP
    const unmeasured = end === undefined || viewport.value === 0
    const p = unmeasured ? 1 : Math.min(1, Math.max(0, 1 - (end - edge) / REVEAL))
    return {
      opacity: 0.1 + 0.9 * p,
      transform: [{ translateX: (1 - p) * 10 }, { scale: 0.94 + 0.06 * p }],
    }
  })

  return (
    <Animated.View onLayout={(event) => onChipLayout(index, event)} style={revealStyle}>
      <Pressable
        onPress={() => {
          if (!active) selectionFeedback()
          onPress()
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={({ pressed }) => [
          styles.chip,
          active && styles.chipActive,
          pressed && !active && styles.chipPressed,
        ]}
      >
        {icon}
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.thumb} contentFit="cover" />
        ) : (
          // A dish always has a photo — the API refuses a recipe without one —
          // but the chip is drawn from a browse payload, so the placeholder is
          // here for the frame before it decodes rather than for a missing file.
          !icon && <View style={[styles.thumb, styles.thumbEmpty]} />
        )}
        {/* The title is the user's own text, so its face comes from the string
            rather than from the interface's language — a Latin recipe title in
            a Khmer UI must not be set in Moul. */}
        <Text
          style={[contentType('body', label), styles.chipLabel, active && styles.chipLabelActive]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  row: { justifyContent: 'center' },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.gutter,
    paddingRight: spacing.gutter + TRAIL,
  },

  // Chronicle's chip, plus the room a thumbnail needs. The left padding is
  // tighter than `Chip`'s 15 when something is drawn before the label, since
  // the thumbnail supplies the optical margin itself.
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    paddingLeft: 10,
    paddingRight: 15,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.borderStrong,
    minHeight: 34,
    maxWidth: 190,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipPressed: { backgroundColor: c.accentPill },
  chipLabel: { color: c.textMuted, flexShrink: 1 },
  chipLabelActive: { color: c.onPrimary },

  thumb: { width: THUMB, height: THUMB, borderRadius: 5, backgroundColor: c.surfaceSunken },
  thumbEmpty: { borderWidth: 1, borderColor: c.border },

  overflow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.gutter,
  },
  // Wide enough to swallow a chip's leading edge, so nothing is ever seen half
  // drawn — the reason this row is allowed to scroll at all.
  fade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 96 },
  badge: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.borderStrong,
    minHeight: 34,
    justifyContent: 'center',
    backgroundColor: c.bg,
  },
  badgeLabel: { ...type.metadata, color: c.textMuted },
  pressed: { opacity: 0.7 },
})
