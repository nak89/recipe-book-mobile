import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing, type } from '@/theme'

export default function Chip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
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

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.primary },
  chipPressed: { backgroundColor: colors.surfaceAlt },
  text: { ...type.bodyStrong, color: colors.textMuted },
  textActive: { color: colors.onPrimary },
})
