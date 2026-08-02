import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import PrimaryButton from '@/components/ui/PrimaryButton'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { useT } from '@/i18n'
import { authErrorKey } from '@/i18n/errors'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Shared by login and signup — the two screens differ only in copy and which
 * auth call they make.
 *
 * Every input sets `placeholderTextColor` explicitly. Leaving it unset renders
 * placeholders in the platform default, which is what made these boxes look
 * empty on a phone whose system theme wasn't light.
 */
export default function AuthForm({
  heading,
  subheading,
  submitLabel,
  onSubmit,
  footerText,
  footerLinkText,
  footerHref,
}: {
  heading: string
  subheading: string
  submitLabel: string
  onSubmit: (email: string, password: string) => Promise<void>
  footerText: string
  footerLinkText: string
  footerHref: '/login' | '/signup'
}) {
  const { colors: c, isDark } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError(t('auth.missingFields'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(email.trim(), password)
    } catch (err) {
      // Supabase's messages are English and not ours to change, so they're
      // mapped onto keys rather than shown raw — an unrecognised one falls
      // back to a generic *translated* message. See i18n/errors.ts.
      setError(t(authErrorKey(err)))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Above the brand and right-aligned, so it's the first thing found and
            the last thing read. It has to be reachable here and not only on the
            intro carousel: a returning user who reinstalls skips straight past
            the carousel to this screen, and without a control here there'd be no
            way into Khmer at all before signing in. */}
        <LanguageToggle style={styles.language} />

        <View style={styles.brand}>
          <View style={styles.mark}>
            <Ionicons name="restaurant" size={26} color={c.onPrimary} />
          </View>
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subheading}>{subheading}</Text>
        </View>

        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.email')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={c.textPlaceholder}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('auth.password')}</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder={t('auth.passwordPlaceholder')}
                placeholderTextColor={c.textPlaceholder}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={c.textMuted}
                />
              </Pressable>
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton label={submitLabel} onPress={handleSubmit} loading={submitting} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerText}</Text>
          <Link href={footerHref} style={styles.footerLink}>
            {footerLinkText}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xxl },
  // `alignSelf` rather than a wrapper: the toggle sizes to its content, so
  // pushing it right is all the placement it needs. Negative bottom margin
  // absorbs the content gap, keeping it visually attached to the top of the
  // screen instead of floating a third of the way down beside the brand.
  language: { alignSelf: 'flex-end', marginBottom: -spacing.lg },
  brand: { alignItems: 'center', gap: spacing.sm },
  mark: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heading: { ...type.display, color: c.text, textAlign: 'center' },
  subheading: { ...type.body, color: c.textMuted, textAlign: 'center' },
  fields: { gap: spacing.lg },
  field: { gap: spacing.sm },
  label: { ...type.label, color: c.text },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    ...type.body,
    fontSize: 16,
    color: c.text,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  // minWidth: 0 so a long password can't push the eye toggle off the edge.
  passwordInput: { flex: 1, minWidth: 0, ...type.bodyLarge, color: c.text },
  error: { ...type.body, color: c.danger },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs },
  footerText: { ...type.body, color: c.textMuted },
  footerLink: { ...type.bodyStrong, color: c.text },
})
