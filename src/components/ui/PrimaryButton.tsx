import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

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
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
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
        <ActivityIndicator color={variant === 'solid' ? c.onPrimary : c.text} />
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

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  solid: { backgroundColor: c.primary },
  outline: { borderWidth: 1, borderColor: c.borderStrong, backgroundColor: c.surface },
  danger: { backgroundColor: c.dangerSoft },
  pressed: { opacity: 0.85 },
  inactive: { opacity: 0.5 },
  label: { ...type.bodyLargeStrong, color: c.text },
  labelSolid: { color: c.onPrimary },
  labelDanger: { color: c.danger },
})
