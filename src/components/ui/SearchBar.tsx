import { Pressable, StyleSheet, View } from 'react-native'
import { TextInput } from '@/components/ui/Text'
import { MagnifierIcon } from '@/components/ui/icons'
import { inputType, minHeights, sized, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { useT } from '@/i18n'

/**
 * The search field: a hairline magnifier, the query, and a rule underneath.
 *
 * **No box.** It follows `Field`'s rule exactly — the weight of the underline
 * *is* the state, `.8px` faint while empty and `1.2px` ink once something has
 * been typed — because a search field and a form field are the same object on a
 * printed page and giving one a pill fill would make it a different species.
 *
 * The clear control is drawn as a `✕` from two rotated rules rather than a
 * filled `close-circle` glyph. At 18px that glyph is the heaviest ink on the
 * screen, which is an odd thing for "undo my typing" to be, and it belongs to a
 * different drawing system from every other mark in the product.
 */
export default function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const filled = value.length > 0

  return (
    <View style={[styles.wrapper, filled ? styles.ruleFilled : styles.ruleEmpty]}>
      <MagnifierIcon color={filled ? c.text : c.textPlaceholder} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        // Defaulted here, not in the signature — the fallback needs `t`.
        placeholder={placeholder ?? t('search.placeholder')}
        placeholderTextColor={c.textPlaceholder}
        keyboardAppearance="light"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {filled && (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <View style={styles.clearStroke} />
          <View style={styles.clearStrokeBack} />
        </Pressable>
      )}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      // A floor, not a height: a Khmer query wraps to two lines rather than
      // being clipped by a box that can't grow.
      minHeight: minHeights.search,
      paddingBottom: spacing.sm,
    },
    ruleEmpty: { borderBottomWidth: 0.8, borderBottomColor: c.borderFaint },
    ruleFilled: { borderBottomWidth: 1.2, borderBottomColor: c.text },
    // minWidth: 0 so a long query can't push the clear button off the edge.
    input: {
      flex: 1,
      minWidth: 0,
      // `sized`, never a bare fontSize override — on the Khmer scale a raw
      // override leaves 16pt text carrying `body`'s 14pt line box. `inputType`
      // then turns that box into a floor: pinned on a one-line input — and with
      // `paddingVertical: 0` below, leaving nothing to overshoot into — it
      // clips its own descenders.
      ...inputType(sized(type.body, 16)),
      color: c.text,
      paddingVertical: 0,
    },
    clear: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: 0.6 },
    clearStroke: {
      position: 'absolute',
      width: 13,
      height: 1.2,
      backgroundColor: c.textMuted,
      transform: [{ rotate: '45deg' }],
    },
    clearStrokeBack: {
      position: 'absolute',
      width: 13,
      height: 1.2,
      backgroundColor: c.textMuted,
      transform: [{ rotate: '-45deg' }],
    },
  })
