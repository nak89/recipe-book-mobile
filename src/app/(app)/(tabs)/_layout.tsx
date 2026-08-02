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
        <SwipeTabs.Screen name="index" options={{ title: 'Home' }} />
        <SwipeTabs.Screen name="profile" options={{ title: 'Profile' }} />
      </SwipeTabs>
    </DockScrollProvider>
  )
}
