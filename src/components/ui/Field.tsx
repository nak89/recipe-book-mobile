import { forwardRef } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Label + input pair. Centralising `placeholderTextColor` here is what stops
 * placeholders rendering as near-black text that looks like a prefilled value.
 *
 * `style` lands on the TextInput; **layout belongs on `containerStyle`**. Put
 * `flex: 1` in `style` and the input flexes inside a wrapper that's still
 * sized to its own content, so the field visibly grows and shrinks as you type.
 *
 * `invalid` outlines the field in red and stops there — no message of its own.
 * A form full of red sentences is harder to act on than a form with two red
 * boxes, so the wording lives in one line above the submit button instead.
 */
const Field = forwardRef<
  TextInput,
  TextInputProps & {
    label?: string
    hint?: string
    invalid?: boolean
    containerStyle?: StyleProp<ViewStyle>
  }
>(
  function Field({ label, hint, invalid, style, containerStyle, multiline, ...props }, ref) {
    const { colors: c, isDark } = useTheme()
    const styles = useThemedStyles(makeStyles)
    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}
        <TextInput
          ref={ref}
          style={[styles.input, multiline && styles.multiline, invalid && styles.inputInvalid, style]}
          placeholderTextColor={c.textPlaceholder}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          multiline={multiline}
          {...props}
        />
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
    )
  }
)

export default Field

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...type.label, color: c.text },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
    ...type.bodyLarge,
    color: c.text,
  },
  multiline: { height: undefined, minHeight: 92, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputInvalid: { borderColor: c.danger, backgroundColor: c.dangerSoft },
  hint: { ...type.caption, color: c.textMuted },
})
