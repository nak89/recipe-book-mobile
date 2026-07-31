import { Tabs } from 'expo-router'
import TabBar from '@/components/TabBar'
import { useTheme } from '@/theme'

export default function TabsLayout() {
  const { colors: c } = useTheme()
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
