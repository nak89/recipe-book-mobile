import { StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { radius, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'

/** The design's own measurements: 18×3 active, 6×3 inactive, r99. */
const ACTIVE_WIDTH = 18
const IDLE_WIDTH = 6
const HEIGHT = 3

/**
 * Progress through the two pre-auth screens.
 *
 * The active dot is a **stretched** bar rather than a filled circle, which is
 * what keeps it legible at 3px tall: at this height a 6px circle and an 6px
 * tamarind circle differ only by colour, and colour alone would be the sole
 * cue. Width carries the meaning; the tamarind is the second cue, not the first.
 *
 * It does not animate. Chronicle's motion section allows four transitions in the
 * entire product and a progress indicator is not one of them — and unlike the
 * tab bar's capsule, there is no finger to track here, since these screens
 * advance by button rather than by swipe.
 */
export default function PageDots({
  count,
  index,
  style,
}: {
  count: number
  index: number
  style?: StyleProp<ViewStyle>
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    // One accessible element rather than `count` of them: a screen reader
    // announcing "dot, dot" twice tells you nothing a position doesn't.
    <View
      style={[styles.row, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === index ? styles.active : styles.idle]} />
      ))}
    </View>
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    dot: { height: HEIGHT, borderRadius: radius.pill },
    active: { width: ACTIVE_WIDTH, backgroundColor: c.primary },
    idle: { width: IDLE_WIDTH, backgroundColor: c.borderFaint },
  })
