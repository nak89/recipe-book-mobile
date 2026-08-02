import { useCallback, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MAX_NAME_LENGTH, useAuth } from '@/context/AuthContext'
import { getRecipes } from '@/lib/api'
import { resetSeenIntro } from '@/lib/onboarding'
import ActionSheet from '@/components/ui/ActionSheet'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useLanguage, useT } from '@/i18n'
import { useDockClearance } from '@/components/TabBar'
import { useDockScrollHandler } from '@/components/dock/DockScroll'
import { radius, sized, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { Recipe } from '@/types/recipe'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export default function ProfileScreen() {
  const { colors: c, isDark, setPreference } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const { language, setLanguage } = useLanguage()
  const { token, displayName, email, memberSince, logout, updateDisplayName, resetOnboarding } =
    useAuth()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  // The dock floats over this screen, so Log out has to clear it.
  const dockClearance = useDockClearance()
  const dockScrollHandler = useDockScrollHandler()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [languageSheet, setLanguageSheet] = useState(false)

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
      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: dockClearance },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // Same dock hide/show as the dashboard, so the behaviour doesn't change
        // when you swipe between tabs.
        onScroll={dockScrollHandler}
        scrollEventThrottle={16}
      >
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(displayName)}</Text>
          </View>

          {editing ? (
            <View style={styles.nameEditor}>
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder={t('profile.yourName')}
                placeholderTextColor={c.textPlaceholder}
                keyboardAppearance={isDark ? 'dark' : 'light'}
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
              <Text style={styles.name}>{displayName}</Text>
              <Ionicons name="pencil" size={15} color={c.textMuted} />
            </Pressable>
          )}

          {email && <Text style={styles.email}>{email}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.stats}>
          <Stat label={t('profile.recipes')} value={String(recipes.length)} />
          <Stat label={t('profile.favourites')} value={String(favouriteCount)} />
          <Stat
            label={t('profile.totalTime')}
            value={totalMinutes >= 60 ? `${Math.round(totalMinutes / 60)}h` : `${totalMinutes}m`}
          />
        </View>

        {memberSince && (
          <View style={styles.card}>
            <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
            <Text style={styles.cardLabel}>{t('profile.memberSince')}</Text>
            {/* `undefined` locale on purpose — the date follows the phone rather
                than the in-app language. Hermes ships a reduced ICU, so forcing
                'km-KH' risks a silent fall back to English anyway, and a wrong
                month name is worse than a phone-native one. */}
            <Text style={styles.cardValue}>
              {memberSince.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        )}

        {/* A row opening the shared ActionSheet, not a Switch. A two-state switch
            can't say which language is which until you flip it, and it would
            hard-code the assumption that there will only ever be two. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('language.label')}
          onPress={() => setLanguageSheet(true)}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <Ionicons name="language-outline" size={18} color={c.textMuted} />
          <Text style={styles.cardLabel}>{t('language.label')}</Text>
          <Text style={styles.cardValue}>
            {t(language === 'km' ? 'language.km' : 'language.en')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={c.textPlaceholder} />
        </Pressable>

        <View style={[styles.card, styles.themeCard]}>
          <Ionicons name={isDark ? 'moon' : 'moon-outline'} size={18} color={c.textMuted} />
          <Text style={styles.cardLabel}>{t('profile.darkMode')}</Text>
          <Switch
            value={isDark}
            onValueChange={(on) => setPreference(on ? 'dark' : 'light')}
            accessibilityLabel={t('profile.darkMode')}
            // Until this is touched the theme follows the phone; flipping it
            // pins an explicit choice that outlives the system setting.
            trackColor={{ false: c.borderStrong, true: c.primary }}
            thumbColor={c.onPrimary}
            ios_backgroundColor={c.borderStrong}
          />
        </View>

        {/* The tutorial is the one onboarding screen worth seeing twice, and
            without this the only way back to it would be a new account. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/tutorial')}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <Ionicons name="help-circle-outline" size={18} color={c.textMuted} />
          <Text style={styles.cardLabel}>{t('profile.howItWorks')}</Text>
          <Ionicons name="chevron-forward" size={16} color={c.textPlaceholder} />
        </Pressable>

        {/* Development only — `__DEV__` is false in any release build, so this
            never ships. It's here because the flow it replays is otherwise
            reachable only by making a new account: the flag that suppresses it
            lives on the Supabase user, so logging out alone doesn't bring it
            back. No confirm, deliberately: it's a button you press dozens of
            times an afternoon, and everything it clears is onboarding state. */}
        {__DEV__ && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset onboarding and log out"
            onPress={handleDevReset}
            disabled={resetting}
            style={({ pressed }) => [styles.devCard, pressed && styles.cardPressed]}
          >
            <Ionicons name="construct-outline" size={18} color={c.textMuted} />
            <View style={styles.devText}>
              <Text style={styles.cardLabel}>
                {resetting ? 'Starting fresh…' : 'Start fresh (dev only)'}
              </Text>
              <Text style={styles.devHint}>
                Clears this account’s onboarding, logs out, replays the intro
              </Text>
            </View>
          </Pressable>
        )}

        <PrimaryButton
          label={t('profile.logOut')}
          variant="danger"
          onPress={() => setConfirmLogout(true)}
          style={styles.logout}
        />
      </Animated.ScrollView>

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

      <ActionSheet
        visible={languageSheet}
        title={t('language.label')}
        onClose={() => setLanguageSheet(false)}
        // A checkmark on the current one turns the sheet into a radio group,
        // which is what a language choice actually is.
        actions={[
          {
            label: t('language.en'),
            icon: language === 'en' ? 'checkmark-circle' : 'ellipse-outline',
            onPress: () => setLanguage('en'),
          },
          {
            label: t('language.km'),
            icon: language === 'km' ? 'checkmark-circle' : 'ellipse-outline',
            onPress: () => setLanguage('km'),
          },
        ]}
      />
    </KeyboardAvoidingView>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  identity: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { ...sized(type.display, 32), color: c.onPrimary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...type.title, color: c.text },
  email: { ...type.body, color: c.textMuted },
  error: { ...type.body, color: c.danger },
  nameEditor: { width: '100%', gap: spacing.sm },
  nameInput: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    ...type.body,
    fontSize: 16,
    color: c.text,
    textAlign: 'center',
  },
  nameActions: { flexDirection: 'row', gap: spacing.sm },
  nameButton: { flex: 1 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { ...type.title, color: c.text },
  statLabel: { ...type.caption, color: c.textMuted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  cardLabel: { ...type.body, color: c.text, flex: 1 },
  cardValue: { ...type.bodyStrong, color: c.textMuted },
  cardPressed: { opacity: 0.7 },
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
