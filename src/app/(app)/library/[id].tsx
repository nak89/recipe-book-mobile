import { useCallback, useState } from 'react'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { copyLibraryRecipe, getLibraryRecipe } from '@/lib/api'
import type { LibraryRecipe } from '@/lib/api'
import { favouriteFeedback } from '@/lib/haptics'
import RecipeDetailSkeleton from '@/components/RecipeDetailSkeleton'
import LedgerRow from '@/components/ui/LedgerRow'
import PrimaryButton from '@/components/ui/PrimaryButton'
import SectionHeader from '@/components/ui/SectionHeader'
import TextLink from '@/components/ui/TextLink'
import { emojiForIngredient } from '@/data/ingredients'
import { useLanguage, useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useDifficultyLabel, useMealtimeLabel } from '@/i18n/labels'
import { hasKhmer } from '@/lib/text'
import { contentType, radius, spacing, typeKm, useScreenTopPad, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/** The reading page's own two measurements, shared with `recipe/[id]`. */
const HERO_HEIGHT = 300
const TITLE_LIFT = 34

/**
 * A library recipe, read but not owned.
 *
 * Structurally the same reading page as `recipe/[id]` — same hero, same lifted
 * title block, same 42pt reading gutter, same ruled ingredients and numbered
 * method — and that is the point: a recipe you are considering should look
 * exactly like a recipe you have, or copying it becomes a leap rather than a
 * step.
 *
 * What it does **not** have is every control that implies ownership. No edit, no
 * delete, no save-to-favourites diamond. Those all mutate a row that does not
 * exist yet. In their place the hero carries one attribution line, and the
 * sticky CTA is the copy.
 *
 * **Ingredient ticking is kept**, because it is scratch state that belongs to
 * reading rather than to owning — you check things off a shopping list while
 * deciding whether to cook something, and this screen is exactly where that
 * happens. It is per-screen and unpersisted here for the same reason it is on
 * the recipe page.
 */
export default function LibraryRecipeScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const { language } = useLanguage()
  const mealtimeLabel = useMealtimeLabel()
  const difficultyLabel = useDifficultyLabel()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const topPad = useScreenTopPad()

  const [recipe, setRecipe] = useState<LibraryRecipe | null>(null)
  const [loading, setLoading] = useState(true)
  // The key, never the translated sentence — so an error already on screen
  // re-renders when the toggle moves, and `t` never becomes a fetch dependency.
  const [error, setError] = useState<StringKey | null>(null)
  const [copying, setCopying] = useState(false)
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  useFocusEffect(
    useCallback(() => {
      if (!token || !id) return
      let cancelled = false
      setError(null)

      getLibraryRecipe(id, token)
        .then((data) => {
          if (cancelled) return
          setRecipe((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data))
        })
        .catch((err) => {
          if (!cancelled) setError(apiErrorKey(err))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }, [id, token])
  )

  const km = language === 'km'

  /**
   * Copies the recipe, then goes straight to the copy in the user's own book.
   *
   * Navigating rather than staying put is the honest end of the action: the CTA
   * said "copy to my book", so the book is where you should be. Staying would
   * leave the user on a page whose button had just gone inert with nothing to do
   * next.
   *
   * The server is idempotent on `libraryId`, so a double tap — or a tap made
   * after the user has renamed their copy — produces one recipe and returns it.
   * There is therefore nothing to guard against here beyond the in-flight flag,
   * which exists to stop the button flickering rather than to protect the data.
   */
  async function handleCopy() {
    if (!token || !recipe) return
    if (recipe.savedRecipeId) {
      router.push(`/recipe/${recipe.savedRecipeId}`)
      return
    }
    setCopying(true)
    try {
      const created = await copyLibraryRecipe(recipe.id, token)
      // Beside the result rather than after a re-fetch: the buzz confirms the
      // tap, and waiting on another round-trip would put it behind the thing it
      // is confirming.
      favouriteFeedback()
      router.push(`/recipe/${created.id}`)
    } catch (err) {
      setError(apiErrorKey(err))
    } finally {
      setCopying(false)
    }
  }

  if (loading) return <RecipeDetailSkeleton />

  if (!recipe) {
    return (
      <View style={styles.container}>
        <View style={[styles.missing, { paddingTop: topPad }]}>
          <Text style={styles.emptyTitle}>{t(error ?? 'error.generic')}</Text>
          <TextLink label={t('detail.back')} onPress={() => router.back()} />
        </View>
      </View>
    )
  }

  // One language: the library is Khmer throughout. `km` below is still read,
  // but only for the step numeral's face — that is chrome, and it follows the
  // toggle like every other numeral in the app.
  const { title, description } = recipe
  const saved = recipe.savedRecipeId !== null

  // The same three the recipe page builds, in the same order, minus calories —
  // the library carries no nutrition, and a fourth slot that is empty on all
  // eight would just be a gap where your own recipes have a number.
  const meta = [
    `${n(recipe.totalMinutes)} ${t('detail.minutes')}`,
    `${n(recipe.servings)} ${t('detail.servings')}`,
    difficultyLabel(recipe.difficulty),
  ]

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image source={{ uri: recipe.photoUrl }} style={styles.heroPhoto} contentFit="cover" />
          {/* The end stops share the middle stop's rgb — a gradient fading to a
              differently-coloured transparent interpolates through grey and
              leaves a visible fringe across the photograph. */}
          <LinearGradient
            colors={[c.scrim, c.scrimNone]}
            locations={[0, 190 / HERO_HEIGHT]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={[styles.heroActions, { top: insets.top + spacing.sm }]}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('detail.back')}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              {/* Two rules at 1.4px, matching every other icon in the product —
                  a chevron glyph carries a text face's stroke contrast and
                  reads heavier than the hairlines around it. */}
              <View style={styles.chevronTop} />
              <View style={styles.chevronBottom} />
            </Pressable>

            {/* The one thing standing where Edit and Save do on your own
                recipes: whose recipe this is. It is the only honest occupant of
                that corner on a page you cannot change. */}
            <Text style={styles.attribution}>{t('explore.byChefNak')}</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          {/* The face is chosen by the string, not the toggle. Every library
              title is Khmer today, so this always lands on Moul — but asking the
              string is what keeps it correct the day one of them isn't, and it
              is the same rule the user's own recipes follow. */}
          <Text style={[styles.title, hasKhmer(title) && styles.titleKm]}>{title}</Text>

          <View style={styles.titleRule} />

          <View style={styles.metaRow}>
            {meta.map((item, index) => (
              <Text key={item} style={styles.meta}>
                {item}
                {index < meta.length - 1 && <Text style={styles.metaDot}> · </Text>}
              </Text>
            ))}
          </View>

          <View style={styles.tagRow}>
            {/* Cuisine and tools are the recipe's own words; the mealtime chip
                beside them is a translated enum label. So the first two take
                their face from the string and the third from the language —
                two rules in one row, which is what those two things are. Without
                it the Khmer lands on the Latin `metadataSmall`, IBM Plex Mono,
                which has no Khmer glyphs and renders as tofu. */}
            <Text style={[styles.chip, contentType('metadataSmall', recipe.cuisine)]}>
              {recipe.cuisine}
            </Text>
            {recipe.mealtime && <Text style={styles.chip}>{mealtimeLabel(recipe.mealtime)}</Text>}
            {recipe.tools.length > 0 && (
              <Text
                style={[styles.tools, contentType('metadataSmall', recipe.tools.join(' '))]}
                numberOfLines={1}
              >
                {t('detail.toolsPrefix')} · {recipe.tools.join(', ')}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.description, contentType('bodyRead', description)]}>
            {description}
          </Text>
          {error && <Text style={styles.error}>{t(error)}</Text>}

          <View style={styles.section}>
            <SectionHeader
              label={t('detail.ingredientsHeader')}
              count={`×${n(recipe.servings)}`}
            />
            {recipe.ingredients.map((ingredient, index) => {
              const key = `${ingredient.name}:${index}`
              // A blank unit is a real answer — nobody measures onions in
              // anything — so the value is the quantity alone rather than a
              // number with a trailing space.
              const amount = [n(ingredient.quantity), ingredient.unit].filter(Boolean).join(' ')
              return (
                <LedgerRow
                  key={key}
                  title={ingredient.name}
                  emoji={emojiForIngredient(ingredient.name)}
                  value={amount}
                  ingredient
                  checked={checked[key] === true}
                  onToggle={(next) => setChecked((prev) => ({ ...prev, [key]: next }))}
                  last={index === recipe.ingredients.length - 1}
                />
              )
            })}
          </View>

          <View style={styles.section}>
            <SectionHeader label={t('explore.method')} count={n(recipe.steps.length)} />
            {recipe.steps.map((instruction, index) => (
              <View key={instruction.slice(0, 24) + index} style={styles.step}>
                {/* Newsreader 15 Latin / Moul 13 Khmer, tamarind. Moul is far
                    heavier per em, which is why the Khmer size steps down
                    rather than matching. */}
                <Text style={[styles.stepNumeral, km && styles.stepNumeralKm]}>
                  {n(index + 1)}
                </Text>
                <Text style={[styles.stepText, contentType('bodyRead', instruction)]}>
                  {instruction}
                </Text>
              </View>
            ))}
          </View>

          {/* Chef Nak's own closing line. It is the reason these recipes read as
              written by a person rather than assembled, so it gets a heading of
              its own rather than being appended to the last step. */}
          <View style={styles.section}>
            <SectionHeader label={t('explore.chefsNote')} />
            <Text style={[styles.note, contentType('bodyRead', recipe.note)]}>{recipe.note}</Text>
          </View>

          <View style={styles.footer}>
            {/* The link out is the quietest thing on the page, in the same slot
                where your own recipes put Delete. Attribution is a debt this
                screen owes, not a feature it advertises. */}
            <TextLink
              label={t('explore.sourceLine')}
              onPress={() => Linking.openURL(recipe.source).catch(() => setError('error.generic'))}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md }]}>
        <LinearGradient
          colors={[`${c.bg}00`, c.bg]}
          style={styles.ctaFade}
          pointerEvents="none"
        />
        {/* Two states, one button. Already-copied becomes a way *into* the copy
            rather than going flat or disappearing — a disabled button on the
            recipe you liked enough to keep is the least useful control the
            screen could end on. */}
        <PrimaryButton
          label={t(copying ? 'explore.copying' : saved ? 'explore.inYourBook' : 'explore.copyToBook')}
          variant={saved ? 'outline' : 'solid'}
          loading={copying}
          onPress={handleCopy}
        />
      </View>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    // Clears the sticky CTA, so the last line of the note is readable rather
    // than parked underneath it.
    scroll: { paddingBottom: 120 },

    hero: { height: HERO_HEIGHT, backgroundColor: c.surfaceSunken },
    heroPhoto: { ...StyleSheet.absoluteFill },
    heroActions: {
      position: 'absolute',
      left: spacing.gutter,
      right: spacing.gutter,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    back: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.6 },
    chevronTop: {
      position: 'absolute',
      width: 11,
      height: 1.4,
      backgroundColor: c.textOnPhoto,
      transform: [{ translateY: -3.5 }, { rotate: '-45deg' }],
    },
    chevronBottom: {
      position: 'absolute',
      width: 11,
      height: 1.4,
      backgroundColor: c.textOnPhoto,
      transform: [{ translateY: 3.5 }, { rotate: '45deg' }],
    },
    attribution: {
      ...type.metadataSmall,
      color: c.textOnPhoto,
      textTransform: 'uppercase',
    },

    // Pulled up over the hero's bottom edge. The negative margin *is* the
    // spacing — the hero takes no bottom margin of its own, or a cream stripe
    // opens between them.
    titleBlock: {
      marginTop: -TITLE_LIFT,
      marginHorizontal: spacing.readingGutter,
      gap: spacing.sm,
    },
    title: { ...type.screenTitle, color: c.text },
    // Drops the Latin face's tighter tracking, which Khmer must never carry, and
    // takes the Khmer scale's own whisper in its place — see `kmTrack`.
    titleKm: { letterSpacing: typeKm.screenTitle.letterSpacing },
    titleRule: { height: 1, backgroundColor: c.border, marginTop: spacing.xs },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap' },
    meta: { ...type.metadataSmall, color: c.textMuted, textTransform: 'uppercase' },
    metaDot: { color: c.borderStrong },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
    chip: {
      // The mealtime chip keeps the language-keyed face; the cuisine chip beside
      // it overrides with `contentType`. See the note at the call site.
      ...type.metadataSmall,
      color: c.primary,
      textTransform: 'uppercase',
      borderWidth: 1,
      borderColor: c.accentPill,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    // Face from `contentType` at the call site — tool names are content.
    tools: { color: c.textMuted, flexShrink: 1 },

    body: {
      paddingHorizontal: spacing.readingGutter,
      paddingTop: spacing.xl,
      gap: spacing.sectionSpacing,
    },
    // Colour only — content takes its face from `contentType` at the call site.
    description: { color: c.textMuted },
    section: { gap: spacing.sectionGap },
    // Type comes from `contentType` at the call site — the note is Chef Nak's
    // own words, so its face follows the string.
    note: { color: c.textMuted, fontStyle: 'italic' },
    error: { ...type.body, color: c.danger },

    /**
     * `alignItems: 'baseline'`, not the default stretch.
     *
     * The numeral and the instruction are two `Text`s in a row whose line boxes
     * are nothing like each other — 24pt against `cookStep`'s 39 in Latin and 43
     * in Khmer. Started from the top of the row, the small numeral floats a
     * third of a line above the text it labels; the taller the text, the worse
     * it reads, which is why it is most obvious on a Khmer recipe.
     *
     * Matching the boxes by hand is the wrong fix twice over: the numeral's face
     * follows the *language* (`n()` gives a Latin or a Khmer digit) while the
     * text's follows the *string* via `contentType`, so the two can disagree on
     * any combination — and the numeral would then have to be restyled every
     * time the body token moved. A baseline is the thing they actually share.
     */
    step: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: spacing.md,
      paddingVertical: spacing.rowY,
    },
    stepNumeral: {
      fontFamily: 'Newsreader_400Regular',
      fontSize: 15,
      color: c.primary,
      minWidth: 20,
    },
    // Moul at 13 rather than 15: it is far heavier per em than Newsreader, so a
    // matched size lands as a much louder mark. No lineHeight — a Khmer numeral
    // still sits in a line box the platform must measure from the font.
    stepNumeralKm: { fontFamily: 'Moul_400Regular', fontSize: 13 },
    stepText: { color: c.text, flex: 1 },

    footer: { alignItems: 'center', paddingTop: spacing.md },
    missing: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.gutter },
    emptyTitle: { ...type.emptyTitle, color: c.text, textAlign: 'center' },

    cta: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.md,
    },
    ctaFade: { position: 'absolute', left: 0, right: 0, bottom: '100%', height: 40 },
  })
