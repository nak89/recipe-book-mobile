import { forwardRef } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native'
import { colors, radius, spacing, type } from '@/theme'

/**
 * Label + input pair. Centralising `placeholderTextColor` here is what stops
 * placeholders rendering as near-black text that looks like a prefilled value.
 *
 * `style` lands on the TextInput; **layout belongs on `containerStyle`**. Put
 * `flex: 1` in `style` and the input flexes inside a wrapper that's still
 * sized to its own content, so the field visibly grows and shrinks as you type.
 */
const Field = forwardRef<
  TextInput,
  TextInputProps & { label?: string; hint?: string; containerStyle?: StyleProp<ViewStyle> }
>(
  function Field({ label, hint, style, containerStyle, multiline, ...props }, ref) {
    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.multiline, style]}
          placeholderTextColor={colors.textPlaceholder}
          multiline={multiline}
          {...props}
        />
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
    )
  }
)

export default Field

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...type.label, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
    ...type.body,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { height: undefined, minHeight: 92, paddingTop: spacing.md, textAlignVertical: 'top' },
  hint: { ...type.caption, color: colors.textMuted },
})
