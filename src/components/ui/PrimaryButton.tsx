import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { colors, radius, spacing, type } from '@/theme'

export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'solid',
  style,
}: {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'solid' | 'outline' | 'danger'
  style?: StyleProp<ViewStyle>
}) {
  const inactive = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && styles.solid,
        variant === 'outline' && styles.outline,
        variant === 'danger' && styles.danger,
        pressed && !inactive && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'solid' ? colors.onPrimary : colors.text} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'solid' && styles.labelSolid,
            variant === 'danger' && styles.labelDanger,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  solid: { backgroundColor: colors.primary },
  outline: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  danger: { backgroundColor: colors.dangerSoft },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.5 },
  label: { ...type.bodyStrong, fontSize: 16, color: colors.text },
  labelSolid: { color: colors.onPrimary },
  labelDanger: { color: colors.danger },
})
