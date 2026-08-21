import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect, useNavigation, useRouter } from 'expo-router'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { deleteRecipe, getPlan, getRecipes, setFavourite } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import { favouriteFeedback, openMenuFeedback, refreshFeedback } from '@/lib/haptics'
import { foldForCompare } from '@/lib/text'
import { toDateKey } from '@/lib/week'
import { padded, useLanguage, useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useMealtimeLabel } from '@/i18n/labels'
import TodaysDish from '@/components/TodaysDish'
import Chip from '@/components/ui/Chip'
import SearchBar from '@/components/ui/SearchBar'
import ActionSheet from '@/components/ui/ActionSheet'
import AddRow from '@/components/ui/AddRow'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LedgerRow from '@/components/ui/LedgerRow'
import Masthead, { MastheadAction } from '@/components/ui/Masthead'
import PrimaryButton from '@/components/ui/PrimaryButton'
import ProfileButton from '@/components/ui/ProfileButton'
import SectionHeader from '@/components/ui/SectionHeader'
import Skeleton, { usePulse } from '@/components/ui/Skeleton'
import TextLink from '@/components/ui/TextLink'
import type { SwipeTabsNavigationProp } from '@/navigation/SwipeTabs'
import { radius, sized, spacing, useScreenTopPad, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { MEALTIMES } from '@/types/recipe'
import type { Mealtime, PlanSlot, Recipe } from '@/types/recipe'

type Filter = 'All' | Mealtime

/**
 * Which of today's slots becomes "today's dish", most-likely-first.
 *
 * A single mealtime would leave the block empty for anyone who plans lunches
 * and not dinners; walking the list means the card fills whenever *anything* is
 * planned. Dinner leads because it is the meal people plan ahead for.
 */
const TODAY_PRIORITY: Mealtime[] = ['Dinner', 'Lunch', 'Breakfast', 'Snack']

/** Six rows fills a phone below the masthead without running far past the fold. */
const SKELETON_KEYS = ['s0', 's1', 's2', 's3', 's4', 's5']

export default function RecipesIndexScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const { language } = useLanguage()
  const mealtimeLabel = useMealtimeLabel()
  const { token } = useAuth()
  const router = useRouter()
  const navigation = useNavigation<SwipeTabsNavigationProp>()
  const listRef = useRef<FlatList<Recipe>>(null)

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [todaySlots, setTodaySlots] = useState<PlanSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<StringKey | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [sheetFor, setSheetFor] = useState<Recipe | null>(null)
  const [confirmFor, setConfirmFor] = useState<Recipe | null>(null)

  const debouncedQuery = useDebounce(query)

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

      // Today's key is built in **local** time. `toISOString().slice(0, 10)`
      // converts to UTC first, which after 5pm in Phnom Penh asks the server for
      // tomorrow — so "today's dish" would silently become tomorrow's every
      // evening. `lib/week.ts` exists for exactly this.
      const today = toDateKey(new Date())

      Promise.all([
        getRecipes(token),
        // A failed plan read must not take the whole index down with it: the
        // recipe list is the screen's reason for existing and the card above it
        // is an extra. An empty array renders the "plan a dish" row, which is
        // also what someone with no plan sees — the right thing in both cases.
        getPlan(today, today, token).catch(() => [] as PlanSlot[]),
      ])
        .then(([data, slots]) => {
          if (cancelled) return
          // The same bail-out every refocus refetch in this app uses: a screen
          // regains focus while its transition is still running, and an
          // unconditional setState rebuilds the list on the frames the
          // animation needs.
          setRecipes((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data))
          setTodaySlots((prev) =>
            JSON.stringify(prev) === JSON.stringify(slots) ? prev : slots
          )
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

  /**
   * Tapping Recipes while already on it returns the list to the top.
   *
   * The `isFocused` guard is what makes this a re-tap rather than a tab change:
   * `TabBar` emits `tabPress` either way, and both scenes stay mounted in the
   * pager, so without it pressing Recipes *from the planner* would animate-
   * scroll this list under the page transition.
   */
  useEffect(
    () =>
      navigation.addListener('tabPress', () => {
        if (!navigation.isFocused()) return
        listRef.current?.scrollToOffset({ offset: 0, animated: true })
      }),
    [navigation]
  )

  const todaysDish = useMemo(() => {
    for (const mealtime of TODAY_PRIORITY) {
      const slot = todaySlots.find((s) => s.mealtime === mealtime)
      if (slot?.recipe) {
        // The plan carries a summary, not the whole recipe. Prefer the full row
        // from the list so the card's meta line has tools and servings; fall
        // back to the summary for a recipe that somehow isn't in the list.
        return recipes.find((r) => r.id === slot.recipeId) ?? null
      }
    }
    return null
  }, [todaySlots, recipes])

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

  const searching = debouncedQuery.trim().length > 0
  const favourites = useMemo(() => visible.filter((r) => r.isFavourite), [visible])

  /**
   * The index's range, `01–08`, and the reason it is a range rather than a
   * count: the header names the rows *beneath it*, so while a filter or a
   * search is narrowing the list it has to describe what survived, not what the
   * book holds. `padded` keeps the two numbers the same width, which is what
   * makes a column of them read as an index rather than as arithmetic.
   */
  const indexRange =
    visible.length === 0
      ? undefined
      : `${padded(1, 2, language)}–${padded(visible.length, 2, language)}`

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
    // Beside the optimistic flip, not after the request: waiting on the server
    // would put the buzz behind the thing it confirms.
    favouriteFeedback()
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

  const masthead = (
    <Masthead
      title={t('brand.wordmark')}
      // No language toggle here. Language is a setting, and settings live in
      // one place — the profile screen, reached from the avatar at the end of
      // this same row. A control that changes the whole app's chrome does not
      // belong beside "add a recipe" on the busiest screen in the product.
      actions={
        <>
          <MastheadAction accessibilityLabel={t('tabs.addRecipe')} onPress={() => router.push('/recipe/new')}>
            {/* Two rules rather than a typed "+": a glyph at this size carries
                the text face's stroke contrast and lands heavier than the
                1.2px circle around it. */}
            <View style={styles.plusH} />
            <View style={styles.plusV} />
          </MastheadAction>
          <ProfileButton />
        </>
      }
    />
  )

  const header = (
    <View style={styles.header}>
      {masthead}

      <View style={styles.controls}>
        <SearchBar value={query} onChangeText={setQuery} placeholder={t('dashboard.search')} />
        {/* Wraps rather than scrolls. Five chips with Khmer labels overflow a
            phone, and a horizontal scroller cut the last one — `អាហារពេលល្ងាច` —
            through the middle of a cluster, which reads as a rendering fault
            rather than as an affordance. The mockup's own chip rows are
            `flex-wrap: wrap`, and the padding here already matches its 9×15, so
            wrapping is the design's answer rather than a workaround for ours. */}
        <View style={styles.chips}>
          {(['All', ...MEALTIMES] as Filter[]).map((option) => (
            <Chip
              key={option}
              label={mealtimeLabel(option)}
              active={filter === option}
              onPress={() => setFilter(option)}
            />
          ))}
        </View>
      </View>

      {error && <Text style={styles.error}>{t(error)}</Text>}

      {/* Hidden while searching or filtering: the card is about today, not
          about the query, and leaving it up makes the results look like they
          begin with an unrelated photograph. */}
      {!searching && filter === 'All' && (
        <TodaysDish
          recipe={todaysDish}
          onPress={() => todaysDish && router.push(`/recipe/${todaysDish.id}`)}
          onPlan={() => navigation.navigate('planner')}
        />
      )}

      {/* The favourites rail was a horizontal carousel of photo cards. It is a
          ruled section of ledger rows now — same feature, Chronicle's shape. A
          carousel is a shop window, and this is an index. */}
      {!searching && favourites.length > 0 && (
        <View style={styles.section}>
          <SectionHeader label={t('dashboard.favourites')} count={n(favourites.length)} />
          {favourites.map((recipe, index) => (
            <LedgerRow
              key={recipe.id}
              title={recipe.title}
              photoUrl={recipe.photoUrl}
              value={`${n(recipe.totalMinutes)} ${t('detail.minutes')}`}
              last={index === favourites.length - 1}
              onPress={() => router.push(`/recipe/${recipe.id}`)}
            />
          ))}
        </View>
      )}

      {visible.length > 0 && (
        <SectionHeader
          label={t(searching ? 'dashboard.results' : 'index.index')}
          count={indexRange}
          style={styles.indexHeader}
        />
      )}
    </View>
  )

  const footer =
    visible.length > 0 ? (
      <AddRow
        label={t('index.addRecipe')}
        onPress={() => router.push('/recipe/new')}
        style={styles.addRow}
      />
    ) : null

  // Pads the *content*, not the scroller — padding the container is what put a
  // hard horizontal line an inch down the page, because the list began below
  // the status bar and a photograph scrolling up was cut off against `bg`
  // rather than passing underneath it.
  const topPad = useScreenTopPad()

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: topPad }}>
          {masthead}
          <IndexSkeleton />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingTop: topPad }]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            // The spinner belongs to the content, and the content starts under
            // the status bar — without this it spins behind the clock.
            progressViewOffset={topPad}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderItem={({ item, index }) => (
          <LedgerRow
            style={styles.row}
            title={item.title}
            photoUrl={item.photoUrl}
            value={`${n(item.totalMinutes)} ${t('detail.minutes')}`}
            last={index === visible.length - 1}
            onPress={() => router.push(`/recipe/${item.id}`)}
            onLongPress={() => openSheet(item)}
          />
        )}
        ListEmptyComponent={
          <Empty
            searching={searching || filter !== 'All'}
            onWrite={() => router.push('/recipe/new')}
            onClassics={() => navigation.navigate('explore')}
          />
        }
      />

      {/* Long-press a row for edit/delete. Three tap targets in a 52pt row is
          what makes a ruled index look like a toolbar. */}
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
        // The recipe's own title is content and stays exactly as typed; only
        // the sentence around it is translated.
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

/**
 * SCREENS.md § 19 — the empty book, and § 12's no-results, which differ only in
 * what they say. Both are the ruled page with nothing written on it: the chrome
 * stays put so you still know where you are, one primary action, one quieter
 * alternative.
 *
 * The ghosted `០` is set in Moul at `accentGhost` and is the reason that token
 * exists. It is a **numeral**, so it follows the language like every other one —
 * an English `0` under a Khmer heading would break the rule in the one place
 * with nothing else on screen to distract from it.
 */
function Empty({
  searching,
  onWrite,
  onClassics,
}: {
  searching: boolean
  onWrite: () => void
  onClassics: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()

  return (
    <View style={styles.empty}>
      {/* 62 for the empty book, 46 for a search that missed — the mockup sets
          the no-results mark a step smaller because it sits above a shorter
          heading. Both at 1.45. */}
      <Text style={[styles.ghost, searching && styles.ghostSmall]}>{searching ? '?' : n(0)}</Text>
      <Text style={styles.emptyTitle}>
        {t(searching ? 'empty.noMatchTitle' : 'empty.recipesTitle')}
      </Text>
      <Text style={styles.emptyBody}>
        {t(searching ? 'empty.noMatchBody' : 'empty.recipesBody')}
      </Text>
      <PrimaryButton
        label={t(searching ? 'empty.writeItYourself' : 'empty.recipesPrimary')}
        variant={searching ? 'outline' : 'solid'}
        onPress={onWrite}
        style={styles.emptyButton}
      />
      {/* Only on a genuinely empty book — offering the classics to someone whose
          search missed would be answering a question they didn't ask.

          It goes to **Explore**, which is what "begin with eight classics" has
          meant since the shared library shipped. It used to call `onWrite`,
          which made the alt link a second copy of the primary button. */}
      {!searching && <TextLink label={t('empty.recipesAlt')} onPress={onClassics} />}
    </View>
  )
}

/**
 * Placeholder rows that **copy the real row's measurements** — the 46pt
 * thumbnail, the 12pt vertical padding, the hairline — so content lands where
 * the placeholder was instead of the page jumping when data arrives.
 *
 * `usePulse()` is called once and the value shared, never per block: independent
 * animations drift out of phase within seconds, and a page of separately
 * blinking boxes reads as broken rather than as loading.
 */
function IndexSkeleton() {
  const styles = useThemedStyles(makeStyles)
  const pulse = usePulse()
  return (
    <View style={styles.skeleton}>
      {SKELETON_KEYS.map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <Skeleton pulse={pulse} style={styles.skeletonThumb} />
          <View style={styles.skeletonText}>
            <Skeleton pulse={pulse} style={styles.skeletonTitle} />
          </View>
          <Skeleton pulse={pulse} style={styles.skeletonValue} />
        </View>
      ))}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    // No horizontal padding on the list: `TodaysDish` runs full-bleed and every
    // other child insets itself. Padding here would box the photograph in.
    list: { paddingBottom: spacing.xxl },
    header: { gap: spacing.sectionSpacing },
    controls: { paddingHorizontal: spacing.gutter, gap: spacing.md },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    section: { paddingHorizontal: spacing.gutter },
    indexHeader: { paddingHorizontal: spacing.gutter, marginTop: spacing.sm },
    row: { marginHorizontal: spacing.gutter },
    addRow: { marginHorizontal: spacing.gutter, marginTop: spacing.sectionSpacing },
    error: { ...type.body, color: c.danger, paddingHorizontal: spacing.gutter },

    plusH: { position: 'absolute', width: 11, height: 1.2, backgroundColor: c.text },
    plusV: { position: 'absolute', width: 1.2, height: 11, backgroundColor: c.text },

    empty: {
      alignItems: 'center',
      gap: spacing.md,
      paddingTop: spacing.xxl,
      paddingHorizontal: spacing.gutter,
    },
    // Moul 62/1.45, the mockup's own. It used to be set from `stepNumeral` —
    // 96/100 — which is cook mode's numeral and appears nowhere else: RN crops
    // to the line box, so a 96pt Moul glyph in a 100pt box lost its middle and
    // left two grey slivers on the page.
    ghost: { ...type.ghostGlyph, color: c.accentGhost },
    // `sized`, so the 1.45 comes down with the size rather than leaving a 46pt
    // glyph in a 90pt line box.
    ghostSmall: sized(type.ghostGlyph, 46),
    // `emptyTitle`, not `screenTitle`. See the note on the token.
    emptyTitle: { ...type.emptyTitle, color: c.text, textAlign: 'center' },
    emptyBody: { ...type.bodyRead, color: c.textMuted, textAlign: 'center' },
    emptyButton: { alignSelf: 'stretch', marginTop: spacing.sm },

    skeleton: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xxl, gap: spacing.lg },
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    // The real row's measurements, copied — that is the whole point of a
    // skeleton. Content lands where the placeholder was instead of the page
    // jumping the moment data arrives.
    skeletonThumb: { width: 46, height: 46, borderRadius: radius.thumb },
    skeletonText: { flex: 1 },
    skeletonTitle: { width: '70%', height: 15 },
    skeletonValue: { width: 44, height: 11 },
  })
