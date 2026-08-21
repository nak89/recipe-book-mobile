import { useState } from 'react'
import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import { importLibrary } from '@/lib/api'
import { selectionFeedback } from '@/lib/haptics'
import { radius, spacing, useScreenTopPad, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * The first recipe — SCREENS.md § 5.
 *
 * **This screen used to offer the three starter packs and now offers the eight
 * Cambodian classics.** § 5 always named them ("Begin with eight classics —
 * Amok, lok lak, samlor korko…"), and the copy has been on this screen since the
 * restyle; what did not exist until the shared library was built was anything
 * behind it. Until then the heading promised amok and delivered carbonara.
 *
 * `data/starterPacks.ts`, `GET /starter-packs` and `POST /recipes/import` are
 * all still there and still tested — nothing else consumes them now, and
 * whether they stay is a call worth making deliberately rather than by deleting
 * them in passing.
 *
 * § 5 draws **three** option cards; two are built. Photographing a handwritten
 * page needs an OCR pipeline that does not exist, and a card that does nothing
 * is worse than one fewer card.
 *
 * The import is **blocking**: the card goes into a spinner and the screen does
 * not move until the server answers. It is one request — the client sends a
 * language, not recipes — so the wait is short, and it is the only arrangement
 * where a failure lands on the screen that caused it.
 */
export default function TasteScreen() {
  const styles = useThemedStyles(makeStyles)
  const { colors: c } = useTheme()
  const t = useT()
  const insets = useSafeAreaInsets()
  const topPad = useScreenTopPad()
  const router = useRouter()
  const { token, completeOnboarding } = useAuth()

  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Writing the first recipe from scratch **also finishes onboarding**.
   *
   * Otherwise the modal opens over a screen the guards will not let you leave,
   * and closing it drops you back here with a recipe already written — which
   * reads as the save having failed.
   */
  async function writeOne() {
    await completeOnboarding()
    router.replace('/recipe/new')
  }

  // Both exits write `onboardedAt` and land on the app. Skipping is a decision,
  // not a deferral — and with the welcome and tutorial screens gone there is
  // nothing after this to defer *to*.
  async function skip() {
    await completeOnboarding()
    router.replace('/')
  }

  /**
   * Copies all eight. No language argument — the library is Khmer only.
   *
   * Idempotent on the server, by `libraryId` — so someone who force-quits after
   * the write lands but before `onboardedAt` is set comes back to this screen,
   * taps again, and ends up with eight recipes rather than sixteen.
   */
  async function importClassics() {
    if (!token || importing) return
    selectionFeedback()
    setImporting(true)
    setError(null)
    try {
      await importLibrary(token)
      await completeOnboarding()
      router.replace('/')
    } catch {
      // A network or backend failure. The server's English text is no use to a
      // Khmer reader, and the error carries nothing actionable beyond "it
      // failed" — so this is a translated key, not a passed-through message.
      setError(t('taste.importFailed'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>{t('first.title')}</Text>
          <Text style={styles.subtitle}>{t('first.subtitle')}</Text>
        </View>

        {/* The classics go **first** and carry the 1.2px ink border § 5 reserves
            for the recommended option. An empty book is the problem this screen
            exists to solve, and eight recipes solves it in one tap where writing
            one is a ten-minute job you have not agreed to yet. */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: importing }}
          onPress={importClassics}
          style={({ pressed }) => [
            styles.option,
            styles.optionRecommended,
            pressed && styles.optionPressed,
          ]}
        >
          <View style={styles.optionIcon}>
            {importing ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : (
              // A downward arrow drawn from three rules at 1.2px, matching § 5's
              // `↓` and every other icon in the product. A typed glyph carries
              // the text face's stroke contrast and lands heavier than the
              // circle around it.
              <>
                <View style={styles.arrowStem} />
                <View style={styles.arrowLeft} />
                <View style={styles.arrowRight} />
              </>
            )}
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('first.classicsTitle')}</Text>
            {/* Recipe *titles*, so they stay as the library spells them — this
                is the one line on the screen that is content rather than
                chrome. */}
            <Text style={styles.optionBody}>{t('first.classicsBody')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={writeOne}
          disabled={importing}
          style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
        >
          <View style={styles.optionIcon}>
            <View style={styles.plusH} />
            <View style={styles.plusV} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>{t('first.writeTitle')}</Text>
            <Text style={styles.optionBody}>{t('first.writeBody')}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {error && <Text style={styles.error}>{error}</Text>}
        {/* There must always be a way past this screen. Both cards above can
            fail — one needs the network, the other opens a form — and this is
            the only thing standing between the user and being stuck in
            onboarding with no exit. */}
        <PrimaryButton
          label={t('common.skipForNow')}
          variant="outline"
          onPress={skip}
          disabled={importing}
        />
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: {
    paddingHorizontal: spacing.gutterWide,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  heading: { gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...type.screenTitle, color: c.text },
  subtitle: { ...type.bodyRead, color: c.textMuted },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    // § 5's non-recommended weight. The recommended card overrides both below.
    borderWidth: 0.8,
    borderColor: c.border,
  },
  optionRecommended: { borderWidth: 1.2, borderColor: c.text },
  optionPressed: { opacity: 0.6 },
  optionIcon: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    borderWidth: 1.2,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusH: { position: 'absolute', width: 12, height: 1.2, backgroundColor: c.primary },
  plusV: { position: 'absolute', width: 1.2, height: 12, backgroundColor: c.primary },
  // The `↓`: a stem plus two barbs, rotated rather than drawn as a glyph.
  arrowStem: { position: 'absolute', width: 1.2, height: 13, backgroundColor: c.primary },
  arrowLeft: {
    position: 'absolute',
    width: 1.2,
    height: 7,
    backgroundColor: c.primary,
    transform: [{ translateX: -2.6 }, { translateY: 4 }, { rotate: '-45deg' }],
  },
  arrowRight: {
    position: 'absolute',
    width: 1.2,
    height: 7,
    backgroundColor: c.primary,
    transform: [{ translateX: 2.6 }, { translateY: 4 }, { rotate: '45deg' }],
  },
  optionText: { flex: 1, minWidth: 0, gap: 2 },
  optionTitle: { ...type.rowTitle, color: c.text },
  optionBody: { ...type.metadata, color: c.textPlaceholder },
  chevron: { ...type.body, color: c.inactive },

  footer: {
    paddingHorizontal: spacing.gutterWide,
    paddingTop: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1.5,
    borderTopColor: c.text,
    backgroundColor: c.bg,
  },
  error: { ...type.body, color: c.danger },
})
