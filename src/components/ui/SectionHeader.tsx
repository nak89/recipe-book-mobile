import { StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { ViewStyle } from 'react-native'
import { spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Chronicle primitive 3 — the ruled section header.
 *
 *     LABEL ──────────────────────────────── count
 *
 * A small tracked label, a rule that takes whatever width is left, and an
 * optional count on the right. It appears above almost every list in the app,
 * and it is doing structural work rather than decorative: the rule is what
 * turns a heading into a *section* of a printed page, so a heading without one
 * reads as a stray line of small text.
 *
 * Three details are load-bearing:
 *
 *   - **The rule is `borderStrong` (ink at .22), one step heavier than the
 *     hairline under a ledger row** (`border`, ink at .16). Set them equal and
 *     the page loses its hierarchy — the header stops out-ranking the rows
 *     beneath it and everything reads as one undifferentiated ruled list.
 *   - **The gap below is `sectionGap` (6px), which is deliberately tighter than
 *     anything else on the page.** A header and its first row are one unit; the
 *     air belongs *between* sections (`sectionSpacing`), not inside them.
 *   - **`uppercase` is safe on both scripts.** Khmer has no letter case, so the
 *     transform is a no-op there — which is why this can be unconditional
 *     rather than branching on the active language.
 */
export default function SectionHeader({
  label,
  count,
  style,
}: {
  label: string
  /**
   * Rendered as given. Callers pass an already-formatted string so that Khmer
   * numerals are applied by whoever knows the number's meaning — a count of
   * recipes and a date are formatted differently, and this component can't tell
   * them apart.
   */
  count?: string
  style?: ViewStyle
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {/* Not a border on the row itself: the rule has to start where the label
          ends and stop where the count begins, which only a sibling can do. */}
      <View style={styles.rule} />
      {count != null && <Text style={styles.count}>{count}</Text>}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sectionGap,
    },
    label: { ...type.sectionLabel, color: c.text, textTransform: 'uppercase' },
    // `flex: 1` with a fixed height rather than a border, so the line sits on
    // the label's optical centre instead of on its baseline.
    rule: { flex: 1, height: 1, backgroundColor: c.borderStrong },
    count: { ...type.metadata, color: c.textPlaceholder },
  })
