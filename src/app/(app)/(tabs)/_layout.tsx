import { DockScrollProvider } from '@/components/dock/DockScroll'
import TabBar from '@/components/TabBar'
import { SwipeTabs } from '@/navigation/SwipeTabs'
import { useTheme } from '@/theme'

export default function TabsLayout() {
  const { colors: c } = useTheme()
  return (
    // Above the navigator, so both the screens that drive the dock's hide/show
    // and the dock that obeys it are reading the same shared value.
    <DockScrollProvider>
      <SwipeTabs
        tabBar={(props) => <TabBar {...props} />}
        sceneStyle={{ backgroundColor: c.bg }}
      >
        {/* Two destinations, and profile is deliberately not one of them — it
            sits in each screen's header instead. A tab is somewhere you can be
            and swipe between; settings is somewhere you go and come back from.
            These titles are English route labels, not UI copy — the dock reads
            its own translated strings from `tabs.*`. */}
        <SwipeTabs.Screen name="index" options={{ title: 'Recipes' }} />
        <SwipeTabs.Screen name="planner" options={{ title: 'Meal planner' }} />
      </SwipeTabs>
    </DockScrollProvider>
  )
}
