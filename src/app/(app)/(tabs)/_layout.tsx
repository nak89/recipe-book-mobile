import { View } from 'react-native'
import { WeekProvider } from '@/context/WeekContext'
import TabBar from '@/components/TabBar'
import ProgressiveBlurHeader from '@/components/ui/ProgressiveBlurHeader'
import { SwipeTabs } from '@/navigation/SwipeTabs'
import { useTheme } from '@/theme'

export default function TabsLayout() {
  const { colors: c } = useTheme()
  return (
    // `DockScrollProvider` used to wrap this, sharing one `hidden` value between
    // the screens that scrolled and the dock that got out of their way. Chronicle's
    // tab bar is solid paper that reserves its own space and never hides, so
    // there is nothing left to share.
    //
    // `WeekProvider` stays, and for an unrelated reason: the planner and the
    // grocery list are two views of one week, and each keeping its own would
    // hand you this week's shopping while you were planning next week's.
    <WeekProvider>
      {/* The blur band is mounted **here**, once, rather than on each of the
          four screens. All four run their scroller full-height and pad their
          content instead, so a recipe photograph travels up under the clock on
          every one of them; a copy per screen would be four chances for the
          band to drift, and it would also be re-created on every tab swipe.
          Sitting outside the pager it never moves with the pages. */}
      <View style={{ flex: 1 }}>
        <SwipeTabs tabBar={(props) => <TabBar {...props} />} sceneStyle={{ backgroundColor: c.bg }}>
          {/* Three destinations, and profile is deliberately not one of them — it
              sits in each screen's header instead. A tab is somewhere you can be
              and swipe between; settings is somewhere you go and come back from.
              These titles are English route labels, not UI copy — the bar reads
              its own translated strings from `tabs.*`.

              **Order is the navigator's, and Explore is first, so it is what the
              app opens onto** — Chronicle's own arrangement. Read left to right
              it is the journey a recipe takes: find it, keep it, plan it, shop
              for it. There is no `initialRouteName` anywhere; `TabRouter` lands on
              the first child, so moving a line here moves the landing tab. */}
          <SwipeTabs.Screen name="explore" options={{ title: 'Explore' }} />
          <SwipeTabs.Screen name="index" options={{ title: 'Recipes' }} />
          <SwipeTabs.Screen name="planner" options={{ title: 'Meal planner' }} />
          <SwipeTabs.Screen name="grocery" options={{ title: 'Grocery' }} />
        </SwipeTabs>
        <ProgressiveBlurHeader />
      </View>
    </WeekProvider>
  )
}
