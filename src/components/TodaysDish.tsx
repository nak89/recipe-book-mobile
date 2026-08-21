import { Image } from 'expo-image'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useNum, useT } from '@/i18n'
import { hasKhmer } from '@/lib/text'
import AddRow from '@/components/ui/AddRow'
import { moulType, radius, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { Recipe } from '@/types/recipe'

/** The design's own two measurements, and they are a pair. */
const IMAGE_HEIGHT = 210
const CARD_LIFT = 46

/**
 * The one photograph on the Recipes index: **what you planned to cook today**.
 *
 * That rule is a decision the handoff deliberately left open (README, open
 * decision #1, where the alternatives were a random daily pick, a seasonal
 * suggestion or an editorial curation). Planned wins because it is the only one
 * of the four that is *true* — the whole product already knows what today's
 * dinner is, and a random pick dressed up as "today's dish" is a lie told
 * with a photograph. It also gives the meal planner a reason to exist on the
 * screen people open first.
 *
 * With nothing planned it degrades to a dashed **PLAN A DISH** row rather than
 * disappearing. An empty state that removes itself teaches nobody that the slot
 * exists, and this is the app's most-seen screen.
 *
 * ## The −46 lift
 *
 * The card overlaps the photograph's bottom edge, which is what stops the two
 * reading as a picture with a caption underneath. The photo is therefore
 * **not** given its own bottom margin: the negative margin on the card *is* the
 * spacing, and adding both leaves a cream stripe between them.
 */
export default function TodaysDish({
  recipe,
  onPress,
  onPlan,
}: {
  /** Today's planned recipe, or null for the empty row. */
  recipe: Recipe | null
  onPress: () => void
  onPlan: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()

  if (!recipe) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.kicker}>{t('index.todaysDish')}</Text>
        <Text style={styles.emptyBody}>{t('index.nothingToday')}</Text>
        <AddRow label={t('index.planADish')} onPress={onPlan} />
      </View>
    )
  }

  // Built as one string and converted once, so the two middle dots don't have
  // to be repeated at three call sites. `min` and the servings word are chrome;
  // the numbers follow the language.
  const meta = [
    `${n(recipe.totalMinutes)} ${t('detail.minutes')}`,
    `${n(recipe.servings)} ${t('detail.servings')}`,
    ...(recipe.tools.length > 0 ? [recipe.tools[0]] : []),
  ].join(' · ')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('index.todaysDish')}: ${recipe.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      {/* Full-bleed: it runs edge to edge while the card inside keeps the
          page's 24pt gutter, which is the whole shape of this block. */}
      <Image
        source={recipe.photoUrl}
        style={styles.photo}
        contentFit="cover"
        transition={150}
        accessibilityIgnoresInvertColors
      />

      <View style={styles.card}>
        <Text style={styles.kicker}>{t('index.todaysDish')}</Text>
        {/* Moul 25 for a Khmer title, Newsreader 25 for a Latin one — decided
            by the **title**, not by the interface language, so an English
            recipe keeps Newsreader in a Khmer UI. The two are written here
            rather than taken from a scale role because 25/32 and 25/40 are this
            card's own measurements. Moul is a display face and must never reach
            the meta line below. */}
        <Text style={[styles.title, hasKhmer(recipe.title) && styles.titleKm]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    wrap: { marginBottom: spacing.sectionSpacing },
    pressed: { opacity: 0.9 },
    photo: { height: IMAGE_HEIGHT, width: '100%', backgroundColor: c.oat },
    card: {
      // The lift. No bottom margin on the photo above — this negative margin is
      // the spacing between them, and setting both opens a cream gap.
      marginTop: -CARD_LIFT,
      marginHorizontal: spacing.gutter,
      backgroundColor: c.bg,
      borderRadius: radius.card,
      padding: spacing.xl,
      gap: spacing.xs,
    },
    kicker: { ...type.sectionLabel, color: c.primary, textTransform: 'uppercase' },
    title: { fontFamily: 'Newsreader_400Regular', fontSize: 25, lineHeight: 32, color: c.text },
    // `moulType`, not a hand-picked line box. At 40 the card cropped the top
    // off every Khmer title — Moul declares 1.81em of ink and 40/25 is 1.6.
    titleKm: moulType(25),
    // The design's `opacity: .6` on ink, written as a colour so it doesn't have
    // to be stacked on the Text — see the note on `textMuted` in `palettes.ts`.
    meta: { ...type.metadata, color: c.textMuted },

    emptyWrap: {
      paddingHorizontal: spacing.gutter,
      marginBottom: spacing.sectionSpacing,
      gap: spacing.sm,
    },
    emptyBody: { ...type.body, color: c.textMuted, marginBottom: spacing.xs },
  })
