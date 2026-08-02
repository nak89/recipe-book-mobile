import { useCallback, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { deleteRecipe, getRecipe, setFavourite } from '@/lib/api'
import { favouriteFeedback } from '@/lib/haptics'
import RecipeDetailSkeleton from '@/components/RecipeDetailSkeleton'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { emojiForCuisine } from '@/data/cuisines'
import { emojiForIngredient } from '@/data/ingredients'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useDifficultyLabel, useMealtimeLabel } from '@/i18n/labels'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { Recipe } from '@/types/recipe'

export default function RecipeDetailScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const mealtimeLabel = useMealtimeLabel()
  const difficultyLabel = useDifficultyLabel()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  // The *key*, not the translated sentence — so an error already on screen
  // re-renders in the new language when the toggle moves, and `t` never
  // becomes a dependency of the fetch effect.
  const [error, setError] = useState<StringKey | null>(null)
  const [confirming, setConfirming] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!token || !id) return
      let cancelled = false
      getRecipe(id, token)
        .then((data) => {
          if (cancelled) return
          // Coming back from an edit you cancelled re-fetches the same recipe.
          // Bail out rather than remount the hero, the ingredients and the steps
          // over the top of the screen transition — see the dashboard for why.
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

  async function handleToggleFavourite() {
    if (!token || !recipe) return
    const next = !recipe.isFavourite
    favouriteFeedback()
    setRecipe({ ...recipe, isFavourite: next })
    try {
      await setFavourite(recipe.id, next, token)
    } catch {
      setRecipe({ ...recipe, isFavourite: !next })
    }
  }

  async function handleDelete() {
    if (!token || !recipe) return
    try {
      await deleteRecipe(recipe.id, token)
      router.back()
    } catch (err) {
      setError(apiErrorKey(err))
    }
  }

  // `!= null` rather than truthiness — a genuine 0 g of fat is a fact worth
  // showing, and dropping it would be a silent lie about the recipe.
  const nutrition = recipe
    ? ([
        { label: t('detail.calories'), value: recipe.calories, unit: 'kcal' },
        { label: t('detail.protein'), value: recipe.protein, unit: 'g' },
        { label: t('detail.carbs'), value: recipe.carbs, unit: 'g' },
        { label: t('detail.fat'), value: recipe.fat, unit: 'g' },
      ].filter((stat) => stat.value != null) as { label: string; value: number; unit: string }[])
    : []

  if (loading) return <RecipeDetailSkeleton />
  if (!recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ? t(error) : t('detail.notFound')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={recipe.photoUrl ? { uri: recipe.photoUrl } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={[c.scrimStrong, c.scrimNone]}
            locations={[0, 0.5]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.heroActions, { top: insets.top + spacing.sm }]}>
            <Pressable
              onPress={() => router.back()}
              style={styles.circleButton}
              accessibilityLabel={t('detail.back')}
            >
              <Ionicons name="chevron-back" size={22} color={c.textOnPhoto} />
            </Pressable>
            <Pressable
              onPress={handleToggleFavourite}
              style={styles.circleButton}
              accessibilityLabel={
                recipe.isFavourite ? t('detail.removeFavourite') : t('detail.addFavourite')
              }
            >
              <Ionicons
                name={recipe.isFavourite ? 'heart' : 'heart-outline'}
                size={20}
                color={recipe.isFavourite ? c.favourite : c.textOnPhoto}
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{recipe.title}</Text>

          <View style={styles.metaRow}>
            <Meta icon="time-outline" label={`${recipe.totalMinutes} ${t('detail.minutes')}`} />
            <Meta icon="restaurant-outline" label={`${recipe.servings} ${t('detail.servings')}`} />
            <Meta icon="speedometer-outline" label={difficultyLabel(recipe.difficulty)} />
          </View>

          {(recipe.mealtime || recipe.cuisine) && (
            <View style={styles.tagRow}>
              {recipe.mealtime && <Text style={styles.tag}>{mealtimeLabel(recipe.mealtime)}</Text>}
              {recipe.cuisine && (
                <Text style={styles.tag}>
                  {emojiForCuisine(recipe.cuisine)} {recipe.cuisine}
                </Text>
              )}
            </View>
          )}

          {recipe.description && <Text style={styles.description}>{recipe.description}</Text>}

          {error && <Text style={styles.error}>{t(error)}</Text>}

          {recipe.tools.length > 0 && (
            <Section title={t('detail.tools')}>
              <Text style={styles.paragraph}>{recipe.tools.join(' · ')}</Text>
            </Section>
          )}

          {/* Only the stats that were filled in, and no section at all when
              none were — nutrition is optional and most recipes won't have it,
              so an empty heading would be on more screens than a full one. */}
          {nutrition.length > 0 && (
            <Section title={t('detail.nutrition')}>
              <Text style={styles.sectionCaption}>{t('detail.perServing')}</Text>
              <View style={styles.nutritionRow}>
                {nutrition.map((stat) => (
                  <View key={stat.label} style={styles.nutritionTile}>
                    <Text style={styles.nutritionValue}>
                      {formatAmount(stat.value)}
                      <Text style={styles.nutritionUnit}> {stat.unit}</Text>
                    </Text>
                    <Text style={styles.nutritionLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          <Section title={t('detail.ingredients')}>
            {recipe.ingredients.map((ingredient, index) => (
              <View key={ingredient.id ?? index} style={styles.ingredient}>
                <Text style={styles.ingredientEmoji}>{emojiForIngredient(ingredient.name)}</Text>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
                <Text style={styles.ingredientAmount}>
                  {ingredient.quantity} {ingredient.unit}
                </Text>
              </View>
            ))}
          </Section>

          <Section title={t('detail.steps')}>
            {[...recipe.steps]
              .sort((a, b) => a.stepNumber - b.stepNumber)
              .map((step) => (
                <View key={step.id ?? step.stepNumber} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                  </View>
                  <Text style={styles.stepText}>{step.instruction}</Text>
                </View>
              ))}
          </Section>

          <View style={styles.actions}>
            <PrimaryButton
              label={t('detail.editRecipe')}
              onPress={() => router.push(`/recipe/${recipe.id}/edit`)}
              style={styles.action}
            />
            <PrimaryButton
              label={t('common.delete')}
              variant="danger"
              onPress={() => setConfirming(true)}
              style={styles.action}
            />
          </View>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        title={t('dashboard.deleteTitle')}
        message={`“${recipe.title}” — ${t('dashboard.deleteMessage')}`}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          handleDelete()
        }}
      />
    </View>
  )
}

/**
 * One decimal at most. The columns are doubles, so a value entered as 12.3 can
 * come back as 12.299999999999999 — a number nobody typed and nobody wants to
 * read on a recipe card.
 */
function formatAmount(value: number): string {
  return String(Math.round(value * 10) / 10)
}

function Meta({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.meta}>
      <Ionicons name={icon} size={14} color={c.textMuted} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: c.bg,
  },
  content: { paddingBottom: spacing.xxl },
  hero: { height: 300, backgroundColor: c.surfaceSunken },
  heroActions: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pulled up over the photo so the sheet reads as sitting on top of it.
  body: {
    marginTop: -spacing.xl,
    backgroundColor: c.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { ...type.display, color: c.text },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { ...type.body, color: c.textMuted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    ...type.caption,
    color: c.text,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  description: { ...type.bodyRead, color: c.textMuted },
  error: { ...type.body, color: c.danger },
  section: { gap: spacing.sm, marginTop: spacing.lg },
  sectionTitle: { ...type.section, color: c.text },
  sectionCaption: { ...type.caption, color: c.textMuted },
  paragraph: { ...type.body, color: c.textMuted },
  nutritionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // Content-sized with a floor, deliberately not `flex: 1`. Stretching to fill
  // turns a recipe that only knows its calories into one full-width slab —
  // the same failure the dashboard grid's null filler item exists to prevent.
  nutritionTile: {
    minWidth: 72,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  nutritionValue: { ...type.bodyStrong, color: c.text },
  nutritionUnit: { ...type.caption, color: c.textMuted },
  nutritionLabel: { ...type.caption, color: c.textMuted },
  ingredient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  ingredientEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  ingredientName: { ...type.body, color: c.text, flex: 1, minWidth: 0 },
  ingredientAmount: { ...type.bodyStrong, color: c.textMuted },
  step: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { ...type.caption, color: c.onPrimary },
  stepText: { ...type.bodyRead, color: c.text, flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  action: { flex: 1 },
})
