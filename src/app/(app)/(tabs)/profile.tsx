import { useCallback, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getRecipes } from '@/lib/api'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { radius, spacing, type, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'
import type { Recipe } from '@/types/recipe'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export default function ProfileScreen() {
  const { colors: c, isDark, setPreference } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const { token, displayName, email, memberSince, logout, updateDisplayName } = useAuth()
  const insets = useSafeAreaInsets()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmLogout, setConfirmLogout] = useState(false)

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

  async function handleSaveName() {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setError('Name cannot be empty')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateDisplayName(trimmed)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save name')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
                placeholder="Your name"
                placeholderTextColor={c.textPlaceholder}
                keyboardAppearance={isDark ? 'dark' : 'light'}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                maxLength={40}
              />
              <View style={styles.nameActions}>
                <PrimaryButton
                  label="Cancel"
                  variant="outline"
                  style={styles.nameButton}
                  onPress={() => {
                    setDraftName(displayName)
                    setEditing(false)
                    setError(null)
                  }}
                />
                <PrimaryButton
                  label="Save"
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
              accessibilityLabel="Edit display name"
            >
              <Text style={styles.name}>{displayName}</Text>
              <Ionicons name="pencil" size={15} color={c.textMuted} />
            </Pressable>
          )}

          {email && <Text style={styles.email}>{email}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <View style={styles.stats}>
          <Stat label="Recipes" value={String(recipes.length)} />
          <Stat label="Favourites" value={String(favouriteCount)} />
          <Stat
            label="Total time"
            value={totalMinutes >= 60 ? `${Math.round(totalMinutes / 60)}h` : `${totalMinutes}m`}
          />
        </View>

        {memberSince && (
          <View style={styles.card}>
            <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
            <Text style={styles.cardLabel}>Member since</Text>
            <Text style={styles.cardValue}>
              {memberSince.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        )}

        <View style={[styles.card, styles.themeCard]}>
          <Ionicons name={isDark ? 'moon' : 'moon-outline'} size={18} color={c.textMuted} />
          <Text style={styles.cardLabel}>Dark mode</Text>
          <Switch
            value={isDark}
            onValueChange={(on) => setPreference(on ? 'dark' : 'light')}
            accessibilityLabel="Dark mode"
            // Until this is touched the theme follows the phone; flipping it
            // pins an explicit choice that outlives the system setting.
            trackColor={{ false: c.borderStrong, true: c.primary }}
            thumbColor={c.onPrimary}
            ios_backgroundColor={c.borderStrong}
          />
        </View>

        <PrimaryButton
          label="Log out"
          variant="danger"
          onPress={() => setConfirmLogout(true)}
          style={styles.logout}
        />
      </ScrollView>

      <ConfirmDialog
        visible={confirmLogout}
        title="Log out?"
        message="You'll need to sign in again to see your recipes."
        confirmLabel="Log out"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false)
          logout()
        }}
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
  avatarText: { ...type.display, fontSize: 32, color: c.onPrimary },
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
  // A Switch is taller than a line of text, so this row needs less padding to
  // finish the same height as the card above it.
  themeCard: { paddingVertical: spacing.md },
  logout: { marginTop: spacing.sm },
})
