import { useCallback, useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { deleteRecipe, getRecipes, setFavourite } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import { openMenuFeedback, refreshFeedback } from '@/lib/haptics'
import RecipeCard from '@/components/RecipeCard'
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton'
import Chip from '@/components/ui/Chip'
import SearchBar from '@/components/ui/SearchBar'
import ActionSheet from '@/components/ui/ActionSheet'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { radius, spacing, type, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'
import { MEALTIMES } from '@/types/recipe'
import type { Mealtime, Recipe } from '@/types/recipe'

type Filter = 'All' | Mealtime

// Six tiles: three rows, which fills a phone screen below the header without
// running so far past the fold that the page scrolls to nothing.
const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5']

export default function DashboardScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const { token, displayName } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  // Separate from `loading`: this one drives the spinner at the top of the list
  // while the cards you already have stay on screen. Reusing `loading` would
  // swap the whole grid back to skeletons on every pull.
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [sheetFor, setSheetFor] = useState<Recipe | null>(null)
  const [confirmFor, setConfirmFor] = useState<Recipe | null>(null)

  const debouncedQuery = useDebounce(query)

  // One helper for both cards, so the tap that opens the menu and the buzz that
  // confirms it can never drift apart.
  function openSheet(recipe: Recipe) {
    openMenuFeedback()
    setSheetFor(recipe)
  }

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

  /**
   * Pull-to-refresh. The haptic fires here rather than on drag, because this
   * runs the moment the gesture commits — buzzing while you're still pulling
   * would fire on pulls you abandon.
   */
  async function handleRefresh() {
    if (!token) return
    refreshFeedback()
    setRefreshing(true)
    try {
      setRecipes(await getRecipes(token))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh recipes')
    } finally {
      setRefreshing(false)
    }
  }

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

  // Shared by the skeleton and the real list so the chrome doesn't move when
  // data lands — the whole point of placeholders over a centred spinner.
  const header = (
    <View style={styles.header}>
      <View style={styles.greetingRow}>
        <View style={styles.greetingText}>
          <Text style={styles.hello}>Hi {displayName} 👋</Text>
          <Text style={styles.prompt}>What do you want to cook today?</Text>
        </View>
        <Pressable
          onPress={handleShuffle}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Surprise me with a random recipe"
          style={({ pressed }) => [styles.shuffle, pressed && styles.shufflePressed]}
        >
          <Ionicons name="shuffle" size={20} color={c.accent} />
        </Pressable>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder="Search recipe for cooking" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
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
                onLongPress={() => openSheet(item)}
                onToggleFavourite={() => handleToggleFavourite(item)}
              />
            )}
          />
        </View>
      )}

      {/* Shown during loading too, so the heading doesn't pop in above the
          skeletons and shove them down. */}
      {(loading || visible.length > 0) && (
        <Text style={[styles.sectionTitle, styles.gridTitle]}>
          {searching ? 'Results' : 'All Recipes'}
        </Text>
      )}
    </View>
  )

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
        <FlatList
          data={SKELETON_KEYS}
          keyExtractor={(key) => key}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          // There's nothing to reach by scrolling and nothing to refresh yet.
          scrollEnabled={false}
          ListHeaderComponent={header}
          renderItem={() => <RecipeCardSkeleton />}
        />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            // Defaults are iOS grey and Android blue; the app's chrome is neither.
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        ListHeaderComponent={header}
        renderItem={({ item }) =>
          item ? (
            <RecipeCard
              recipe={item}
              onPress={() => router.push(`/recipe/${item.id}`)}
              onLongPress={() => openSheet(item)}
              onToggleFavourite={() => handleToggleFavourite(item)}
            />
          ) : (
            <View style={styles.filler} />
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="restaurant-outline" size={40} color={c.textPlaceholder} />
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
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
  hello: { ...type.display, color: c.text, lineHeight: 34 },
  prompt: { ...type.body, color: c.textMuted },
  shuffle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: c.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shufflePressed: { opacity: 0.7 },
  chips: { gap: spacing.xs, paddingRight: spacing.lg },
  section: { gap: spacing.md },
  sectionTitle: { ...type.section, color: c.text },
  gridTitle: { marginBottom: -spacing.xs },
  carousel: { gap: spacing.md, paddingRight: spacing.lg },
  error: { ...type.body, color: c.danger },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: { ...type.section, color: c.text },
  emptyBody: { ...type.body, color: c.textMuted, textAlign: 'center' },
})
