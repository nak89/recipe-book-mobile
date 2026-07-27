import { useCallback, useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { deleteRecipe, getRecipes, setFavourite } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import RecipeCard from '@/components/RecipeCard'
import Chip from '@/components/ui/Chip'
import SearchBar from '@/components/ui/SearchBar'
import ActionSheet from '@/components/ui/ActionSheet'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { colors, radius, spacing, type } from '@/theme'
import { MEALTIMES } from '@/types/recipe'
import type { Mealtime, Recipe } from '@/types/recipe'

type Filter = 'All' | Mealtime

export default function DashboardScreen() {
  const { token, displayName } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [sheetFor, setSheetFor] = useState<Recipe | null>(null)
  const [confirmFor, setConfirmFor] = useState<Recipe | null>(null)

  const debouncedQuery = useDebounce(query)

  // Refetch on focus so returning from the add/edit modal shows fresh data.
  useFocusEffect(
    useCallback(() => {
      if (!token) return
      let cancelled = false
      setError(null)
      getRecipes(token)
        .then((data) => {
          if (!cancelled) setRecipes(data)
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load recipes')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }, [token])
  )

  const visible = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    return recipes.filter((recipe) => {
      if (filter !== 'All' && recipe.mealtime !== filter) return false
      if (!q) return true
      return (
        recipe.title.toLowerCase().includes(q) ||
        recipe.description?.toLowerCase().includes(q) ||
        recipe.cuisine?.toLowerCase().includes(q) ||
        recipe.ingredients.some((i) => i.name.toLowerCase().includes(q))
      )
    })
  }, [recipes, debouncedQuery, filter])

  const favourites = useMemo(() => visible.filter((r) => r.isFavourite), [visible])
  const searching = debouncedQuery.trim().length > 0

  // A two-column FlatList stretches a lone item across the whole row, which is
  // why a single search result rendered as a double-width card. An invisible
  // filler keeps every tile the same size.
  const gridData = useMemo<(Recipe | null)[]>(
    () => (visible.length % 2 === 1 ? [...visible, null] : visible),
    [visible]
  )

  async function handleToggleFavourite(recipe: Recipe) {
    if (!token) return
    const next = !recipe.isFavourite
    // Optimistic — the bookmark should flip under your finger, not after a round trip.
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, isFavourite: next } : r)))
    try {
      await setFavourite(recipe.id, next, token)
    } catch {
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, isFavourite: !next } : r)))
      setError('Could not update favourite')
    }
  }

  async function handleDelete(recipe: Recipe) {
    if (!token) return
    const snapshot = recipes
    setRecipes((prev) => prev.filter((r) => r.id !== recipe.id))
    try {
      await deleteRecipe(recipe.id, token)
    } catch (err) {
      setRecipes(snapshot)
      setError(err instanceof Error ? err.message : 'Failed to delete recipe')
    }
  }

  function handleShuffle() {
    if (recipes.length === 0) return
    const pick = recipes[Math.floor(Math.random() * recipes.length)]
    router.push(`/recipe/${pick.id}`)
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    // insets.top clears the notch/Dynamic Island and the status bar icons; the
    // Math.max floor is for web and older Androids that report 0.
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
      <FlatList
        data={gridData}
        keyExtractor={(item, index) => item?.id ?? `filler-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.greetingRow}>
              <View style={styles.greetingText}>
                <Text style={styles.hello}>Hi {displayName} 👋</Text>
                <Text style={styles.prompt}>What do you want to cook today?</Text>
              </View>
              <Pressable
                onPress={handleShuffle}
                accessibilityRole="button"
                accessibilityLabel="Surprise me with a random recipe"
                style={({ pressed }) => [styles.shuffle, pressed && styles.shufflePressed]}
              >
                <Ionicons name="shuffle" size={20} color={colors.accent} />
              </Pressable>
            </View>

            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Search recipe for cooking"
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {(['All', ...MEALTIMES] as Filter[]).map((option) => (
                <Chip
                  key={option}
                  label={option}
                  active={filter === option}
                  onPress={() => setFilter(option)}
                />
              ))}
            </ScrollView>

            {error && <Text style={styles.error}>{error}</Text>}

            {/* Hidden while searching — a carousel of favourites is noise when
                you're hunting for one specific recipe. */}
            {favourites.length > 0 && !searching && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Favourites</Text>
                <FlatList
                  horizontal
                  data={favourites}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carousel}
                  renderItem={({ item }) => (
                    <RecipeCard
                      recipe={item}
                      variant="featured"
                      onPress={() => router.push(`/recipe/${item.id}`)}
                      onLongPress={() => setSheetFor(item)}
                      onToggleFavourite={() => handleToggleFavourite(item)}
                    />
                  )}
                />
              </View>
            )}

            {visible.length > 0 && (
              <Text style={[styles.sectionTitle, styles.gridTitle]}>
                {searching ? 'Results' : 'All Recipes'}
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) =>
          item ? (
            <RecipeCard
              recipe={item}
              onPress={() => router.push(`/recipe/${item.id}`)}
              onLongPress={() => setSheetFor(item)}
              onToggleFavourite={() => handleToggleFavourite(item)}
            />
          ) : (
            <View style={styles.filler} />
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={40} color={colors.textPlaceholder} />
            <Text style={styles.emptyTitle}>
              {recipes.length === 0 ? 'No recipes yet' : 'Nothing matches'}
            </Text>
            <Text style={styles.emptyBody}>
              {recipes.length === 0
                ? 'Tap the + button below to add your first one.'
                : 'Try a different search or filter.'}
            </Text>
          </View>
        }
      />

      {/* Long-press a card for edit/delete — keeps three tap targets off a
          160pt photo tile without hiding the actions on the detail screen. */}
      <ActionSheet
        visible={sheetFor !== null}
        title={sheetFor?.title}
        onClose={() => setSheetFor(null)}
        actions={[
          {
            label: 'Edit recipe',
            icon: 'create-outline',
            onPress: () => sheetFor && router.push(`/recipe/${sheetFor.id}/edit`),
          },
          {
            label: sheetFor?.isFavourite ? 'Remove from favourites' : 'Add to favourites',
            icon: sheetFor?.isFavourite ? 'heart' : 'heart-outline',
            onPress: () => sheetFor && handleToggleFavourite(sheetFor),
          },
          {
            label: 'Delete recipe',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => setConfirmFor(sheetFor),
          },
        ]}
      />

      <ConfirmDialog
        visible={confirmFor !== null}
        title="Delete recipe?"
        message={confirmFor ? `"${confirmFor.title}" will be permanently removed.` : undefined}
        onCancel={() => setConfirmFor(null)}
        onConfirm={() => {
          const target = confirmFor
          setConfirmFor(null)
          if (target) handleDelete(target)
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  column: { gap: spacing.md },
  filler: { flex: 1 },
  // Breathing room under the status bar — the greeting shouldn't sit tight
  // against the clock and battery icons.
  header: { gap: spacing.lg, paddingTop: spacing.lg },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // minWidth: 0 so a long display name wraps instead of shoving the shuffle
  // button off the right edge.
  greetingText: { flex: 1, minWidth: 0, gap: 2 },
  hello: { ...type.display, color: colors.text, lineHeight: 34 },
  prompt: { ...type.body, color: colors.textMuted },
  shuffle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shufflePressed: { opacity: 0.7 },
  chips: { gap: spacing.xs, paddingRight: spacing.lg },
  section: { gap: spacing.md },
  sectionTitle: { ...type.section, color: colors.text },
  gridTitle: { marginBottom: -spacing.xs },
  carousel: { gap: spacing.md, paddingRight: spacing.lg },
  error: { ...type.body, color: colors.danger },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: { ...type.section, color: colors.text },
  emptyBody: { ...type.body, color: colors.textMuted, textAlign: 'center' },
})
