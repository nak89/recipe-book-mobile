import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useLanguage, useT } from '@/i18n'
import { googleAuthErrorKey, startGoogleAuth } from '@/lib/googleAuth'
import { minHeights, radius, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

export default function GoogleAuthButton({ intent, disabled, onPendingChange }: {
  intent: Parameters<typeof startGoogleAuth>[0]
  disabled?: boolean
  onPendingChange?: (pending: boolean) => void
}) {
  const t = useT()
  const { language } = useLanguage()
  const styles = useThemedStyles(makeStyles)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ReturnType<typeof googleAuthErrorKey>>()
  const label = t(intent.destination === '/profile' ? 'auth.google.connect' : 'auth.google.continue')

  async function handlePress() {
    if (pending || disabled) return
    setPending(true)
    setError(undefined)
    onPendingChange?.(true)
    try {
      await startGoogleAuth(intent)
    } catch (err) {
      setError(googleAuthErrorKey(err && typeof err === 'object' && 'code' in err ? err.code : null))
    } finally {
      setPending(false)
      onPendingChange?.(false)
    }
  }

  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || pending, busy: pending }}
        disabled={disabled || pending}
        onPress={handlePress}
        style={({ pressed }) => [styles.button, (pressed || disabled || pending) && styles.dimmed]}
      >
        {pending ? <ActivityIndicator color={styles.label.color} /> : (
          <Image source={require('../../assets/images/google-g.png')} style={styles.logo} resizeMode="contain" />
        )}
        <Text style={[styles.label, language === 'en' && styles.english]}>{label}</Text>
      </Pressable>
      {error && <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>}
    </View>
  )
}

const makeStyles = (colors: ThemeColors, type: TypeScale) => StyleSheet.create({
  group: { gap: spacing.sm },
  // Google supplies the logo and the colors for the light button.
  button: {
    minHeight: minHeights.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: '#747775',
    backgroundColor: '#FFFFFF',
  },
  label: { ...type.body, flexShrink: 1, color: '#1F1F1F' },
  english: { fontFamily: 'Arial', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  logo: { width: 18, height: 18 },
  dimmed: { opacity: 0.65 },
  error: { ...type.body, color: colors.danger },
})
