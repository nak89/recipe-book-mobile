import { useState, type ReactNode } from 'react'
import Image from '@/components/RecipeImage'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import LedgerRow from '@/components/ui/LedgerRow'
import PrimaryButton from '@/components/ui/PrimaryButton'
import SectionHeader from '@/components/ui/SectionHeader'
import { emojiForIngredient } from '@/data/ingredients'
import { useLanguage, useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { useDifficultyLabel, useMealtimeLabel } from '@/i18n/labels'
import { hasKhmer } from '@/lib/text'
import { contentType, moulType, radius, sizes, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { Recipe } from '@/types/recipe'

const HERO_HEIGHT = 300
const TITLE_LIFT = 34

interface HeroAction {
  label: string
  onPress?: () => void
  disabled?: boolean
  accessibilityLabel?: string
  selected?: boolean
}

interface RecipeReadingPageProps {
  recipe: Pick<Recipe, 'title' | 'photoUrl' | 'description' | 'totalMinutes' | 'servings' | 'difficulty' | 'calories' | 'cuisine' | 'mealtime' | 'tools' | 'ingredients' | 'steps'>
  actions: HeroAction[]
  error: StringKey | null
  onBack: () => void
  onCook: () => void
  footer?: ReactNode
  note?: { heading: string; text: string }
}

export default function RecipeReadingPage({ recipe, actions, error, onBack, onCook, footer, note }: RecipeReadingPageProps) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const { language } = useLanguage()
  const mealtimeLabel = useMealtimeLabel()
  const difficultyLabel = useDifficultyLabel()
  const insets = useSafeAreaInsets()
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  /**
   * The 4-up meta row, in the design's order.
   *
   * `!= null` rather than truthiness on the calories — a genuine `0` is a fact
   * worth showing, and dropping it would be a silent lie about the recipe.
   */
  const meta = [
    `${n(recipe.totalMinutes)} ${t('detail.minutes')}`,
    `${n(recipe.servings)} ${t('detail.servings')}`,
    ...(recipe.calories != null ? [`${n(recipe.calories)} KCAL`] : []),
    difficultyLabel(recipe.difficulty),
  ]

  const steps = [...recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={recipe.photoUrl ? { uri: recipe.photoUrl } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            accessibilityIgnoresInvertColors
          />
          {/* Over the top 190 of 300 only, fading to nothing. The end stop is
              `scrimNone` rather than `transparent` because a gradient fading to
              a differently-coloured transparent interpolates through grey and
              leaves a visible fringe across the photograph. */}
          <LinearGradient
            colors={[c.scrim, c.scrimNone]}
            locations={[0, 190 / HERO_HEIGHT]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={[styles.heroActions, { top: insets.top + spacing.sm }]}>
            <Pressable
              onPress={onBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('detail.back')}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              {/* A chevron drawn from two rules, at the same 1.4px as every
                  other icon. The glyph version carries a text face's stroke
                  contrast and reads heavier than the hairlines around it. */}
              <View style={styles.chevronTop} />
              <View style={styles.chevronBottom} />
            </Pressable>

            <View style={styles.heroRight}>
              {actions.map(({ label, onPress, disabled, accessibilityLabel, selected }) =>
                onPress ? (
                  <Pressable
                    key={label}
                    onPress={onPress}
                    disabled={disabled}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabel ?? label}
                    accessibilityState={{ disabled, selected }}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <Text style={styles.heroAction}>{label}</Text>
                  </Pressable>
                ) : <Text key={label} style={styles.heroAction}>{label}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Pulled up over the hero's bottom edge. Like `TodaysDish`, the
            negative margin *is* the spacing — the hero takes no bottom margin
            of its own or a cream stripe opens between them. */}
        <View style={styles.titleBlock}>
          {/* Decided by the title, not by the interface language: this is the
              recipe you wrote, and it keeps its own script whichever way the
              toggle is set. */}
          <Text style={[styles.title, hasKhmer(recipe.title) && styles.titleKm]}>
            {recipe.title}
          </Text>

          <View style={styles.titleRule} />

          <View style={styles.metaRow}>
            {meta.map((item, index) => (
              <Text key={item} style={styles.meta}>
                {item}
                {index < meta.length - 1 && <Text style={styles.metaDot}> · </Text>}
              </Text>
            ))}
          </View>

          {(recipe.mealtime || recipe.cuisine || recipe.tools.length > 0) && (
            <View style={styles.tagRow}>
              {recipe.cuisine && <Text style={[styles.chip, contentType('metadataSmall', recipe.cuisine)]}>{recipe.cuisine}</Text>}
              {recipe.mealtime && <Text style={styles.chip}>{mealtimeLabel(recipe.mealtime)}</Text>}
              {recipe.tools.length > 0 && (
                <Text style={[styles.tools, contentType('metadataSmall', recipe.tools.join(' '))]} numberOfLines={1}>
                  {t('detail.toolsPrefix')} · {recipe.tools.join(', ')}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.body}>
          {recipe.description && (
            <Text style={[styles.description, contentType('bodyRead', recipe.description)]}>
              {recipe.description}
            </Text>
          )}
          {error && <Text style={styles.error}>{t(error)}</Text>}

          <View style={styles.section}>
            {/* The `×4` on the right says what the quantities below are for.
                Without it a doubled recipe reads as a wrong one. */}
            <SectionHeader
              label={t('detail.ingredientsHeader')}
              count={`×${n(recipe.servings)}`}
            />
            {recipe.ingredients.map((ingredient, index) => {
              const key = ingredient.id ?? String(index)
              // A blank unit is a real answer — you don't measure onions in
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
            <SectionHeader label={t('detail.methodHeader')} count={n(steps.length)} />
            {steps.map((step) => (
              <View key={step.id ?? step.stepNumber} style={styles.step}>
                {/* Newsreader 15 Latin / Moul 13 Khmer, tamarind. Moul is far
                    heavier per em, which is why the Khmer size is smaller
                    rather than matched. */}
                <Text style={[styles.stepNumeral, language === 'km' && styles.stepNumeralKm]}>
                  {n(step.stepNumber)}
                </Text>
                <Text style={[styles.stepText, contentType('cookStep', step.instruction)]}>
                  {step.instruction}
                </Text>
              </View>
            ))}
          </View>

          {note && (
            <View style={styles.section}>
              <SectionHeader label={note.heading} />
              <Text style={[styles.description, contentType('bodyRead', note.text)]}>{note.text}</Text>
            </View>
          )}
          {footer && <View style={styles.footer}>{footer}</View>}
        </View>
      </ScrollView>

      {/* Sticky, over a fade rather than a hard edge — the one gradient in the
          product besides the hero scrim. It opens cook mode, which is what it
          has always said it does; it pointed at the *edit* screen while that
          screen didn't exist. Disabled on a recipe with no method, since there
          would be nothing to step through. */}
      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md }]}>
        <LinearGradient
          colors={[`${c.bg}00`, c.bg]}
          style={styles.ctaFade}
          pointerEvents="none"
        />
        <PrimaryButton
          label={t('detail.startCooking')}
          onPress={onCook}
          disabled={steps.length === 0}
        />
      </View>

    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    // Clears the sticky CTA. Without it the last step finishes underneath it.
    content: { paddingBottom: 120 },

    hero: { height: HERO_HEIGHT, backgroundColor: c.oat },
    heroActions: {
      position: 'absolute',
      left: spacing.gutter,
      right: spacing.gutter,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    heroRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    // `textOnPhoto` in both cases: the brightness underneath is unknown, so
    // neither `text` nor `primary` can be relied on to read against it.
    heroAction: { ...type.metadataSmall, color: c.textOnPhoto, textTransform: 'uppercase' },
    pressed: { opacity: 0.6 },

    back: { width: sizes.hitMin, height: sizes.hitMin, justifyContent: 'center' },
    chevronTop: {
      position: 'absolute',
      left: 2,
      top: 16,
      width: 11,
      height: 1.4,
      backgroundColor: c.textOnPhoto,
      transform: [{ rotate: '-45deg' }],
    },
    chevronBottom: {
      position: 'absolute',
      left: 2,
      bottom: 16,
      width: 11,
      height: 1.4,
      backgroundColor: c.textOnPhoto,
      transform: [{ rotate: '45deg' }],
    },

    titleBlock: {
      marginTop: -TITLE_LIFT,
      backgroundColor: c.bg,
      // Square along the bottom: it is the top of the page, not a card.
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 22,
      paddingTop: spacing.xl,
      gap: spacing.md,
    },
    title: { fontFamily: 'Newsreader_400Regular', fontSize: 32, lineHeight: 38, color: c.text },
    // 52 was 8pt short of Moul's own ink and clipped the hero title.
    titleKm: moulType(33),
    titleRule: { height: 0.5, backgroundColor: c.border },
    // Wraps rather than scrolls: four items plus separators overflow a narrow
    // phone in Khmer, and a meta line that scrolls sideways is a line people
    // never discover the end of.
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
    meta: { ...type.metadataSmall, color: c.text, textTransform: 'uppercase' },
    metaDot: { color: c.textPlaceholder },
    tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
      ...type.metadataSmall,
      color: c.primary,
      backgroundColor: c.accentSoft,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      textTransform: 'uppercase',
      overflow: 'hidden',
    },
    tools: { ...type.metadataSmall, color: c.textMuted, flexShrink: 1, textTransform: 'uppercase' },

    // The reading gutter, and the only place in the app it is used.
    body: { paddingHorizontal: spacing.readingGutter, paddingTop: spacing.xl, gap: spacing.xxl },
    // Colour only — a description is content, so its face comes from
    // `contentType` at the call site rather than from the interface language.
    description: { color: c.textMuted },
    section: {},

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
      fontFamily: 'Newsreader_500Medium',
      fontSize: 15,
      lineHeight: 24,
      color: c.primary,
      width: 20,
    },
    stepNumeralKm: { fontFamily: 'Moul_400Regular', fontSize: 13, lineHeight: 26 },
    stepText: { color: c.text, flex: 1, minWidth: 0 },

    footer: { alignItems: 'center', paddingTop: spacing.md },
    error: { ...type.body, color: c.danger },

    cta: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.md,
      backgroundColor: c.bg,
    },
    // The 28px fade the palette's header note names as the product's only
    // gradient besides the hero scrim. Positioned above the bar it belongs to,
    // so content dissolves into it rather than meeting an edge.
    ctaFade: { position: 'absolute', left: 0, right: 0, top: -28, height: 28 },
  })
