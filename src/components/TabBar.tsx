import { Ionicons } from '@expo/vector-icons'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, hairline, radius, shadow, spacing } from '@/theme'

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', inactive: 'home-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
}

/**
 * Two destinations with a raised "+" between them. The "+" is deliberately not
 * a tab — it pushes the add-recipe modal on the parent stack — which keeps the
 * tab bar honest (every tab is a place you can be) while filling the gap that
 * makes a two-item bar look unfinished.
 */
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index
        const icons = ICONS[route.name] ?? ICONS.index

        const tab = (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              })
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name)
              }
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            style={styles.tab}
          >
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={24}
              color={focused ? colors.primary : colors.textPlaceholder}
            />
            <View style={[styles.indicator, focused && styles.indicatorActive]} />
          </Pressable>
        )

        // The add button gets a slot of its own, equal in width to each tab, so
        // it lands on the true centre of the bar. Nesting it beside a tab
        // instead pushes it left by half its own width.
        if (index === 0) {
          return [
            tab,
            <View key="add" style={styles.addSlot}>
              <Pressable
                onPress={() => router.push('/recipe/new')}
                accessibilityRole="button"
                accessibilityLabel="Add recipe"
                style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
              >
                <Ionicons name="add" size={28} color={colors.onPrimary} />
              </Pressable>
            </View>,
          ]
        }
        return tab
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  // Three equal-width slots: tab, add button, tab.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: hairline,
    borderTopColor: colors.border,
  },
  addSlot: { flex: 1, alignItems: 'center' },
  tab: { alignItems: 'center', gap: 5, flex: 1 },
  // A 3pt underline under the active tab, matching the reference's home icon.
  indicator: { width: 16, height: 3, borderRadius: radius.pill, backgroundColor: 'transparent' },
  indicatorActive: { backgroundColor: colors.primary },
  add: {
    width: 54,
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Lifts the button above the bar so it reads as the primary action.
    marginTop: -26,
    borderWidth: 4,
    borderColor: colors.bg,
    ...shadow.raised,
  },
  addPressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.96 }] },
})
