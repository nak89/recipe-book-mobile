import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { ReactNode } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BasketIcon, BookIcon, CalendarIcon, MagnifierIcon } from '@/components/ui/icons'
import { useGroceryOutstanding } from '@/lib/groceryBadge'
import type { SwipeTabBarProps } from '@/navigation/SwipeTabs'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n/strings'

/**
 * Chronicle's own hairline constructions, at 1.4px — see `ui/icons.tsx`.
 *
 * There is no filled variant to switch to on selection, and that is by design
 * rather than a limitation. The old bar used filled-vs-outline as one of three
 * "selected" cues alongside a sliding capsule and a colour change; Chronicle
 * states two, the tamarind pill and tamarind ink. A solid glyph would also be
 * the heaviest mark on a page whose entire visual system is 1–1.5px rules.
 */
const ICONS: Record<string, (props: { color: string }) => ReactNode> = {
  // A magnifier rather than a compass or a globe: Explore's own surface leads
  // with a search field, and the glyph should name what the tab does rather
  // than gesture at the idea of discovery.
  explore: MagnifierIcon,
  index: BookIcon,
  planner: CalendarIcon,
  grocery: BasketIcon,
}

/**
 * Keyed by route name for the same reason `ICONS` is: an earlier version was a
 * ternary on `route.name === 'profile'`, which quietly labelled every tab that
 * wasn't profile as "Home". A third destination would have inherited that.
 */
const LABEL_KEYS: Record<string, StringKey> = {
  explore: 'tabs.explore',
  index: 'tabs.recipes',
  planner: 'tabs.planner',
  grocery: 'tabs.grocery',
}

/**
 * The bar's own height, before the home-indicator inset.
 *
 * Chronicle specifies 88px `box-sizing: border-box` at a 390×844 frame that
 * draws no home indicator. On a modern iPhone the bottom inset is ~34, so 54 of
 * content plus that inset lands on 88 exactly; on hardware with no inset the
 * bar holds 54 plus the `spacing.md` floor. Treating the 88 as content *plus*
 * inset would have produced a 122pt bar.
 */
const BAR_CONTENT_HEIGHT = 54

/**
 * The bottom navigation: three destinations on solid paper, under a single ink
 * rule.
 *
 * This replaced a floating frosted-glass pill that hid on scroll, carried a
 * capsule sliding under your finger, and had a green "+" riding above its right
 * end. All of that went with the direction rather than being simplified away —
 * Chronicle is a printed page, its motion section allows four transitions in the
 * entire product ("the paper does not bounce"), and a bar that floats is a bar
 * pretending to be glass over something that is pretending to be paper.
 *
 * What survives is the **swipe between tabs**, which lives in `SwipeTabs` rather
 * than here. That is a way of moving around the app, not decoration, and it is
 * also what keeps each tab a real address so `/planner` still resolves in a
 * browser. What went with the capsule is the *bar's own drag* — it existed to
 * push the capsule, and there is no longer a capsule to push.
 *
 * The bar is a normal sibling of the pager in a column, so it **reserves its own
 * space**. Screens no longer pad around it, which is why `useDockClearance` is
 * gone: it existed only because the old dock floated over content.
 *
 * **It holds destinations and nothing else.** A transitional "+" rode above its
 * right end while the mastheads were being built; both mastheads now carry
 * their own actions ("+" on the Recipes index, share and "+" on Market), so it
 * is gone. A tab bar is only honest if every item in it is a place you can be,
 * and a button that opens a modal is not a place.
 *
 * All **four** of Chronicle's destinations are here — Explore · Recipes · Week ·
 * Market — in that order, and Explore lands first because it is the first child
 * (`SwipeTabs` sets no `initialRouteName`, so `TabRouter` takes the first one).
 * Read left to right they are the journey a recipe takes: find it, keep it, plan
 * it, shop for it.
 */
export default function TabBar({ state, navigation }: SwipeTabBarProps) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const insets = useSafeAreaInsets()
  const outstanding = useGroceryOutstanding()

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={
              route.name === 'grocery' && outstanding > 0
                ? // Spoken aloud, so it follows the numeral rule like anything
                  // else on screen — a screen reader is not an exception to it.
                  `${t('tabs.grocery')}, ${t('grocery.stillToBuy').replace('{n}', n(outstanding))}`
                : t(LABEL_KEYS[route.name] ?? 'tabs.recipes')
            }
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
            <View style={[styles.pill, focused && styles.pillActive]}>
              <View style={styles.glyph}>
                {(ICONS[route.name] ?? ICONS.index)({
                  color: focused ? c.primary : c.inactive,
                })}
                {/* A "still to buy" dot, drawn rather than counted — a number at
                    this size is unreadable, and the count is already spoken in
                    the tab's accessible name above. */}
                {route.name === 'grocery' && outstanding > 0 && <View style={styles.badge} />}
              </View>
              {/* A tighter clamp than the app-wide one, and the dock is the
                  case that earns an override: it is four fixed columns of a
                  fixed-height bar, so a label has nowhere to grow and its only
                  failure is the ellipsis. `Text`'s size-aware default would
                  give a 9.5pt label the full 1.35× (34/9.5 is way past the
                  cap), which overruns a 320pt phone's ~64pt column. 1.15 is
                  what "PLANNER" and គ្រោងអាហារ both still fit at. The tab's
                  accessible name is unaffected — a screen reader reads the
                  string, not the box. */}
              <Text
                style={[styles.label, focused && styles.labelActive]}
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
              >
                {t(LABEL_KEYS[route.name] ?? 'tabs.recipes')}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: c.bg,
      // A single 1.5px ink rule, full width — the same weight as a masthead's,
      // so the two pieces of chrome read as the same material. Not a hairline:
      // the design states 1.5 and it is the strongest rule in the system.
      borderTopWidth: 1.5,
      borderTopColor: c.text,
      paddingTop: 9,
    },
    tab: { flex: 1, minHeight: BAR_CONTENT_HEIGHT },
    pill: {
      alignItems: 'center',
      // The design's own `gap: 7`, which is off the spacing scale and stays a
      // literal for that reason — it is a measurement of this control, not a
      // step someone should pick from.
      gap: 7,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.card,
    },
    pillActive: { backgroundColor: c.accentPill },
    // The three icons have different natural heights (15, 16, 20), so they are
    // centred in a common box — otherwise the labels sit at three different
    // baselines across the bar.
    glyph: { height: 20, alignItems: 'center', justifyContent: 'center' },
    label: { ...type.tabLabel, color: c.inactive, textTransform: 'uppercase' },
    // Tamarind, and paired with the pill rather than carrying "selected" alone.
    // Chronicle names both cues; the colour on its own would be doing too much.
    labelActive: { color: c.primary },
    badge: {
      position: 'absolute',
      top: -1,
      right: -3,
      width: 7,
      height: 7,
      borderRadius: '50%',
      backgroundColor: c.primary,
    },
  })
