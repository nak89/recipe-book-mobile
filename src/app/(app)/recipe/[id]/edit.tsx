import { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { getRecipe, updateRecipe } from '@/lib/api'
import RecipeForm from '@/components/RecipeForm'
import { spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import type { Recipe, RecipeInput } from '@/types/recipe'

export default function EditRecipeScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  // The *key*, not the translated sentence — so an error already on screen
  // re-renders in the new language when the toggle moves, and `t` never
  // becomes a dependency of the fetch effect.
  const [error, setError] = useState<StringKey | null>(null)

  // Fetch once, not on every focus: RecipeForm seeds its state from `initial`,
  // and a refetch mid-edit would be wasted work at best.
  useEffect(() => {
    if (!token || !id) return
    let cancelled = false
    getRecipe(id, token)
      .then((data) => {
        if (!cancelled) setRecipe(data)
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

  async function handleSubmit(data: RecipeInput) {
    if (!token || !id) return
    await updateRecipe(id, data, token)
    router.back()
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={c.primary} />
      </View>
    )
  }
  if (error || !recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ? t(error) : t('detail.notFound')}</Text>
      </View>
    )
  }

  return <RecipeForm initial={recipe} onSubmit={handleSubmit} submitLabel="form.saveChanges" />
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: c.bg,
  },
  error: { ...type.body, color: c.danger, textAlign: 'center' },
})
