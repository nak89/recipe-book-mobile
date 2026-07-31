import { useEffect, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '@/context/AuthContext'
import { getRecipe, updateRecipe } from '@/lib/api'
import RecipeForm from '@/components/RecipeForm'
import { spacing, type, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'
import type { Recipe, RecipeInput } from '@/types/recipe'

export default function EditRecipeScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()
  const router = useRouter()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load recipe')
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
        <Text style={styles.error}>{error ?? 'Recipe not found'}</Text>
      </View>
    )
  }

  return <RecipeForm initial={recipe} onSubmit={handleSubmit} submitLabel="Save changes" />
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: c.bg,
  },
  error: { ...type.body, color: c.danger, textAlign: 'center' },
})
