import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Skeleton, { usePulse } from '@/components/ui/Skeleton'
import { useAuth } from '@/context/AuthContext'
import { useLanguage, useT } from '@/i18n'
import { getStarterPacks, importStarterPacks } from '@/lib/api'
import type { StarterPackSummary } from '@/lib/api'
import { selectionFeedback } from '@/lib/haptics'
import { hairline, radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Offers the starter packs so a brand-new account doesn't open onto an empty
 * grid.
 *
 * The import is **blocking**: the button goes into its loading state and the
 * screen doesn't move until the server answers. It's one request — the client
 * sends pack ids, not recipes — so the wait is short, and this is the only
 * arrangement where a failure appears on the screen that caused it with the
 * selection still on screen to retry from.
 *
 * Multi-select, so someone who cooks both Thai and Italian can say so. The
 * button carries a live count because "Add 15 recipes" is a commitment worth
 * seeing before you make it.
 */
export default function TasteScreen() {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { token } = useAuth()

  const [packs, setPacks] = useState<StarterPackSummary[] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    getStarterPacks(token)
      .then((data) => {
        if (!cancelled) setPacks(data)
      })
      .catch(() => {
        // A pack list we can't fetch shouldn't trap anyone in onboarding. An
        // empty array renders the "nothing to show" path, and Skip still works.
        if (!cancelled) setPacks([])
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const recipeCount = (packs ?? [])
    .filter((p) => selected.includes(p.id))
    .reduce((sum, p) => sum + p.count, 0)

  function toggle(id: string) {
    selectionFeedback()
    setSelected((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    )
  }

  function skip() {
    router.push('/welcome')
  }

  async function handleImport() {
    if (!token || selected.length === 0) return
    setImporting(true)
    setError(null)
    try {
      await importStarterPacks(selected, token)
      router.push('/welcome')
    } catch {
      // A network or backend failure — the server's English text is no use to a
      // Khmer reader, and `err` carries nothing actionable beyond "it failed".
      setError(t('taste.importFailed'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.kicker}>{`02 — ${t('taste.kicker')}`}</Text>
          <Text style={styles.title}>{t('taste.title')}</Text>
          <Text style={styles.subtitle}>{t('taste.subtitle')}</Text>
        </View>

        <View style={styles.packs}>
          {packs === null
            ? [0, 1, 2].map((i) => <PackSkeleton key={i} />)
            : packs.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  selected={selected.includes(pack.id)}
                  onPress={() => toggle(pack.id)}
                />
              ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {error && <Text style={styles.error}>{error}</Text>}

        {selected.length === 0 ? (
          // Nothing picked is a legitimate answer, not an error — so the primary
          // action becomes moving on, rather than a dead disabled button with a
          // separate Skip beside it.
          <PrimaryButton label={t('common.skipForNow')} variant="outline" onPress={skip} />
        ) : (
          <>
            <PrimaryButton
              // The one string in the app with a genuine plural, and the one
              // place a `{n}` placeholder is warranted: the count sits *inside*
              // the phrase and the two languages don't put it in the same place,
              // so a template literal around `t()` can't express it. Khmer has no
              // grammatical plural at all, so both keys resolve to one string
              // there — the singular/plural branch only ever matters in English.
              label={(recipeCount === 1 ? t('taste.addOne') : t('taste.addMany')).replace(
                '{n}',
                String(recipeCount)
              )}
              onPress={handleImport}
              loading={importing}
            />
            {/* There must always be a way past this screen. With a selection made
                the primary button is the import, and if that keeps failing — a
                backend that's down, or one running without the import route —
                this is the only thing standing between the user and being stuck
                in onboarding with no exit. */}
            <Pressable accessibilityRole="button" onPress={skip} disabled={importing} hitSlop={8}>
              <Text style={styles.skip}>{t('common.skipForNow')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  )
}

function PackCard({
  pack,
  selected,
  onPress,
}: {
  pack: StarterPackSummary
  selected: boolean
  onPress: () => void
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const { language } = useLanguage()
  const countLabel = t('taste.recipeCount').replace('{n}', String(pack.count))

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${language === 'km' ? pack.nameKm : pack.name}, ${countLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.cardPressed]}
    >
      <Text style={styles.emoji}>{pack.emoji}</Text>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{language === 'km' ? pack.nameKm : pack.name}</Text>
        <Text style={styles.cardBlurb}>{language === 'km' ? pack.blurbKm : pack.blurb}</Text>
        {/* The sample titles are recipe *content* and stay English in both
            languages, matching the decision that the 15 pack recipes aren't
            translated. Only the count label around them is. */}
        <Text style={styles.cardMeta}>
          {countLabel} · {pack.sampleTitles.join(', ')}
        </Text>
      </View>
      <Ionicons
        name={selected ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={selected ? c.primary : c.borderStrong}
      />
    </Pressable>
  )
}

/**
 * Copies the real card's measurements rather than being a generic block, for
 * the same reason every other skeleton in the app does: the cards should land
 * where the placeholders were instead of the page jumping when the fetch lands.
 */
function PackSkeleton() {
  const styles = useThemedStyles(makeStyles)
  const pulse = usePulse()

  return (
    <View style={styles.card}>
      <Skeleton pulse={pulse} style={{ width: 32, height: 32 }} />
      <View style={[styles.cardText, { gap: spacing.sm }]}>
        <Skeleton pulse={pulse} style={{ width: '55%', height: 17 }} />
        <Skeleton pulse={pulse} style={{ width: '85%', height: 13 }} />
        <Skeleton pulse={pulse} style={{ width: '70%', height: 12 }} />
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },
  heading: { gap: spacing.sm },
  // The Khmer scale already drops the mono face and the Latin tracking, so
  // there is no per-screen override left to make — see `typeKm` in the theme.
  kicker: { ...type.kicker, color: c.textMuted },
  title: { ...type.display, color: c.text },
  subtitle: { ...type.body, color: c.textMuted },
  packs: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: hairline,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
  },
  // Border rather than a fill: the cards sit on `bg` and a tinted fill would
  // need a colour the palette deliberately doesn't have.
  cardSelected: { borderColor: c.primary, borderWidth: 2 },
  cardPressed: { opacity: 0.7 },
  emoji: { fontSize: 32 },
  cardText: { flex: 1, gap: spacing.xs },
  cardTitle: { ...type.section, color: c.text },
  cardBlurb: { ...type.body, color: c.textMuted },
  cardMeta: { ...type.caption, color: c.textPlaceholder },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: hairline,
    borderTopColor: c.border,
    backgroundColor: c.bg,
  },
  error: { ...type.body, color: c.danger },
  skip: { ...type.bodyStrong, color: c.textMuted, textAlign: 'center', paddingVertical: spacing.sm },
})
