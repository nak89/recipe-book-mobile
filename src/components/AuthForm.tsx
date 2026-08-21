import { useState } from 'react'
import { useRouter } from 'expo-router'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import Field from '@/components/ui/Field'
import PrimaryButton from '@/components/ui/PrimaryButton'
import TextLink from '@/components/ui/TextLink'
import LanguageToggle from '@/components/ui/LanguageToggle'
import { MAX_NAME_LENGTH } from '@/context/AuthContext'
import { useT } from '@/i18n'
import { authErrorKey } from '@/i18n/errors'
import { spacing, useScreenTopPad, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/** The design's 3-segment strength meter, and the threshold it reports. */
const MIN_PASSWORD = 8

/**
 * Shared by sign-in and sign-up — the two screens differ in copy, in which auth
 * call they make, and in whether they collect a name.
 *
 * **The display name is collected here now.** It used to be its own onboarding
 * step after sign-up, which meant an account existed for a moment with no name
 * on it and a screen whose only job was one text field. Chronicle's § 4 puts it
 * on the form with the email and the password, where it costs one more row.
 *
 * Fields are `Field`, so there are no boxes: a label, the value, and a rule
 * whose weight is the state. That is also what removed the hand-rolled
 * `placeholderTextColor` and `keyboardAppearance` on every input — `Field` sets
 * both, which is why it exists.
 */
export default function AuthForm({
  heading,
  subheading,
  submitLabel,
  onSubmit,
  footerText,
  footerLinkText,
  footerHref,
  collectName = false,
}: {
  heading: string
  subheading: string
  submitLabel: string
  onSubmit: (email: string, password: string, name?: string) => Promise<void>
  footerText: string
  footerLinkText: string
  footerHref: '/login' | '/signup'
  /** Sign-up only. Adds the name row above the email. */
  collectName?: boolean
}) {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const router = useRouter()
  const topPad = useScreenTopPad()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  /**
   * Three segments, filled by length alone.
   *
   * Deliberately not an entropy estimate. A meter that grades character classes
   * teaches people to append `1!` rather than to choose a longer passphrase, and
   * the only rule this app actually enforces is the one Supabase enforces —
   * length. The meter reports what the form will reject, and nothing else.
   */
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < MIN_PASSWORD ? 2 : 3

  async function handleSubmit() {
    if (!email.trim() || !password || (collectName && !name.trim())) {
      setError(t('auth.missingFields'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(email.trim(), password, collectName ? name.trim() : undefined)
    } catch (err) {
      // Supabase's messages are English and not ours to change, so they're
      // mapped onto keys rather than shown raw — an unrecognised one falls back
      // to a generic *translated* message. See i18n/errors.ts.
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
        contentContainerStyle={[styles.content, { paddingTop: topPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Right-aligned above the heading, so it is the first thing found and
            the last thing read. It has to be reachable here and not only on the
            first-run picker: a returning user who reinstalls passes the picker
            once, and someone who tapped the wrong row there would otherwise have
            no way into Khmer until after signing in. */}
        <LanguageToggle style={styles.language} />

        <View style={styles.brand}>
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subheading}>{subheading}</Text>
        </View>

        <View style={styles.fields}>
          {collectName && (
            <Field
              label={t('first.name')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              maxLength={MAX_NAME_LENGTH}
              returnKeyType="next"
            />
          )}

          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="next"
          />

          <View>
            <View style={styles.passwordHeader}>
              <Text style={styles.passwordLabel}>{t('auth.password')}</Text>
              {/* `SHOW` as a tracked mono word rather than an eye glyph: the
                  glyph is the only pictogram left on the screen, and this is
                  the one place the design names a word instead. */}
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                <Text style={styles.showToggle}>
                  {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                </Text>
              </Pressable>
            </View>
            <Field
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            {collectName && (
              <View style={styles.meterRow}>
                <View style={styles.meter}>
                  {[1, 2, 3].map((segment) => (
                    <View
                      key={segment}
                      style={[styles.segment, strength >= segment && styles.segmentOn]}
                    />
                  ))}
                </View>
                <Text style={styles.meterHint}>{t('auth.passwordHint')}</Text>
              </View>
            )}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton
            label={submitLabel}
            onPress={handleSubmit}
            loading={submitting}
            style={styles.submit}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{footerText}</Text>
          {/* A `TextLink`, not expo-router's `Link`. `Link` renders an anchor
              whose underline is a text decoration, which on a Khmer label is
              drawn through the descender space where a subscript consonant
              sits — the same reason `LedgerRow` never strikes Khmer through. */}
          <TextLink label={footerLinkText} onPress={() => router.replace(footerHref)} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    /**
     * Top-aligned, **not centred**. `justifyContent: 'center'` held the form in
     * the middle of the viewport, which on a tall phone opened a screen's worth
     * of empty paper above the heading and the same again below the footer —
     * and centring a form that grows (the name row, an error line, the keyboard)
     * means it also drifts as you fill it in. `flexGrow` stays, so a short
     * screen still fills and the whole thing scrolls when the keyboard is up.
     */
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.gutterWide,
      paddingBottom: spacing.xxl,
      gap: spacing.xxl,
    },
    // `alignSelf` rather than a wrapper: the toggle sizes to its content, so
    // pushing it right is all the placement it needs.
    language: { alignSelf: 'flex-end' },
    // The tamarind app mark is gone. It was a filled 60pt square with a glyph
    // in it — the heaviest thing on a screen made of rules — and the heading
    // already names the product.
    brand: { gap: spacing.sm },
    heading: { ...type.screenTitle, color: c.text },
    subheading: { ...type.bodyRead, color: c.textMuted },
    fields: { gap: spacing.xl },

    passwordHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    passwordLabel: { ...type.sectionLabel, color: c.textMuted, textTransform: 'uppercase' },
    showToggle: { ...type.metadataSmall, color: c.primary, textTransform: 'uppercase' },

    meterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
    meter: { flexDirection: 'row', gap: 4, flex: 1, maxWidth: 120 },
    segment: { flex: 1, height: 3, borderRadius: 999, backgroundColor: c.borderStrong },
    segmentOn: { backgroundColor: c.primary },
    meterHint: { ...type.metadataSmall, color: c.textMuted, textTransform: 'uppercase' },

    error: { ...type.body, color: c.danger },
    submit: { marginTop: spacing.sm },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
    footerText: { ...type.body, color: c.textMuted },
  })
