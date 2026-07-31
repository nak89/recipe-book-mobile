import { StyleSheet, View } from 'react-native'
import Skeleton, { usePulse } from '@/components/ui/Skeleton'
import { radius, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'

/**
 * A grid tile with nothing in it yet.
 *
 * Deliberately the same shape as `RecipeCard`'s grid variant — `aspectRatio`
 * 0.86, the same corner radius, the same two-column flex — so the real cards
 * land exactly where the placeholders were instead of the whole page jumping
 * when data arrives. That stability is the entire reason to prefer this over a
 * centred spinner.
 *
 * The bars sit where the card puts its title and time badge, which is what makes
 * it read as "a card, loading" rather than "a grey box".
 */
export default function RecipeCardSkeleton() {
  const styles = useThemedStyles(makeStyles)
  const pulse = usePulse()

  return (
    <View style={styles.card} accessibilityLabel="Loading recipe">
      <View style={styles.content}>
        <Skeleton pulse={pulse} style={styles.titleBar} />
        <Skeleton pulse={pulse} style={styles.titleBarShort} />
        <Skeleton pulse={pulse} style={styles.badge} />
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  // Mirrors RecipeCard's `card` + `grid` styles.
  card: {
    flex: 1,
    aspectRatio: 0.86,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  content: { padding: spacing.md, gap: spacing.sm },
  titleBar: { height: 11, width: '85%', backgroundColor: c.borderStrong },
  titleBarShort: { height: 11, width: '55%', backgroundColor: c.borderStrong },
  badge: { height: 16, width: 62, borderRadius: radius.pill, backgroundColor: c.border },
})
