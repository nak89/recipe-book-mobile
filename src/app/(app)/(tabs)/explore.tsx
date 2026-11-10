import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect, useIsFocused, useNavigation, useRouter } from 'expo-router'
import { ActivityIndicator, AppState, FlatList, Pressable, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { copyLibraryRecipe, getCachedLibrary, getLibrary } from '@/lib/api'
import type { LibrarySummary } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import { refreshFeedback } from '@/lib/haptics'
import { foldForCompare } from '@/lib/text'
import { padded, useLanguage, useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import LedgerRow from '@/components/ui/LedgerRow'
import Masthead from '@/components/ui/Masthead'
import PrimaryButton from '@/components/ui/PrimaryButton'
import ProfileButton from '@/components/ui/ProfileButton'
import SearchBar from '@/components/ui/SearchBar'
import SectionHeader from '@/components/ui/SectionHeader'
import MortarLoader from '@/components/ui/MortarLoader'
import TextLink from '@/components/ui/TextLink'
import type { SwipeTabsNavigationProp } from '@/navigation/SwipeTabs'
import { contentType, radius, sized, sizes, spacing, useScreenTopPad, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Explore — the shared library, and the tab the app opens onto.
 *
 * Everything here is **read from the server and copied on demand**; nothing on
 * this screen belongs to the user until they take it. That is the whole reason
 * the tab exists separately from Recipes, and why it has no "+" in its masthead:
 * you cannot write into a shared library, only out of it.
 *
 * ## Language
 *
 * **The library is Khmer, and the toggle does not reach it.** That is the app's
 * ordinary rule rather than an exception to it — chrome is translated, content
 * never is, and these are Chef Nak's recipes. An English UI renders them in
 * Khmer exactly as it renders a Khmer recipe the user wrote themselves, and
 * `contentType` picks each string's face from the string.
 *
 * This screen used to be the one place where content *did* follow the toggle:
 * the library shipped `titleKm`/`descriptionKm` beside the English and a
 * `titleFor` helper picked. Both are gone. The cost is that Explore's search no
 * longer matches Latin — see the note on `visible` below.
 */
export default function ExploreScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const { language } = useLanguage()
  const focused = useIsFocused()
  const { token } = useAuth()
  const router = useRouter()
  const navigation = useNavigation<SwipeTabsNavigationProp>()
  const listRef = useRef<FlatList<LibrarySummary>>(null)

  const [recipes, setRecipes] = useState<LibrarySummary[]>(() => getCachedLibrary(token)?.recipes ?? [])
  const [savedIds, setSavedIds] = useState<string[]>(() => getCachedLibrary(token)?.savedIds ?? [])
  const [loading, setLoading] = useState(() => getCachedLibrary(token) === undefined)
  // Separate from `loading`, for the reason the dashboard's is: reusing it would
  // replace the list you are looking at with skeletons on every pull. `loading`
  // is only ever true for the first fetch.
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<StringKey | null>(null)
  const [query, setQuery] = useState('')
  const [featuredIds, setFeaturedIds] = useState(() => getCachedLibrary(token)?.featuredIds)
  const [nextChangeAt, setNextChangeAt] = useState(() => getCachedLibrary(token)?.nextChangeAt)

  const [savingIds, setSavingIds] = useState<string[]>([])
  const pending = useRef(new Set<string>())
  const columns = useWindowDimensions().width < 360 ? 1 : 2

  async function saveRecipe(id: string) {
    if (!token || savedIds.includes(id) || pending.current.has(id)) return
    pending.current.add(id)
    setSavingIds(prev => [...prev, id])
    setError(null)
    try {
      await copyLibraryRecipe(id, token)
      setSavedIds(prev => prev.includes(id) ? prev : [...prev, id])
    } catch (err) {
      setError(apiErrorKey(err))
    } finally {
      pending.current.delete(id)
      setSavingIds(prev => prev.filter(value => value !== id))
    }
  }

  const debouncedQuery = useDebounce(query)

  /**
   * Refetch the daily selection and saved state when Explore regains focus.
   *
   * Same compare-before-commit bail-out every focus refetch in this app uses:
   * a screen regains focus while its transition is still running, and an
   * unconditional setState rebuilds the list on the frames the animation needs.
   */
  const load = useCallback(
    (signal?: { cancelled: boolean }) => {
      if (!token) return
      setError(null)
      return getLibrary(token)
        .then((data) => {
          if (signal?.cancelled) return
          setFeaturedIds(data.featuredIds)
          setNextChangeAt(data.nextChangeAt)
          setRecipes((prev) =>
            JSON.stringify(prev) === JSON.stringify(data.recipes) ? prev : data.recipes
          )
          setSavedIds((prev) =>
            JSON.stringify(prev) === JSON.stringify(data.savedIds) ? prev : data.savedIds
          )
        })
        .catch((err) => {
          if (!signal?.cancelled) setError(apiErrorKey(err))
        })
        .finally(() => {
          if (!signal?.cancelled) setLoading(false)
        })
    },
    [token]
  )

  useFocusEffect(
    useCallback(() => {
      const signal = { cancelled: false }
      load(signal)
      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') load(signal)
      })
      return () => {
        subscription.remove()
        signal.cancelled = true
      }
    }, [load])
  )

  // Re-tapping Explore returns it to the top. The `isFocused` guard is what
  // makes it a re-tap rather than a tab change — both scenes stay mounted in the
  // pager, so without it this list animates under the page transition.
  useEffect(
    () =>
      navigation.addListener('tabPress', () => {
        if (!navigation.isFocused()) return
        listRef.current?.scrollToOffset({ offset: 0, animated: true })
      }),
    [navigation]
  )

  useEffect(() => {
    if (!focused || !nextChangeAt) return
    const delay = Date.parse(nextChangeAt) - Date.now()
    if (!Number.isFinite(delay) || delay <= 0) return
    const signal = { cancelled: false }
    const timer = setTimeout(() => load(signal), delay + 250)
    return () => {
      signal.cancelled = true
      clearTimeout(timer)
    }
  }, [focused, nextChangeAt, load])

  const featured = useMemo(() => {
    if (!featuredIds) return recipes.slice(0, 6)
    const byId = new Map(recipes.map(recipe => [recipe.id, recipe]))
    return featuredIds.flatMap(id => {
      const recipe = byId.get(id)
      return recipe ? [recipe] : []
    })
  }, [featuredIds, recipes])

  const visible = useMemo(() => {
    const q = foldForCompare(debouncedQuery)
    if (!q) return featured
    return recipes.filter(recipe => [recipe.title, recipe.description, recipe.cuisine, recipe.searchText ?? '']
      .some(value => foldForCompare(value).includes(q)))
  }, [debouncedQuery, featured, recipes])

  const searching = foldForCompare(debouncedQuery).length > 0
  const indexRange =
    visible.length === 0
      ? undefined
      : `${padded(1, 2, language)}–${padded(visible.length, 2, language)}`

  /**
   * Refresh the catalogue, saved state, and daily selection. Pull to refresh
   * also lets a reader recover when a refetch
   * failed over content already on screen, since that case deliberately keeps
   * the stale list rather than replacing it with the offline notice.
   *
   * The haptic fires on commit rather than on drag, so an abandoned pull doesn't
   * buzz.
   */
  async function handleRefresh() {
    refreshFeedback()
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const masthead = (
    <Masthead
      title={t('explore.title')}
      // No "+" here, and that is § 11's own instruction rather than an
      // oversight: a shared library is not somewhere you write. The avatar is
      // the only action, and it goes to Settings like it does everywhere else.
      actions={<ProfileButton />}
    />
  )

  const header = (
    <View style={styles.header}>
      {masthead}

      <View style={styles.controls}>
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('explore.searchPlaceholder')}
        />
      </View>

      {error && <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>}

      {visible.length > 0 && (
        <SectionHeader
          variant="recipe"
          label={t(searching ? 'dashboard.results' : 'explore.today')}
          count={indexRange}
          style={styles.indexHeader}
        />
      )}
    </View>
  )

  const topPad = useScreenTopPad()

  if (loading) return <MortarLoader />

  // SCREENS.md § 195. Only when the failure left us with *nothing* — a stale
  // list is more use than an apology, so a refetch that fails over content
  // already on screen falls through to the inline error in the header instead.
  if (error && recipes.length === 0) {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: topPad }}>
          {masthead}
          <Offline
            onOpenBook={() => navigation.navigate('index')}
            onRetry={() => {
              setLoading(true)
              load()
            }}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        key={columns}
        ref={listRef}
        numColumns={columns}
        columnWrapperStyle={columns === 2 ? styles.gridRow : undefined}
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
            // The spinner belongs to the content, and the content begins under
            // the status bar — without this it spins behind the clock.
            progressViewOffset={topPad}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={[styles.gridCell, columns === 1 && styles.singleCell]}>
          <Tile
            recipe={item}
            saved={savedIds.includes(item.id)}
            saving={savingIds.includes(item.id)}
            onSave={() => saveRecipe(item.id)}
            onPress={() => router.push(`/library/${item.id}`)}
          />
          </View>
        )}
        ListEmptyComponent={
          <NoResults
            suggestions={featured.slice(0, 2)}
            onWrite={() => router.push('/recipe/new')}
            onPick={(id) => router.push(`/library/${id}`)}
            onClear={() => setQuery('')}
          />
        }
      />
    </View>
  )
}

/**
 * SCREENS.md § 195 — Explore with no signal.
 *
 * The one screen in the app that has to say "this part needs the network and the
 * rest of your app does not", which is why it leads with a notice strip rather
 * than a heading: the strip is a status, and the copy underneath is the
 * reassurance. Its fill is `accentPill` — the same 9% tamarind the chips use for
 * their press state — so the warning is tinted rather than coloured, there being
 * no alert hue in this palette to reach for.
 *
 * The primary action leaves for the user's own book instead of retrying, and the
 * retry is the quiet link. Offline, the thing that will actually work is the
 * book; offering the failing request as the loudest control would be optimism at
 * the reader's expense.
 */
function Offline({ onOpenBook, onRetry }: { onOpenBook: () => void; onRetry: () => void }) {
  const styles = useThemedStyles(makeStyles)
  const t = useT()

  return (
    <View style={styles.offline}>
      <View style={styles.notice}>
        <View style={styles.noticeDot} />
        <Text style={styles.noticeText}>{t('explore.offlineTitle')}</Text>
      </View>

      {/* Moul's `◇` at `accentGhost`, unfilled — the same ghosted mark the empty
          states use, and an open diamond rather than the filled one precisely
          because nothing has been saved or found. */}
      <Text style={styles.ghost}>◇</Text>
      <Text style={styles.emptyTitle}>{t('explore.offlineBody')}</Text>
      <Text style={styles.emptyBody}>{t('explore.offlineSub')}</Text>
      <PrimaryButton
        label={t('explore.openMyBook')}
        onPress={onOpenBook}
        style={styles.emptyButton}
      />
      <TextLink label={t('explore.tryAgain')} onPress={onRetry} />
    </View>
  )
}

/** Photo and detail navigation are separate from the save action. */
function Tile({ recipe, saved, saving, onSave, onPress }: {
  recipe: LibrarySummary; saved: boolean; saving: boolean
  onSave: () => void; onPress: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  const { colors: c } = useTheme()
  const t = useT()
  const n = useNum()
  return (
    <View style={styles.tile}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={recipe.title}
        style={({ pressed }) => [styles.tileDetail, pressed && styles.tilePressed]}>
        <Image source={recipe.photoUrl} style={styles.tilePhoto} contentFit="cover" />
        <Text style={[styles.tileTitle, contentType('recipeTitle', recipe.title)]}>{recipe.title}</Text>
        <Text style={styles.tileCaption}>
          {recipe.localPreview ? `${t('explore.localPreview')} · ` : ''}
          {`${n(recipe.totalMinutes)} ${t('detail.minutes')}`}
        </Text>
      </Pressable>
      <Pressable onPress={onSave} disabled={saved || saving} accessibilityRole="button"
        accessibilityLabel={`${t(saved ? 'explore.inYourBook' : 'common.save')} · ${recipe.title}`}
        accessibilityState={{ disabled: saved || saving, busy: saving }}
        style={({ pressed }) => [styles.save, saved && styles.saved, pressed && styles.tilePressed]}>
        {saving ? <ActivityIndicator size="small" color={c.text} /> :
          <Text style={styles.saveLabel}>{t(saved ? 'explore.inYourBook' : 'common.save')}</Text>}
      </Pressable>
    </View>
  )
}

/**
 * SCREENS.md § 12 — Explore's own no-results, which is not the Recipes index's.
 *
 * A search miss offers two of today's dishes and a way to clear the query.
 */
function NoResults({
  suggestions,
  onWrite,
  onPick,
  onClear,
}: {
  suggestions: LibrarySummary[]
  onWrite: () => void
  onPick: (id: string) => void
  onClear: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  const t = useT()

  return (
    <View style={styles.empty}>
      {/* Moul at `accentGhost`, the same ghosted mark the empty book uses. A `?`
          rather than a numeral here — there is no count to show, and the
          question is the point. */}
      <Text style={styles.ghost}>?</Text>
      <Text style={styles.emptyTitle}>{t('explore.noResultsTitle')}</Text>
      <Text style={styles.emptyBody}>{t('explore.noResultsBody')}</Text>
      <PrimaryButton
        label={t('explore.writeYourself')}
        variant="outline"
        onPress={onWrite}
        style={styles.emptyButton}
      />
      <TextLink label={t('search.clear')} onPress={onClear} />

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <SectionHeader label={t('explore.didYouMean')} />
          {suggestions.map((recipe, index) => (
            <LedgerRow
              key={recipe.id}
              title={recipe.title}
              photoUrl={recipe.photoUrl}
              last={index === suggestions.length - 1}
              onPress={() => onPick(recipe.id)}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    list: { paddingBottom: spacing.xxl },
    header: { gap: spacing.sectionSpacing },
    controls: { paddingHorizontal: spacing.gutter },
    indexHeader: { paddingHorizontal: spacing.gutter, marginTop: spacing.sm },
    row: { marginHorizontal: spacing.gutter },
    error: { ...type.body, color: c.danger, paddingHorizontal: spacing.gutter },

    tiles: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md },
    // `flex: 1` on both, so the pair always divides the gutter exactly — a fixed
    // width would leave a ragged edge on every screen that isn't 390pt wide.
    tile: { flex: 1, minWidth: 0, marginHorizontal: 0, marginBottom: spacing.xl, gap: spacing.sm },
    gridRow: { paddingHorizontal: spacing.gutter, gap: spacing.md },
    gridCell: { flex: 1, minWidth: 0, maxWidth: '50%' },
    singleCell: { marginHorizontal: spacing.gutter, maxWidth: '100%' },
    tileDetail: { gap: spacing.sm, flex: 1 },
    save: { minHeight: sizes.hitMin, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderWidth: 1, borderColor: c.borderStrong, borderRadius: radius.thumb, alignItems: 'center', justifyContent: 'center' },
    saved: { backgroundColor: c.surfaceSunken, borderColor: c.surfaceSunken },
    saveLabel: { ...type.recipeMetadata, color: c.text, textAlign: 'center' },
    tilePressed: { opacity: 0.7 },
    tilePhoto: {
      aspectRatio: 4 / 3,
      borderRadius: radius.card,
      backgroundColor: c.surfaceSunken,
    },
    tileTitle: { color: c.text, marginTop: spacing.xs },
    // Type comes from `contentType` at the call site — see the note there.
    tileCaption: { color: c.textMuted },

    empty: {
      alignItems: 'center',
      gap: spacing.md,
      paddingTop: spacing.xxl,
      paddingHorizontal: spacing.gutter,
    },
    offline: {
      alignItems: 'center',
      gap: spacing.md,
      paddingTop: spacing.xxl,
      paddingHorizontal: spacing.gutter,
    },
    notice: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.accentPill,
      borderRadius: radius.notice,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    noticeDot: { width: 8, height: 8, borderRadius: radius.pill, backgroundColor: c.primary },
    noticeText: { ...type.metadataSmall, color: c.primary, textTransform: 'uppercase' },
    // Moul 46/1.45 — the mockup's size for both `?` and `◇`. It was set from
    // cook mode's 96/100 `stepNumeral`, which RN crops to the line box: the
    // glyph lost its middle and drew as two grey slivers.
    ghost: { ...sized(type.ghostGlyph, 46), color: c.accentGhost },
    // `emptyTitle`, not `screenTitle` — Moul 33 belongs to the recipe hero.
    emptyTitle: { ...type.emptyTitle, color: c.text, textAlign: 'center' },
    emptyBody: { ...type.bodyRead, color: c.textMuted, textAlign: 'center' },
    emptyButton: { alignSelf: 'stretch', marginTop: spacing.sm },
    suggestions: { alignSelf: 'stretch', marginTop: spacing.xl },
  })
