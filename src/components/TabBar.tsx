import { useEffect, useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  scrollTo,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDockHidden } from '@/components/dock/DockScroll'
import GlassSurface from '@/components/ui/GlassSurface'
import type { SwipeTabBarProps } from '@/navigation/SwipeTabs'
import { hairline, shadow, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'
import { useT } from '@/i18n'

const ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  index: { active: 'home', inactive: 'home-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
}

/** Height of the tab pill. */
export const DOCK_HEIGHT = 58

/** The add button, sized independently — it shares no edge with the pill. */
const ADD_SIZE = 56

/** Padding between the pill's edge and the sliding capsule inside it. */
const CAPSULE_INSET = 5

/**
 * Concentric radii. The capsule's corners are the pill's corners minus the gap
 * between them, which is what makes the two curves parallel instead of merely
 * both-round — the same rule hardware uses for a screen inside a bezel. Getting
 * this wrong is subtle and reads as "slightly cheap" without being nameable.
 */
const PILL_RADIUS = DOCK_HEIGHT / 2
const CAPSULE_RADIUS = PILL_RADIUS - CAPSULE_INSET

const PRESS_IN = { duration: 90 }
const PRESS_OUT = { damping: 9, stiffness: 380, mass: 0.4 }
const REVEAL = { damping: 18, stiffness: 260, mass: 0.5 }

function clamp(value: number, min: number, max: number) {
  'worklet'
  return Math.min(Math.max(value, min), max)
}

/**
 * Two separate floating things: a glass pill holding the destinations, and the
 * add button riding above its right end.
 *
 * The add button is **not a tab** and never was — it opens a modal rather than
 * going anywhere, and a tab bar is only honest if every tab is a place you can
 * be. It doesn't share a row, a baseline or a height with the pill: sitting
 * *above* it rather than beside it is what stops the two reading as one control
 * with an odd gap.
 *
 * Everything that moves here runs on the UI thread — the capsule follows the
 * pager, the dock follows the scroll position, and the icons follow a press —
 * so none of it can be stalled by whatever React is doing at the time.
 */
export default function TabBar({
  state,
  navigation,
  scrollX,
  pageWidth,
  pagerRef,
}: SwipeTabBarProps) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const hidden = useDockHidden()

  const count = state.routes.length
  const [pillWidth, setPillWidth] = useState(0)
  const tabWidth = pillWidth === 0 ? 0 : (pillWidth - CAPSULE_INSET * 2) / count
  const maxScrollX = pageWidth * (count - 1)
  const bottomInset = Math.max(insets.bottom, spacing.md)

  // Arriving somewhere new always shows the dock. Otherwise you scroll down on
  // the dashboard, swipe to the profile, and land on a screen with no visible
  // way off it until you happen to scroll up.
  useEffect(() => {
    hidden.value = withSpring(0, REVEAL)
  }, [state.index, hidden])

  // The capsule is a scaled-down picture of the pager: one tab-width of travel
  // for every page-width the pages move. Reading the live offset rather than
  // `state.index` is what makes it track a finger mid-swipe instead of snapping
  // when the gesture ends.
  const capsuleStyle = useAnimatedStyle(() => {
    const page = pageWidth > 0 ? scrollX.value / pageWidth : 0
    return { transform: [{ translateX: clamp(page, 0, count - 1) * tabWidth }] }
  })

  // Slides the whole dock out of the way, shrinking slightly as it goes so it
  // reads as receding rather than as a panel being cut off by the screen edge.
  const travel = ADD_SIZE + spacing.md + DOCK_HEIGHT + bottomInset
  const dockStyle = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value * 0.35,
    transform: [{ translateY: hidden.value * travel }, { scale: 1 - hidden.value * 0.06 }],
  }))

  // Where the pager sat when the drag began, and the router's index kept where
  // a worklet can see it — `state.index` is a JS value the UI thread can't read.
  const dragOrigin = useSharedValue(0)
  const currentIndex = useSharedValue(state.index)
  useEffect(() => {
    currentIndex.value = state.index
  }, [state.index, currentIndex])

  function commit(index: number) {
    const route = state.routes[index]
    if (route && index !== state.index) navigation.navigate(route.name)
  }

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // Claimed only after real sideways travel, so a tap still reaches the
        // button underneath and a vertical swipe is left to the list below.
        .activeOffsetX([-6, 6])
        .failOffsetY([-14, 14])
        .onBegin(() => {
          dragOrigin.value = currentIndex.value * pageWidth
        })
        .onUpdate((event) => {
          if (tabWidth === 0) return
          const offset = dragOrigin.value + (event.translationX / tabWidth) * pageWidth
          // Drives the pages from the UI thread. The capsule is driven by the
          // pager's own offset, so it follows for free and the two can't drift.
          scrollTo(pagerRef, clamp(offset, 0, maxScrollX), 0, false)
        })
        .onEnd((event) => {
          if (tabWidth === 0) return
          const offset = dragOrigin.value + (event.translationX / tabWidth) * pageWidth
          const landed = clamp(
            Math.round(clamp(offset, 0, maxScrollX) / Math.max(pageWidth, 1)),
            0,
            count - 1
          )
          // Animate home first, then tell the router: the state change
          // re-renders both scenes, and doing that first would drop the work on
          // the animation's opening frames.
          scrollTo(pagerRef, landed * pageWidth, 0, true)
          runOnJS(commit)(landed)
        }),
    // `commit` closes over `state`, so the gesture is rebuilt when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, currentIndex, dragOrigin, maxScrollX, pageWidth, pagerRef, tabWidth, state, navigation]
  )

  return (
    <Animated.View
      // box-none, so the gap between the pill and the button isn't a dead strip
      // laid over the content scrolling underneath.
      pointerEvents="box-none"
      style={[styles.dock, { paddingBottom: bottomInset }, dockStyle]}
    >
      <DockButton
        accessibilityLabel={t('tabs.addRecipe')}
        style={styles.add}
        onPress={() => router.push('/recipe/new')}
      >
        <Ionicons name="add" size={28} color={c.onPrimary} />
      </DockButton>

      <GestureDetector gesture={pan}>
        <Animated.View style={styles.pillWrap}>
          <GlassSurface
            style={styles.pill}
            onLayout={(event) => setPillWidth(event.nativeEvent.layout.width)}
          >
            {tabWidth > 0 && (
              <Animated.View
                // Decoration — it must never intercept a tap meant for the tab
                // it is sitting on.
                pointerEvents="none"
                style={[styles.capsule, { width: tabWidth }, capsuleStyle]}
              />
            )}

            {state.routes.map((route, index) => {
              const focused = state.index === index
              const icons = ICONS[route.name] ?? ICONS.index

              return (
                <DockButton
                  key={route.key}
                  accessibilityLabel={route.name === 'profile' ? t('tabs.profile') : t('tabs.home')}
                  selected={focused}
                  style={styles.tab}
                  onPress={() => {
                    const event = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    })
                    if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
                  }}
                >
                  <Ionicons
                    name={focused ? icons.active : icons.inactive}
                    size={24}
                    // The unselected icon can't use `textPlaceholder` here the
                    // way it would on a solid surface: the pill takes its
                    // colour from whatever scrolls under it, so the contrast
                    // isn't fixed. See `onGlassMuted`.
                    color={focused ? c.text : c.onGlassMuted}
                  />
                </DockButton>
              )
            })}
          </GlassSurface>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  )
}

/**
 * A pressable that dips under the finger and springs back.
 *
 * Its own component because each one needs its own shared value — a single
 * value shared across the dock would scale every icon at once. The scale sits
 * on an inner view rather than the Pressable so the touch target keeps its full
 * size while the thing you can see shrinks.
 */
function DockButton({
  children,
  onPress,
  style,
  selected,
  accessibilityLabel,
}: {
  children: React.ReactNode
  onPress: () => void
  style?: object
  selected?: boolean
  accessibilityLabel: string
}) {
  const scale = useSharedValue(1)
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(0.88, PRESS_IN)
      }}
      onPressOut={() => {
        scale.value = withSpring(1, PRESS_OUT)
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={style}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  // A column, not a row: the button stacks above the pill rather than sharing
  // its line.
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pillWrap: { alignSelf: 'stretch' },
  pill: {
    height: DOCK_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    padding: CAPSULE_INSET,
    borderRadius: PILL_RADIUS,
    // Clips the blur to the pill. Without it the blur stays a rectangle and the
    // rounded corners frame a hard square of frosted background.
    overflow: 'hidden',
    borderWidth: hairline,
    borderColor: c.glassBorder,
    ...shadow.floating,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  // The sliding selection. Absolute and inset by the pill's own padding, so its
  // travel is exactly `tabWidth` per page and its ends line up with the pill's.
  capsule: {
    position: 'absolute',
    left: CAPSULE_INSET,
    top: CAPSULE_INSET,
    bottom: CAPSULE_INSET,
    borderRadius: CAPSULE_RADIUS,
    backgroundColor: c.glassHighlight,
  },
  // Solid rather than glass. This is the app's primary action, and glass on
  // glass would make it one more piece of chrome instead of the thing you came
  // to press. `alignSelf` is what puts it on the right without a spacer.
  add: {
    alignSelf: 'flex-end',
    width: ADD_SIZE,
    height: ADD_SIZE,
    borderRadius: ADD_SIZE / 2,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.floating,
  },
})

/**
 * How much room a scrolling screen has to leave at the bottom so its last row
 * doesn't finish underneath the dock. The dock floats over the content on
 * purpose — that's what gives the glass something to refract — so nothing
 * reserves this space automatically the way a docked tab bar used to.
 */
export function useDockClearance() {
  const insets = useSafeAreaInsets()
  return DOCK_HEIGHT + Math.max(insets.bottom, spacing.md) + spacing.md
}
