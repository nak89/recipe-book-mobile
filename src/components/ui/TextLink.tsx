import { Pressable, StyleSheet } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { sizes, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Chronicle primitive 4d — the text link: tamarind with a 1px underline.
 *
 * Both halves are required. Tamarind on paper measures 4.50:1, which clears AA
 * for text — but colour alone still can't carry "this is tappable" for a reader
 * who doesn't perceive it, and this is the one control in the product with no
 * border, fill or chevron to fall back on. The underline is the affordance; the
 * colour is the emphasis.
 *
 * **Drawn as a border rather than `textDecorationLine`.** A text decoration is
 * struck through the middle of the *descender* space, which sits where a Khmer
 * cluster carries its subscript consonant — the same mechanism that stops a
 * ticked Khmer row being struck through in `LedgerRow`. A border under the
 * element clears the line box entirely and is safe in both scripts.
 */
export default function TextLink({
  label,
  onPress,
  style,
  labelStyle,
}: {
  label: string
  onPress: () => void
  style?: StyleProp<ViewStyle>
  labelStyle?: StyleProp<TextStyle>
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed, style]}
    >
      <Text style={[styles.label, labelStyle]}>{label}</Text>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    wrap: {
      alignSelf: 'flex-start',
      borderBottomWidth: 1,
      borderBottomColor: c.primary,
      // `hitSlop` carries the tap target out to the 44pt floor; the drawn
      // underline stays tight to the text so it reads as a rule, not a box.
      minHeight: undefined,
    },
    pressed: { opacity: 0.6 },
    label: { ...type.body, color: c.primary },
  })

/** Exported so a caller can line a hand-built control up with a link's target. */
export const LINK_HIT_MIN = sizes.hitMin
