import { useCallback, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { getRecipes } from '@/lib/api'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { colors, radius, spacing, type } from '@/theme'
import type { Recipe } from '@/types/recipe'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export default function ProfileScreen() {
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
                placeholderTextColor={colors.textPlaceholder}
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
              <Ionicons name="pencil" size={15} color={colors.textMuted} />
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
            <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
            <Text style={styles.cardLabel}>Member since</Text>
            <Text style={styles.cardValue}>
              {memberSince.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        )}

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
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  identity: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { ...type.display, fontSize: 32, color: colors.onPrimary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...type.title, color: colors.text },
  email: { ...type.body, color: colors.textMuted },
  error: { ...type.body, color: colors.danger },
  nameEditor: { width: '100%', gap: spacing.sm },
  nameInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
    ...type.body,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  nameActions: { flexDirection: 'row', gap: spacing.sm },
  nameButton: { flex: 1 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { ...type.title, color: colors.text },
  statLabel: { ...type.caption, color: colors.textMuted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  cardLabel: { ...type.body, color: colors.text, flex: 1 },
  cardValue: { ...type.bodyStrong, color: colors.textMuted },
  logout: { marginTop: spacing.sm },
})
