import { useRouter } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLanguage, useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { markIntroSeen } from '@/lib/onboarding'
import PageDots from '@/components/ui/PageDots'
import PrimaryButton from '@/components/ui/PrimaryButton'
import TextLink from '@/components/ui/TextLink'
import { moulType, spacing, useScreenTopPad, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/** SCREENS.md § 2, in order. Keys rather than text — see `strings.ts`. */
const POINTS: { title: StringKey; body: StringKey }[] = [
  { title: 'about.oneTitle', body: 'about.oneBody' },
  { title: 'about.twoTitle', body: 'about.twoBody' },
  { title: 'about.threeTitle', body: 'about.threeBody' },
]

/**
 * Screen 2 — what the app is for, in three numbered rows.
 *
 * **Both exits write the "seen" flag.** Skipping is a decision, not a deferral,
 * which is the same reading the retired onboarding flow took of its own skip —
 * and the flag is what stops `(auth)/_layout` sending you back to the language
 * picker. Getting that wrong traps a user in a two-screen loop with no way into
 * the app, which is why they go through one function rather than two call sites
 * that could drift.
 *
 * Unlike the screen before it, everything here is translated: a language has
 * been chosen by the time you arrive.
 */
export default function AboutScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const topPad = useScreenTopPad()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const { language } = useLanguage()

  async function leave() {
    // The flag first, then navigate. The `(auth)` guard reads it synchronously
    // from the module store, so writing after the push would let the guard see
    // a stale `false` and redirect straight back to the picker.
    await markIntroSeen()
    router.replace('/signup')
  }

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.skipRow}>
        <TextLink label={t('about.skip')} onPress={leave} labelStyle={styles.skip} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('about.title')}</Text>

        <View style={styles.list}>
          {POINTS.map((point, index) => (
            <View
              key={point.title}
              style={[
                styles.point,
                // The first rule is the heavy one and the last row closes the
                // block, so the three read as one ruled table rather than as
                // three cards that happen to be stacked.
                index === 0 ? styles.ruleTop : styles.ruleTopLight,
                index === POINTS.length - 1 && styles.ruleBottom,
              ]}
            >
              <Text style={[styles.numeral, language === 'km' && styles.numeralKm]}>
                {n(index + 1)}
              </Text>
              <View style={styles.pointText}>
                <Text style={styles.pointTitle}>{t(point.title)}</Text>
                <Text style={styles.pointBody}>{t(point.body)}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <PrimaryButton label={t('about.carryOn')} onPress={leave} />
        <PageDots count={2} index={1} style={styles.dots} />
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: spacing.gutterWide },
    skipRow: { alignItems: 'flex-end' },
    // Deliberately quiet — `metadataSmall` at muted strength. It is an escape
    // hatch, not an option competing with the primary button.
    skip: { ...type.metadataSmall, color: c.textMuted },
    content: { paddingTop: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
    title: { ...type.screenTitle, color: c.text },
    list: { marginTop: spacing.sm },
    point: { flexDirection: 'row', gap: spacing.lg, paddingVertical: spacing.xl },
    ruleTop: { borderTopWidth: 1.5, borderTopColor: c.text },
    ruleTopLight: { borderTopWidth: 0.5, borderTopColor: c.borderStrong },
    ruleBottom: { borderBottomWidth: 0.5, borderBottomColor: c.borderStrong },
    /**
     * Newsreader 26 Latin, Moul 22 Khmer — the design's own pair, and the size
     * difference is intentional rather than a rounding: Moul is a display face
     * with far more ink per glyph, so matched sizes leave the Khmer numeral
     * visibly heavier than the Latin one beside the same title.
     */
    numeral: {
      fontFamily: 'Newsreader_500Medium',
      fontSize: 26,
      lineHeight: 32,
      color: c.primary,
      width: 34,
    },
    // 34 was 6pt short of Moul's ink.
    numeralKm: moulType(22),
    pointText: { flex: 1, minWidth: 0, gap: spacing.xs },
    pointTitle: { ...type.rowTitle, color: c.text },
    pointBody: { ...type.bodyRead, color: c.textMuted },
    footer: { gap: spacing.lg, paddingTop: spacing.md },
    dots: { alignSelf: 'center' },
  })
