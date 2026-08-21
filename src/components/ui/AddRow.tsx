import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { StyleProp, ViewStyle } from 'react-native'
import { radius, sizes, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/** The design's own measurement for the leading circle. */
const CIRCLE = 23

/**
 * Chronicle primitive 4c — the dashed add row.
 *
 * A 1px dashed border at radius 16, tamarind text, and a leading "+" in a 23px
 * bordered circle.
 *
 * **This is the empty-slot idiom for the whole product** — "an unfilled line in
 * a ledger" — and that is why it looks the way it does. A dashed edge says *a
 * row belongs here and nothing is written on it yet*, which is a different
 * statement from a solid button saying *press me*. It appears as "ADD A NEW
 * RECIPE" under the recipes index, "PLAN A DISH" on an empty planner day, "ADD
 * YOUR OWN" under the ingredient list, and "ADD STEP" under the method.
 *
 * Because it means that one thing, **a dashed border must not be used for
 * anything else.** The outgoing design had exactly one dashed edge — the
 * dev-only "Start fresh" row — precisely so that a dashed line always read as
 * "not a real part of the product". Chronicle promotes the idiom to a real
 * control, so the discipline transfers rather than lapsing: dashed means empty,
 * everywhere.
 */
export default function AddRow({
  label,
  onPress,
  style,
}: {
  label: string
  onPress: () => void
  style?: StyleProp<ViewStyle>
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      <View style={styles.circle}>
        {/* Drawn as two rules rather than set as a "+" glyph: at 23px a typed
            plus carries the text face's own weight and stroke contrast, which
            lands heavier than the 1.2px circle around it. */}
        <View style={styles.plusH} />
        <View style={styles.plusV} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: sizes.hitMin,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.borderFaint,
      borderRadius: radius.notice,
    },
    pressed: { opacity: 0.6 },
    circle: {
      width: CIRCLE,
      height: CIRCLE,
      borderRadius: CIRCLE / 2,
      borderWidth: 1.2,
      borderColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusH: { position: 'absolute', width: 9, height: 1.2, backgroundColor: c.primary },
    plusV: { position: 'absolute', width: 1.2, height: 9, backgroundColor: c.primary },
    label: { ...type.button, color: c.primary, textTransform: 'uppercase' },
  })
