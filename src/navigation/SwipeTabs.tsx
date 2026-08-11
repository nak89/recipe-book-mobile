import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  createNavigatorFactory,
  TabActions,
  TabRouter,
  useNavigationBuilder,
} from '@react-navigation/native'
import type {
  DefaultNavigatorOptions,
  Descriptor,
  NavigationHelpers,
  NavigationProp,
  ParamListBase,
  RouteProp,
  TabActionHelpers,
  TabNavigationState,
  TabRouterOptions,
} from '@react-navigation/native'
import { withLayoutContext } from 'expo-router'
import { Dimensions, Platform, StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated'

/**
 * A bottom-tab navigator whose scenes live side by side in a horizontal pager,
 * so you can swipe between them.
 *
 * **Why this exists rather than `@react-navigation/material-top-tabs`**, which
 * is the usual answer for swipeable tabs: that navigator is built on
 * `react-native-pager-view`, which ships no web implementation at all (v6.9.1
 * contains zero `.web.` files). This app runs on web. It's the same trade the
 * recipe wizard already made, and the same resolution — a plain paging
 * `ScrollView` behaves identically on iOS, Android and web.
 *
 * **Why a navigator rather than a pager inside one screen**: keeping `TabRouter`
 * means the two tabs stay real routes. `/profile` still resolves, `useFocusEffect`
 * still fires on tab change, and the browser URL still tracks the tab. Rendering
 * both screens inside a single route would quietly take all three away.
 */

export type SwipeTabsNavigationOptions = {
  title?: string
}

export type SwipeTabsEventMap = {
  tabPress: { data: undefined; canPreventDefault: true }
}

/**
 * Exported so a screen can reach `tabPress` — `useNavigation()` alone resolves
 * to the generic prop, which doesn't know this navigator's event map.
 */
export type SwipeTabsNavigationProp = NavigationProp<
  ParamListBase,
  string,
  undefined,
  TabNavigationState<ParamListBase>,
  SwipeTabsNavigationOptions,
  SwipeTabsEventMap
>

/** What the `tabBar` render prop receives — bottom-tabs' shape, plus the pager. */
export type SwipeTabBarProps = {
  state: TabNavigationState<ParamListBase>
  navigation: NavigationHelpers<ParamListBase, SwipeTabsEventMap>
  descriptors: Record<
    string,
    Descriptor<SwipeTabsNavigationOptions, SwipeTabsNavigationProp, RouteProp<ParamListBase>>
  >
  /**
   * Live horizontal offset of the pager, in pixels, on the UI thread. Exposed so
   * the bar can show where the pages *are* rather than where they last landed —
   * a selection indicator that only moves on settle can't track a finger.
   */
  scrollX: SharedValue<number>
  /** Width of one page; 0 until measured. `scrollX / pageWidth` is the page index. */
  pageWidth: number
  /**
   * The pager itself, so a worklet can drive it with reanimated's `scrollTo`.
   * That's what lets the bar be dragged without the pages lagging a frame
   * behind the finger while the round trip through JS completes.
   */
  pagerRef: AnimatedRef<Animated.ScrollView>
}

type SwipeTabsProps = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  SwipeTabsNavigationOptions,
  SwipeTabsEventMap,
  SwipeTabsNavigationProp
> &
  TabRouterOptions & {
    tabBar: (props: SwipeTabBarProps) => ReactNode
    sceneStyle?: StyleProp<ViewStyle>
  }

function SwipeTabsNavigator({
  id,
  initialRouteName,
  backBehavior,
  children,
  layout,
  screenListeners,
  screenOptions,
  tabBar,
  sceneStyle,
}: SwipeTabsProps) {
  const { state, descriptors, navigation, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    SwipeTabsNavigationOptions,
    SwipeTabsEventMap
  >(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    children,
    layout,
    screenListeners,
    screenOptions,
  })

  // An *animated* ref, so the tab bar's drag can call reanimated's `scrollTo`
  // from inside a worklet and move the pages without a trip through JS.
  const pagerRef = useAnimatedRef<Animated.ScrollView>()
  const scrollX = useSharedValue(0)
  // Seeded on native so the first frame isn't empty; `onLayout` is still the
  // authority. Web starts at 0 because the window is not the container there.
  const [width, setWidth] = useState(
    Platform.OS === 'web' ? 0 : Dimensions.get('window').width
  )
  const lastWidth = useRef(width)

  // Follows the router. A tab press animates across; a width change (rotation,
  // a resized browser window) has to snap, or the pager rubber-bands sideways
  // for no reason the user can connect to what they just did. After a swipe
  // this fires too, but the pager is already at that offset, so it's a no-op.
  useEffect(() => {
    const resized = lastWidth.current !== width
    lastWidth.current = width
    if (width === 0) return
    pagerRef.current?.scrollTo({ x: state.index * width, animated: !resized })
  }, [state.index, width, pagerRef])

  /**
   * A swipe finished — tell the router where we ended up.
   *
   * Called from the UI thread via `runOnJS`, and wired to both momentum end and
   * drag end: react-native-web synthesises momentum events from scroll timing
   * rather than reporting them natively, so relying on momentum alone leaves the
   * URL stale after a trackpad swipe. Rounding means a drag that ends short of
   * the threshold resolves to the page it started on and dispatches nothing.
   */
  function onSettled(offsetX: number) {
    if (width === 0) return
    const index = Math.round(offsetX / width)
    const route = state.routes[index]
    if (!route || index === state.index) return
    navigation.dispatch({ ...TabActions.jumpTo(route.name), target: state.key })
  }

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
    onMomentumEnd: (event) => {
      runOnJS(onSettled)(event.contentOffset.x)
    },
    onEndDrag: (event) => {
      runOnJS(onSettled)(event.contentOffset.x)
    },
  })

  return (
    <NavigationContent>
      <View style={styles.container}>
        <Animated.ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          {width > 0 &&
            state.routes.map((route) => (
              // Both scenes stay mounted — there are two of them, and a pager
              // has to have something to reveal as your finger moves. They are
              // rendered, not focused: focus still comes from the router, so
              // `useFocusEffect` fires on tab change exactly as before.
              <View key={route.key} style={[styles.scene, { width }, sceneStyle]}>
                {descriptors[route.key].render()}
              </View>
            ))}
        </Animated.ScrollView>
        {tabBar({ state, navigation, descriptors, scrollX, pageWidth: width, pagerRef })}
      </View>
    </NavigationContent>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scene: { flex: 1 },
})

const createSwipeTabsNavigator = createNavigatorFactory(SwipeTabsNavigator)

export const SwipeTabs = withLayoutContext<
  SwipeTabsNavigationOptions,
  typeof SwipeTabsNavigator,
  TabNavigationState<ParamListBase>,
  SwipeTabsEventMap
>(createSwipeTabsNavigator().Navigator)
