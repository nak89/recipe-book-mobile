import { Redirect } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { Text } from '@/components/ui/Text'
import { useT } from '@/i18n'
import { finishGoogleAuth, googleAuthEnabled } from '@/lib/googleAuth'
import { spacing, useScreenTopPad, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

type Result = Awaited<ReturnType<typeof finishGoogleAuth>>

export default function AuthCallback() {
  const [result, setResult] = useState<Result>()
  const [leaving, setLeaving] = useState(false)
  const completion = useRef<Promise<Result> | undefined>(undefined)
  const t = useT()
  const topPad = useScreenTopPad()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()

  useEffect(() => {
    if (!googleAuthEnabled) return
    let active = true
    // An effect replay must observe the same exchange, since the code is single use.
    completion.current ??= finishGoogleAuth()
    void completion.current.then(value => {
      if (active) setResult(value)
    })
    return () => { active = false }
  }, [])

  if (!googleAuthEnabled) return <Redirect href="/login" />
  if (result && (!result.error || leaving)) return <Redirect href={result.destination} />

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: topPad }]}>
      <Text accessibilityRole="header" style={styles.title}>{t('auth.google.heading')}</Text>
      {result?.error ? (
        <>
          <Text accessibilityRole="alert" style={styles.message}>{t(result.error)}</Text>
          <PrimaryButton
            label={t(result.destination === '/profile' ? 'auth.google.backToProfile' : 'common.back')}
            onPress={() => setLeaving(true)}
            variant="outline"
          />
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.text} />
          <Text accessibilityLiveRegion="polite" style={styles.message}>{t('auth.google.finishing')}</Text>
        </>
      )}
    </ScrollView>
  )
}

const makeStyles = (colors: ThemeColors, type: TypeScale) => StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: spacing.gutterWide, paddingBottom: spacing.xxl, gap: spacing.lg },
  title: { ...type.screenTitle, color: colors.text },
  message: { ...type.bodyRead, color: colors.text },
})
