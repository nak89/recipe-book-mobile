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
import { favouriteFeedback, openMenuFeedback, refreshFeedback } from '@/lib/haptics'
import { foldForCompare } from '@/lib/text'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useMealtimeLabel } from '@/i18n/labels'
import Animated from 'react-native-reanimated'
import RecipeCard from '@/components/RecipeCard'
import RecipeCardSkeleton from '@/components/RecipeCardSkeleton'
import { useDockClearance } from '@/components/TabBar'
import { useDockScrollHandler } from '@/components/dock/DockScroll'
import Chip from '@/components/ui/Chip'
import SearchBar from '@/components/ui/SearchBar'
import ActionSheet from '@/components/ui/ActionSheet'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { MEALTIMES } from '@/types/recipe'
import type { Mealtime, Recipe } from '@/types/recipe'

type Filter = 'All' | Mealtime

// Six tiles: three rows, which fills a phone screen below the header without
// running so far past the fold that the page scrolls to nothing.
const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5']

export default function DashboardScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const mealtimeLabel = useMealtimeLabel()
  const { token, displayName } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  // The dock floats over the grid, so the last row has to be scrolled clear of it.
  const dockClearance = useDockClearance()
  const dockScrollHandler = useDockScrollHandler()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  // Separate from `loading`: this one drives the spinner at the top of the list
  // while the cards you already have stay on screen. Reusing `loading` would
  // swap the whole grid back to skeletons on every pull.
  const [refreshing, setRefreshing] = useState(false)
  // The *key*, not the translated sentence. Storing translated text would
  // freeze an on-screen error in whatever language it was raised in, and it
  // would make `t` a dependency of the fetch effect — so switching language
  // would refetch the whole grid.
  const [error, setError] = useState<StringKey | null>(null)
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
          if (cancelled) return
          // Backing out of a recipe you didn't change brings back byte-identical
          // data, and a fresh array is still a new identity — every card
          // re-renders, and the view mutations that come with it land on the
          // frames the back animation is still using. Returning `prev` bails out
          // of the render entirely, so the common path costs one comparison.
          setRecipes((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data))
        })
        .catch((err) => {
          if (!cancelled) setError(apiErrorKey(err))
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
    // Folded rather than lowercased: Khmer keyboards emit invisible zero-width
    // spaces at word boundaries, which survive trim/lowercase/NFC and make two
    // visually identical strings unequal. Both sides have to be folded — doing
    // only the query finds nothing when it's the stored title carrying the ZWSP.
    const q = foldForCompare(debouncedQuery)
    return recipes.filter((recipe) => {
      if (filter !== 'All' && recipe.mealtime !== filter) return false
      if (!q) return true
      return (
        foldForCompare(recipe.title).includes(q) ||
        foldForCompare(recipe.description ?? '').includes(q) ||
        foldForCompare(recipe.cuisine ?? '').includes(q) ||
        recipe.ingredients.some((i) => foldForCompare(i.name).includes(q))
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
      setError(apiErrorKey(err))
    } finally {
      setRefreshing(false)
    }
  }

  async function handleToggleFavourite(recipe: Recipe) {
    if (!token) return
    const next = !recipe.isFavourite
    favouriteFeedback()
    // Optimistic — the bookmark should flip under your finger, not after a round trip.
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, isFavourite: next } : r)))
    try {
      await setFavourite(recipe.id, next, token)
    } catch {
      setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? { ...r, isFavourite: !next } : r)))
      setError('error.favourite')
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
      setError(apiErrorKey(err))
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
          <Text style={styles.hello}>{`${t('dashboard.hello')} ${displayName} 👋`}</Text>
          <Text style={styles.prompt}>{t('dashboard.prompt')}</Text>
        </View>
        <Pressable
          onPress={handleShuffle}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.shuffle')}
          style={({ pressed }) => [styles.shuffle, pressed && styles.shufflePressed]}
        >
          <Ionicons name="shuffle" size={20} color={c.accent} />
        </Pressable>
      </View>

      <SearchBar value={query} onChangeText={setQuery} placeholder={t('dashboard.search')} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(['All', ...MEALTIMES] as Filter[]).map((option) => (
          <Chip
            key={option}
            label={mealtimeLabel(option)}
            active={filter === option}
            onPress={() => setFilter(option)}
          />
        ))}
      </ScrollView>

      {error && <Text style={styles.error}>{t(error)}</Text>}

      {/* Hidden while searching — a carousel of favourites is noise when
          you're hunting for one specific recipe. */}
      {favourites.length > 0 && !searching && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.favourites')}</Text>
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
          {searching ? t('dashboard.results') : t('dashboard.allRecipes')}
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
          contentContainerStyle={[styles.list, { paddingBottom: dockClearance }]}
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
      <Animated.FlatList
        data={gridData}
        keyExtractor={(item, index) => item?.id ?? `filler-${index}`}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[styles.list, { paddingBottom: dockClearance }]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        // Drives the dock out of the way on the way down and back on the way
        // up. Entirely on the UI thread — this fires every frame of every
        // scroll, which is the last place a React render belongs.
        onScroll={dockScrollHandler}
        scrollEventThrottle={16}
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
              {recipes.length === 0 ? t('dashboard.emptyTitle') : t('dashboard.noMatchTitle')}
            </Text>
            <Text style={styles.emptyBody}>
              {recipes.length === 0
                ? t('dashboard.emptyBody')
                : t('dashboard.noMatchBody')}
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
            label: t('detail.editRecipe'),
            icon: 'create-outline',
            onPress: () => sheetFor && router.push(`/recipe/${sheetFor.id}/edit`),
          },
          {
            label: t(sheetFor?.isFavourite ? 'detail.removeFavourite' : 'detail.addFavourite'),
            icon: sheetFor?.isFavourite ? 'heart' : 'heart-outline',
            onPress: () => sheetFor && handleToggleFavourite(sheetFor),
          },
          {
            label: t('detail.deleteRecipe'),
            icon: 'trash-outline',
            destructive: true,
            onPress: () => setConfirmFor(sheetFor),
          },
        ]}
      />

      <ConfirmDialog
        visible={confirmFor !== null}
        title={t('dashboard.deleteTitle')}
        // The recipe's own title is content and stays exactly as typed; only the
        // sentence around it is translated.
        message={confirmFor ? `“${confirmFor.title}” — ${t('dashboard.deleteMessage')}` : undefined}
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

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
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
  // No hand-set `lineHeight`, and this is the bug that started the whole
  // typography pass. It was 34 — a hair over Latin's natural ~33.6 at 28pt, so
  // it read as harmless — but both platforms shrink the line box from the *top*
  // when lineHeight falls under the font's ascent, and a Khmer cluster's ascent
  // includes the vowel signs stacked above the base consonant. 34 shaved them
  // off the greeting. Unset is the fix; a bigger number is not (see `typeKm`).
  hello: { ...type.display, color: c.text },
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
