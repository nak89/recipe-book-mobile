import { StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { StyleProp, ViewStyle } from 'react-native'
import { spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * A value-over-label tile, used in threes.
 *
 * Extracted from the profile screen, where the shape already existed.
 *
 * **The fill is gone.** Three oat panels in a row was the last card-shaped
 * thing on a page otherwise made of rules; the tiles are now separated by a
 * hairline between them, which is how every other group on the page is
 * separated. The value is the loudest mark, which is the whole point of a stat.
 *
 * **The tile never does maths.** Values arrive pre-formatted, which is what
 * keeps unit logic ("4h" past sixty minutes, bare numbers for counts) with the
 * screen that knows what it is counting rather than spread across every caller.
 *
 * **Stats are decoration.** A failed fetch should leave them blank rather than
 * block the screen, so nothing here has a loading or error state — a caller
 * with no number yet passes an empty string.
 */
export default function StatTile({
  label,
  value,
  style,
}: {
  /** The caption. Sentence case, one or two words. */
  label: string
  /** Pre-formatted. Time collapses to "4h" past 60 minutes; counts are bare. */
  value: string
  style?: StyleProp<ViewStyle>
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={[styles.tile, style]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  tile: {
    flex: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    // Off the spacing scale, and deliberately: a value and its caption are one
    // unit of meaning, so the gap between them has to be smaller than the
    // scale's smallest step or they read as two stacked things.
    gap: 2,
  },
  value: { ...type.screenTitle, color: c.text },
  label: { ...type.metadataSmall, color: c.textMuted, textTransform: 'uppercase' },
})
