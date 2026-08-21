import { useCallback, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '@/components/ui/Text'
import type { StyleProp, TextStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MAX_NAME_LENGTH, useAuth } from '@/context/AuthContext'
import { getRecipes } from '@/lib/api'
import { resetSeenIntro } from '@/lib/onboarding'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LedgerRow from '@/components/ui/LedgerRow'
import PrimaryButton from '@/components/ui/PrimaryButton'
import SectionHeader from '@/components/ui/SectionHeader'
import SettingRow from '@/components/ui/SettingRow'
import StatTile from '@/components/ui/StatTile'
import { initials } from '@/components/ui/ProfileButton'
import { useLanguage, useNum, useT } from '@/i18n'
import { contentType, inputType, minHeights, radius, sized, sizes, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { Recipe } from '@/types/recipe'

export default function ProfileScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const { language, setLanguage } = useLanguage()
  const { token, displayName, email, memberSince, logout, updateDisplayName, resetOnboarding } =
    useAuth()
  const insets = useSafeAreaInsets()
  const mark = initials(displayName)

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [resetting, setResetting] = useState(false)

  useFocusEffect(
    useCallback(() => {
      if (!token) return
      let cancelled = false
      getRecipes(token)
        .then((data) => {
          if (!cancelled) setRecipes(data)
        })
        .catch(() => {
          // Stats are decoration — a failure here shouldn't block the profile.
        })
      return () => {
        cancelled = true
      }
    }, [token])
  )

  const favouriteCount = recipes.filter((r) => r.isFavourite).length
  const totalMinutes = recipes.reduce((sum, r) => sum + r.totalMinutes, 0)

  /**
   * Puts the device and the account back to the state a brand-new install is
   * in, then lets the guards do the navigating.
   *
   * Order is the whole trick. `resetOnboarding` needs a live session, so it has
   * to run before the sign-out; the intro flag has to be cleared before it too,
   * because the `(auth)` layout reads that flag the instant the session goes
   * and sends you to `/intro` rather than `/login` only if it's already false.
   * No `router` call here at all — the three layout guards route this on their
   * own, and racing them is how you get a redirect loop.
   */
  async function handleDevReset() {
    if (resetting) return
    setResetting(true)
    try {
      await resetOnboarding()
    } catch {
      // A flag we couldn't clear leaves the account onboarded, which shows up
      // as landing on the dashboard after signing back in. Not worth abandoning
      // the sign-out over — the rest of the reset is still useful.
    }
    await resetSeenIntro()
    try {
      await logout()
    } finally {
      // Normally this screen is already gone by now — but a sign-out that fails
      // would otherwise leave the button reading "Starting fresh…" for good.
      setResetting(false)
    }
  }

  async function handleSaveName() {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setError(t('profile.nameEmpty'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateDisplayName(trimmed)
      setEditing(false)
    } catch {
      // The server's message is English and this is a save that just failed —
      // the worst moment to show a language the user can't read. The one thing
      // that can go wrong here is the name write, so a fixed string says as much
      // as the original did.
      setError(t('profile.nameSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* A plain ScrollView, and no dock clearance: profile is pushed over the
          tabs rather than being one, so nothing floats above its last row.
          `insets.bottom` still applies — the Stack header covers the top. */}
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            {/* Face from the initial, not from the interface language — see
                `ui/ProfileButton.tsx`. In Khmer the language-keyed scale puts
                `screenTitle` in **Moul**, so a Latin initial was being set in a
                heavy Khmer display face the moment you switched. */}
            <Text style={[styles.avatarText, sized(contentType('screenTitle', mark), 20)]}>
              {mark}
            </Text>
          </View>

          {editing ? (
            <View style={styles.nameEditor}>
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder={t('profile.yourName')}
                placeholderTextColor={c.textPlaceholder}
                keyboardAppearance="light"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                maxLength={MAX_NAME_LENGTH}
              />
              <View style={styles.nameActions}>
                <PrimaryButton
                  label={t('common.cancel')}
                  variant="outline"
                  style={styles.nameButton}
                  onPress={() => {
                    setDraftName(displayName)
                    setEditing(false)
                    setError(null)
                  }}
                />
                <PrimaryButton
                  label={t('common.save')}
                  loading={saving}
                  style={styles.nameButton}
                  onPress={handleSaveName}
                />
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setDraftName(displayName)
                setEditing(true)
              }}
              style={styles.nameRow}
              accessibilityRole="button"
              accessibilityLabel={t('profile.editName')}
            >
              {/* Same rule, and the same bug: a name is content, so it keeps
                  the script it was written in whichever way the toggle is set. */}
              <Text style={[styles.name, contentType('screenTitle', displayName)]}>
                {displayName}
              </Text>
              <Ionicons name="pencil" size={15} color={c.textMuted} />
            </Pressable>
          )}

          {/* One mono line under the name, per the design: the address and the
              size of the book. Uppercased unconditionally — Khmer has no letter
              case, so the transform is a no-op there rather than a branch. */}
          <Text style={styles.identityMeta}>
            {[email?.toUpperCase(), `${n(recipes.length)} ${t('settings.recipeCount')}`]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.stats}>
          <StatTile label={t('profile.recipes')} value={n(recipes.length)} />
          <StatTile label={t('profile.favourites')} value={n(favouriteCount)} />
          <StatTile
            label={t('profile.totalTime')}
            value={n(totalMinutes >= 60 ? `${Math.round(totalMinutes / 60)}h` : `${totalMinutes}m`)}
          />
        </View>

        {/**
          * **The two language rows are the switch, not a link to one.**
          *
          * This was a chevron opening an ActionSheet. Chronicle puts both
          * options on the page with a `◆` marking the active one, and the
          * change is not cosmetic: a sheet names the current language in the
          * current language, so someone who has landed in the wrong one has to
          * read the wrong one to escape it. Two rows, each in its own script,
          * are legible whichever way round you are — the same reasoning that
          * makes the masthead's toggle the one place both scripts appear.
          */}
        <View style={styles.section}>
          <SectionHeader label={t('settings.language')} />
          <LanguageRow
            label="ខ្មែរ"
            labelStyle={styles.optionKm}
            active={language === 'km'}
            onPress={() => setLanguage('km')}
          />
          <LanguageRow
            label="English"
            labelStyle={styles.optionEn}
            active={language === 'en'}
            onPress={() => setLanguage('en')}
            last
          />
        </View>

        {memberSince && (
          <View style={styles.section}>
            <SectionHeader label={t('settings.about')} />
            <LedgerRow
              title={t('profile.memberSince')}
              /* `undefined` locale on purpose — the month follows the *phone*
                 rather than the in-app language. Hermes ships a reduced ICU, so
                 forcing 'km-KH' risks a silent fall back to English anyway, and
                 a phone-native month name beats a wrong one.

                 Wrapped in `n` so the *year* still follows the app. The two
                 rules don't collide: `n` only touches digits, and the README
                 lists dates among the things whose numerals switch. */
              value={n(
                memberSince.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
              )}
              last
            />
          </View>
        )}

        {/* The dark-mode switch stood here. It went with the palette it
            controlled — Chronicle is a printed page, and there is no second
            palette to switch to. `profile.darkMode` is now an unused string. */}

        {/* "How it works" pointed at the tutorial, which is gone. Chronicle
            explains the app on the pre-auth "what it does" screen instead, and
            that one is not replayable — it sits before sign-in, so linking back
            to it from a signed-in screen would mean routing out of `(app)` into
            `(auth)`, which the three guards are built to make impossible.
            `profile.howItWorks` is now an unused string, like `profile.darkMode`
            above it. */}

        {/* Development only — `__DEV__` is false in any release build, so this
            never ships. It's here because the flow it replays is otherwise
            reachable only by making a new account: the flag that suppresses it
            lives on the Supabase user, so logging out alone doesn't bring it
            back. No confirm, deliberately: it's a button you press dozens of
            times an afternoon, and everything it clears is onboarding state. */}
        {__DEV__ && (
          <SettingRow
            icon="construct-outline"
            label={resetting ? 'Starting fresh…' : 'Start fresh (dev only)'}
            hint="Clears this account’s onboarding, logs out, replays the intro"
            dashed
            onPress={handleDevReset}
          />
        )}

        <PrimaryButton
          label={t('profile.logOut')}
          variant="danger"
          onPress={() => setConfirmLogout(true)}
          style={styles.logout}
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmLogout}
        title={t('profile.logOutTitle')}
        message={t('profile.logOutMessage')}
        confirmLabel={t('profile.logOut')}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false)
          logout()
        }}
      />

    </KeyboardAvoidingView>
  )
}

/**
 * One of the two language rows: the name in its own script, and a `◆` on the
 * right that is tamarind when active and `inactive` when not.
 *
 * The label is **not** translated and **not** set from the active type scale —
 * both would defeat the point. `ខ្មែរ` written in Newsreader is a Khmer word in
 * a face with no Khmer glyphs, which is the silent-substitution failure the
 * README warns about; `English` set in Kantumruy is the same mistake pointed the
 * other way.
 */
function LanguageRow({
  label,
  labelStyle,
  active,
  onPress,
  last,
}: {
  label: string
  labelStyle: StyleProp<TextStyle>
  active: boolean
  onPress: () => void
  last?: boolean
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.languageRow,
        !last && styles.languageRuled,
        pressed && styles.languagePressed,
      ]}
    >
      <Text style={[labelStyle, styles.languageLabel]}>{label}</Text>
      <Text style={[styles.diamond, active ? styles.diamondOn : styles.diamondOff]}>
        {active ? '◆' : '◇'}
      </Text>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl,
    gap: spacing.sectionSpacing,
  },
  identity: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  // 56, per the design, and **outlined rather than filled**. A tamarind disc at
  // 88 was the single heaviest mark in the product, on a screen that is
  // otherwise nothing but rules — the monogram reads perfectly well in ink.
  avatar: {
    width: sizes.mark,
    height: sizes.mark,
    borderRadius: '50%',
    borderWidth: 1.2,
    borderColor: c.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  // Colour only; `contentType` supplies every type property at the call site.
  avatarText: { color: c.text },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: c.text },
  identityMeta: { ...type.metadataSmall, color: c.textMuted, textAlign: 'center' },

  section: {},
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: sizes.hitMin,
    paddingVertical: spacing.rowY,
  },
  languageRuled: { borderBottomWidth: 0.5, borderBottomColor: c.border },
  languagePressed: { opacity: 0.6 },
  languageLabel: { color: c.text, flex: 1, minWidth: 0 },
  // Kantumruy 20 / Newsreader 21, the design's own pair — Khmer is set a point
  // *smaller* than the Latin here rather than larger, because at this size
  // Kantumruy's larger x-height already matches Newsreader's optical weight.
  optionKm: { fontFamily: 'KantumruyPro_500Medium', fontSize: 20, lineHeight: 34 },
  optionEn: { fontFamily: 'Newsreader_400Regular', fontSize: 21, lineHeight: 28 },
  diamond: { fontSize: 13 },
  diamondOn: { color: c.primary },
  diamondOff: { color: c.inactive },
  error: { ...type.body, color: c.danger },
  nameEditor: { width: '100%', gap: spacing.sm },
  nameInput: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    // A floor plus padding, never a fixed `height` — the rule `minHeights`
    // states. At 52 flat this box clipped its own text the moment the line grew:
    // Khmer's `body` line box is 26pt before any OS scaling, and a phone with
    // Larger Text on took it past the wall. `sized`, not a bare `fontSize`
    // override, so the line box comes down with the size instead of leaving
    // 16pt text spaced for a 26pt line.
    minHeight: minHeights.field,
    paddingVertical: spacing.sm,
    // `inputType` drops the line box on the way in — one line, so the pin can
    // only clip the descenders, and `minHeights.field` already holds the height.
    ...inputType(sized(type.body, 16)),
    color: c.text,
    textAlign: 'center',
  },
  nameActions: { flexDirection: 'row', gap: spacing.sm },
  nameButton: { flex: 1 },
  // Ruled top and bottom, so the three read as one band of the page rather
  // than as three floating panels.
  stats: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: c.border,
  },
  // The hand-built stat tile, settings card and email line that used to live
  // here are gone: `StatTile` owns the first, `LedgerRow` the second, and the
  // identity block folded the email into one mono meta line.
  // A card, but dashed and unfilled so it can't be mistaken for a real setting
  // by anyone looking at a dev build over your shoulder. It's the only dashed
  // border in the app, which is the point.
  devCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.borderStrong,
  },
  devText: { flex: 1, gap: 2 },
  devHint: { ...type.caption, color: c.textPlaceholder },
  // A Switch is taller than a line of text, so this row needs less padding to
  // finish the same height as the card above it.
  themeCard: { paddingVertical: spacing.md },
  logout: { marginTop: spacing.sm },
})
