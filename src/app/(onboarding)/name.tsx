import { useState } from 'react'
import { useRouter } from 'expo-router'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Field from '@/components/ui/Field'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { MAX_NAME_LENGTH, useAuth } from '@/context/AuthContext'
import { useT } from '@/i18n'
import { spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * One field, and it's required.
 *
 * There's no Skip because skipping has an ugly, permanent-feeling outcome: the
 * display name falls back to the email's local part, so the dashboard greets
 * you as "mongkulratanak013" and your avatar initials are one letter. That
 * fallback is a safety net for accounts that predate this screen, not an
 * outcome worth offering.
 *
 * It's also not prefilled with that fallback. A filled field reads as already
 * answered, so most people would tap straight past it and land in the same
 * place while appearing to have chosen it.
 */
export default function NameScreen() {
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { updateDisplayName } = useAuth()
  const t = useT()

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = name.trim()

  async function handleContinue() {
    if (!trimmed) return
    setSaving(true)
    setError(null)
    try {
      await updateDisplayName(trimmed)
      router.push('/taste')
    } catch {
      // The only thing that can fail here is the name write, so a fixed string
      // says as much as the server's English message would have.
      setError(t('name.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, { paddingTop: insets.top + spacing.xxl }]}>
        <View style={styles.heading}>
          {/* The step number stays in Latin digits in both languages — see the
              numerals note in i18n/strings.ts. */}
          <Text style={styles.kicker}>{`01 — ${t('name.kicker')}`}</Text>
          <Text style={styles.title}>{t('name.title')}</Text>
          <Text style={styles.subtitle}>{t('name.subtitle')}</Text>
        </View>

        <Field
          label={t('name.label')}
          placeholder={t('name.placeholder')}
          value={name}
          onChangeText={(next) => {
            setName(next)
            if (error) setError(null)
          }}
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          maxLength={MAX_NAME_LENGTH}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.spacer} />

        <PrimaryButton
          label={t('common.continue')}
          onPress={handleContinue}
          loading={saving}
          // Disabled rather than validated-on-press: there is exactly one rule
          // and the button can just show it, so nobody has to tap to find out.
          disabled={!trimmed}
          style={{ marginBottom: Math.max(insets.bottom, spacing.lg) }}
        />
      </View>
    </KeyboardAvoidingView>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { flex: 1, paddingHorizontal: spacing.xl, gap: spacing.xl },
  heading: { gap: spacing.sm },
  // The Khmer scale already drops the mono face and the Latin tracking, so
  // there is no per-screen override left to make — see `typeKm` in the theme.
  kicker: { ...type.kicker, color: c.textMuted },
  title: { ...type.display, color: c.text },
  subtitle: { ...type.body, color: c.textMuted },
  error: { ...type.body, color: c.danger },
  spacer: { flex: 1 },
})
