import { useCallback, useRef, useState } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { deleteRecipe, getCachedRecipe, getRecipe, setFavourite } from '@/lib/api'
import { favouriteFeedback } from '@/lib/haptics'
import BlankLoadingState from '@/components/ui/BlankLoadingState'
import RecipeReadingPage from '@/components/RecipeReadingPage'
import RecipeShareDialog from '@/components/RecipeShareDialog'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import TextLink from '@/components/ui/TextLink'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { Recipe } from '@/types/recipe'

export default function RecipeDetailScreen() {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()
  const router = useRouter()

  const [recipe, setRecipe] = useState<Recipe | null>(() => getCachedRecipe(id, token) ?? null)
  const [loading, setLoading] = useState(() => getCachedRecipe(id, token) === undefined)
  // The *key*, not the translated sentence — so an error already on screen
  // re-renders in the new language when the toggle moves, and `t` never becomes
  // a dependency of the fetch effect.
  const [error, setError] = useState<StringKey | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [favouritePending, setFavouritePending] = useState(false)
  const favouriteRequest = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (!token || !id) return
      let cancelled = false
      getRecipe(id, token)
        .then((data) => {
          if (cancelled) return
          // Coming back from an edit you cancelled re-fetches the same recipe.
          // Bail out rather than remount the hero, the ingredients and the steps
          // over the top of the screen transition — see the index for why.
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
    if (!token || !recipe || favouriteRequest.current) return
    const recipeId = recipe.id
    const next = !recipe.isFavourite
    favouriteRequest.current = true
    setFavouritePending(true)
    setError(previous => previous === 'error.favourite' ? null : previous)
    favouriteFeedback()
    setRecipe(current => current?.id === recipeId ? { ...current, isFavourite: next } : current)
    try {
      const updated = await setFavourite(recipeId, next, token)
      setRecipe(current => current?.id === recipeId ? { ...current, isFavourite: updated.isFavourite } : current)
    } catch {
      setRecipe(current => current?.id === recipeId ? { ...current, isFavourite: !next } : current)
      setError('error.favourite')
    } finally {
      favouriteRequest.current = false
      setFavouritePending(false)
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

  if (loading) return <BlankLoadingState />
  if (!recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error ? t(error) : t('detail.notFound')}</Text>
      </View>
    )
  }

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  return (
    <>
      <RecipeReadingPage
        key={recipe.id}
        recipe={recipe}
        error={error}
        onBack={goBack}
        onCook={() => router.push(`/recipe/${recipe.id}/cook`)}
        actions={[
          ...((__DEV__ || process.env.EXPO_PUBLIC_RECIPE_SHARE_ENABLED === 'true') ? [
            { icon: 'share-outline' as const, label: t('recipeShare.action'), onPress: () => setSharing(true) },
          ] : []),
          { icon: 'create-outline', label: t('detail.editRecipe'), onPress: () => router.push(`/recipe/${recipe.id}/edit`) },
        ]}
        favourite={{ selected: recipe.isFavourite, pending: favouritePending, onPress: handleToggleFavourite }}
        footer={<TextLink label={t('common.delete')} onPress={() => setConfirming(true)} />}
      />
      {sharing && token && <RecipeShareDialog id={recipe.id} token={token} onClose={() => setSharing(false)} />}
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
    </>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.gutter },
  error: { ...type.body, color: c.danger },
})
