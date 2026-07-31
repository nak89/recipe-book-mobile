import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Skeleton, { usePulse } from '@/components/ui/Skeleton'
import { colors, radius, spacing } from '@/theme'

/**
 * The detail screen before its recipe arrives.
 *
 * Mirrors the real layout's measurements — a 300pt hero, the body sheet pulled
 * up over it by `-spacing.xl` with the same rounded top — so the photo and title
 * appear where the placeholders already were. The back button is *not* faked: it
 * is drawn by the real screen either way, and a grey circle where a working
 * button belongs is worse than no button at all.
 */
export default function RecipeDetailSkeleton() {
  const pulse = usePulse()
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.container}>
      <Skeleton pulse={pulse} style={styles.hero} />
      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <Skeleton pulse={pulse} style={styles.title} />
        <Skeleton pulse={pulse} style={styles.titleShort} />

        <View style={styles.metaRow}>
          <Skeleton pulse={pulse} style={styles.meta} />
          <Skeleton pulse={pulse} style={styles.meta} />
          <Skeleton pulse={pulse} style={styles.meta} />
        </View>

        <View style={styles.tagRow}>
          <Skeleton pulse={pulse} style={styles.tag} />
          <Skeleton pulse={pulse} style={styles.tag} />
        </View>

        <Skeleton pulse={pulse} style={styles.sectionTitle} />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={`ingredient-${i}`} pulse={pulse} style={styles.line} />
        ))}

        <Skeleton pulse={pulse} style={styles.sectionTitle} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={`step-${i}`} pulse={pulse} style={styles.paragraph} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  // Matches the real screen's hero height and body offset exactly.
  hero: { height: 300, borderRadius: 0 },
  body: {
    marginTop: -spacing.xl,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { height: 26, width: '75%' },
  titleShort: { height: 26, width: '45%' },
  metaRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs },
  meta: { height: 15, width: 74 },
  tagRow: { flexDirection: 'row', gap: spacing.sm },
  tag: { height: 26, width: 92, borderRadius: radius.pill },
  sectionTitle: { height: 18, width: 130, marginTop: spacing.lg },
  line: { height: 14, width: '70%' },
  paragraph: { height: 14, width: '92%' },
})
