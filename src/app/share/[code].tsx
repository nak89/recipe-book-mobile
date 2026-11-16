import { useCallback, useRef, useState } from 'react'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { Platform, StyleSheet, View } from 'react-native'
import RecipeReadingPage from '@/components/RecipeReadingPage'
import BlankLoadingState from '@/components/ui/BlankLoadingState'
import NavigationButton from '@/components/ui/NavigationButton'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { ApiError, copySharedRecipe, getSharedRecipe } from '@/lib/api'
import { clearPendingSharedRecipe, isSharedRecipeCode, rememberSharedRecipe } from '@/lib/sharedRecipeLink'
import { spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { SharedRecipe } from '@/types/recipe'

export default function SharedRecipeScreen() {
  const { code } = useLocalSearchParams()
  const validCode = isSharedRecipeCode(code) ? code : undefined
  const [attempt, setAttempt] = useState(0)
  return <SharedRecipePreview key={`${validCode ?? 'invalid'}:${attempt}`} code={validCode} onRetry={() => setAttempt(value => value + 1)} />
}

function SharedRecipePreview({ code, onRetry }: { code?: string; onRetry: () => void }) {
  const router = useRouter()
  const t = useT()
  const styles = useThemedStyles(makeStyles)
  const { token, onboarded, loading: authLoading } = useAuth()
  const [recipe, setRecipe] = useState<SharedRecipe>()
  const [readError, setReadError] = useState<'missing' | 'failed'>()
  const [saveError, setSaveError] = useState<StringKey | null>(null)
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)
  useFocusEffect(useCallback(() => {
    if (!code) return
    clearPendingSharedRecipe()
    const controller = new AbortController()
    void getSharedRecipe(code, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return
        setReadError(undefined)
        setRecipe(result)
      })
      .catch(error => {
        if (!controller.signal.aborted) setReadError(error instanceof ApiError && error.status === 404 ? 'missing' : 'failed')
      })
    return () => controller.abort()
  }, [code]))

  function close() {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  async function save() {
    if (authLoading || !code || inFlight.current) return
    if (!token || !onboarded) {
      rememberSharedRecipe(code)
      router.replace(token ? '/taste' : '/login')
      return
    }
    inFlight.current = true
    setSaving(true)
    setSaveError(null)
    try {
      const result = await copySharedRecipe(code, token)
      router.replace({ pathname: '/recipe/[id]', params: { id: result.id } })
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined
      if (status === 404) setReadError('missing')
      else setSaveError(status === 409 ? 'recipeShare.duplicate' : status === 422 ? 'recipeShare.photoRequired' : 'recipeShare.failed')
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <>
      {Platform.OS === 'web' && <>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </>}
      {!code || readError ? (
        <View style={styles.message}>
          <Text accessibilityRole="header" style={styles.title}>
            {t(!code || readError === 'missing' ? 'recipeShare.unavailable' : 'recipeShare.failed')}
          </Text>
          {code && readError === 'failed' && <PrimaryButton label={t('common.retry')} onPress={onRetry} />}
          <NavigationButton action="close" onPress={close} />
        </View>
      ) : recipe ? (
        <RecipeReadingPage
          key={code}
          recipe={recipe}
          actions={[]}
          error={saveError}
          onBack={close}
          onSaveCopy={save}
          savingCopy={saving || authLoading}
        />
      ) : <BlankLoadingState />}
    </>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  message: { flex: 1, justifyContent: 'center', padding: spacing.gutter, gap: spacing.md },
  title: { ...type.section, color: c.text },
})
