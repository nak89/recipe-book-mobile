import { Pressable, StyleSheet, Text } from 'react-native'
import { radius, spacing, type, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'

export default function Chip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !active && styles.chipPressed,
      ]}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  chipActive: { backgroundColor: c.primary },
  chipPressed: { backgroundColor: c.surfaceAlt },
  text: { ...type.bodyStrong, color: c.textMuted },
  textActive: { color: c.onPrimary },
})
