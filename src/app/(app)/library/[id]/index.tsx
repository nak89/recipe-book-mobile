import { useCallback, useState } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Linking, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { copyLibraryRecipe, getLibraryRecipe, type LibraryRecipe } from '@/lib/api'
import { numberLibrarySteps } from '@/lib/libraryRecipe'
import { favouriteFeedback } from '@/lib/haptics'
import BlankLoadingState from '@/components/ui/BlankLoadingState'
import RecipeReadingPage from '@/components/RecipeReadingPage'
import TextLink from '@/components/ui/TextLink'
import { useT, type StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { spacing, useScreenTopPad, useThemedStyles, type ThemeColors, type TypeScale } from '@/theme'

export default function LibraryRecipeScreen() {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { token } = useAuth()
  const router = useRouter()
  const topPad = useScreenTopPad()
  const [recipe, setRecipe] = useState<LibraryRecipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<StringKey | null>(null)
  const [copying, setCopying] = useState(false)

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

  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/explore')
  }

  async function handleCopy() {
    if (!token || !recipe || copying) return
    if (recipe.savedRecipeId) {
      router.push(`/recipe/${recipe.savedRecipeId}`)
      return
    }
    setCopying(true)
    setError(null)
    try {
      const created = await copyLibraryRecipe(recipe.id, token)
      setRecipe({ ...recipe, savedRecipeId: created.id })
      favouriteFeedback()
      router.push(`/recipe/${created.id}`)
    } catch (err) {
      setError(apiErrorKey(err))
    } finally {
      setCopying(false)
    }
  }

  if (loading) return <BlankLoadingState />
  if (!recipe) return (
    <View style={[styles.missing, { paddingTop: topPad }]}>
      <Text style={styles.error}>{t(error ?? 'error.generic')}</Text>
      <TextLink label={t('detail.back')} onPress={goBack} />
    </View>
  )

  return (
    <RecipeReadingPage
      key={recipe.id}
      recipe={{ ...recipe, mealtime: recipe.mealtime ?? undefined, steps: numberLibrarySteps(recipe.steps) }}
      error={error}
      onBack={goBack}
      onCook={() => router.push(`/library/${recipe.id}/cook`)}
      actions={[
        { label: t(recipe.localPreview ? 'explore.localPreview' : recipe.illustrated ? 'explore.illustrated' : 'explore.byChefNak') },
        {
          label: t(copying ? 'explore.copying' : recipe.savedRecipeId ? 'explore.inYourBook' : 'common.save'),
          accessibilityLabel: t(recipe.savedRecipeId ? 'explore.openCopy' : 'explore.copyToBook'),
          disabled: copying,
          onPress: handleCopy,
        },
      ]}
      note={{ heading: t(recipe.illustrated ? 'explore.previewNote' : 'explore.chefsNote'), text: recipe.note }}
      footer={<TextLink
        label={t(recipe.illustrated ? 'explore.recipeSource' : 'explore.sourceLine')}
        onPress={() => Linking.openURL(recipe.source).catch(() => setError('error.generic'))}
      />}
    />
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  missing: { flex: 1, backgroundColor: c.bg, alignItems: 'center', gap: spacing.md },
  error: { ...type.body, color: c.danger },
})
