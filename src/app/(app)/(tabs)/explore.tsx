import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect, useNavigation, useRouter } from 'expo-router'
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { getLibrary, LIBRARY_SUBJECTS } from '@/lib/api'
import type { LibrarySubject, LibrarySummary } from '@/lib/api'
import { useDebounce } from '@/hooks/useDebounce'
import { refreshFeedback } from '@/lib/haptics'
import { foldForCompare } from '@/lib/text'
import { padded, useLanguage, useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useSubjectLabel } from '@/i18n/labels'
import Chip from '@/components/ui/Chip'
import LedgerRow from '@/components/ui/LedgerRow'
import Masthead from '@/components/ui/Masthead'
import PrimaryButton from '@/components/ui/PrimaryButton'
import ProfileButton from '@/components/ui/ProfileButton'
import SearchBar from '@/components/ui/SearchBar'
import SectionHeader from '@/components/ui/SectionHeader'
import Skeleton, { usePulse } from '@/components/ui/Skeleton'
import TextLink from '@/components/ui/TextLink'
import type { SwipeTabsNavigationProp } from '@/navigation/SwipeTabs'
import { contentType, radius, sized, spacing, useScreenTopPad, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

type Filter = 'All' | LibrarySubject

/** SCREENS.md § 11's tile height. Literal, like `Chip`'s 15×9 — it measures this
 *  control rather than being a step anyone should reach for elsewhere. */
const TILE_HEIGHT = 118

/** Two, and the band is hidden rather than shortened if fewer survive. */
const TILE_COUNT = 2

/** Under this many minutes, a recipe is in the "done inside an hour" collection. */
const QUICK_MINUTES = 60

const SKELETON_KEYS = ['e0', 'e1', 'e2', 'e3', 'e4']

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
  const n = useNum()
  const { language } = useLanguage()
  const subjectLabel = useSubjectLabel()
  const { token } = useAuth()
  const router = useRouter()
  const navigation = useNavigation<SwipeTabsNavigationProp>()
  const listRef = useRef<FlatList<LibrarySummary>>(null)

  const [recipes, setRecipes] = useState<LibrarySummary[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  // Separate from `loading`, for the reason the dashboard's is: reusing it would
  // replace the list you are looking at with skeletons on every pull. `loading`
  // is only ever true for the first fetch.
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<StringKey | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')

  const debouncedQuery = useDebounce(query)

  /**
   * The library is static content, so this could fetch once and never again —
   * but `savedIds` is not static, and it changes on the *other* screens. Copy a
   * recipe, then come back: without a refocus refetch the CTA still offers to
   * copy something already in the book.
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
      return () => {
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

  const visible = useMemo(() => {
    // Folded on both sides, as everywhere: Khmer keyboards emit zero-width
    // spaces that survive trim/lowercase/NFC, so folding only the query finds
    // nothing when it is the stored string carrying the ZWSP.
    //
    // **One language to search.** The library used to carry an English title
    // beside the Khmer one and this read both, so "amok" found អាម៉ុកត្រី. It is
    // Khmer only now, and that cost is real and was accepted — a reader typing
    // Latin finds nothing. If it ever needs solving, the fix is a romanised
    // search key on each row, not a second English copy of the recipe.
    const q = foldForCompare(debouncedQuery)
    return recipes.filter((r) => {
      if (filter !== 'All' && r.subject !== filter) return false
      if (!q) return true
      return (
        foldForCompare(r.title).includes(q) ||
        foldForCompare(r.description).includes(q) ||
        foldForCompare(r.cuisine).includes(q)
      )
    })
  }, [recipes, debouncedQuery, filter])

  const searching = debouncedQuery.trim().length > 0
  const browsing = !searching && filter === 'All'

  /**
   * Two tiles, preferring what the reader has *not* already taken.
   *
   * Deliberately not random: a band that reshuffles every time you come back
   * makes the tab feel like it has no memory, and this app already declined a
   * recommender it has no data for (see "Real recommendations" in CLAUDE.md).
   * Untaken-first, then by time, is a rule you can state in one sentence and
   * which stops suggesting a recipe once you have it.
   */
  const tiles = useMemo(() => {
    const unsaved = recipes.filter((r) => !savedIds.includes(r.id))
    return [...(unsaved.length >= TILE_COUNT ? unsaved : recipes)]
      .sort((a, b) => a.totalMinutes - b.totalMinutes)
      .slice(0, TILE_COUNT)
  }, [recipes, savedIds])

  /**
   * Two collections, both *derived* rather than hand-authored.
   *
   * SCREENS.md § 11 names "Sunday with the whole family" (9) and "Grandmother's
   * handwriting" (6) over a library that does not exist. Transcribing those
   * would mean inventing curation and hardcoding counts that the content cannot
   * back — the exact thing that kept Explore unbuilt. These two say something
   * true about the eight recipes and recount themselves when the library grows.
   */
  const collections = useMemo(
    () => [
      {
        key: 'kroeung' as const,
        label: t('explore.collectionKroeung'),
        ids: recipes.filter((r) => KROEUNG_DISHES.includes(r.id)).map((r) => r.id),
      },
      {
        key: 'quick' as const,
        label: t('explore.collectionQuick'),
        ids: recipes.filter((r) => r.totalMinutes <= QUICK_MINUTES).map((r) => r.id),
      },
    ],
    [recipes, t]
  )

  /**
   * The index's range, `០១–០៨`, exactly as the Recipes index computes it — the
   * header names the rows beneath it, so while a chip or a query is narrowing
   * the list it describes what survived rather than what the library holds.
   */
  const indexRange =
    visible.length === 0
      ? undefined
      : `${padded(1, 2, language)}–${padded(visible.length, 2, language)}`

  /**
   * The library itself is static, so this is really a refresh of `savedIds` —
   * and of the connection. It is the only recovery a reader has when a refetch
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

      {error && <Text style={styles.error}>{t(error)}</Text>}

      <View style={styles.section}>
        <SectionHeader label={t('explore.bySubject')} />
        {/* `flex-wrap: wrap`, straight from the mockup's own `BY SUBJECT` row.
            This is the band the design draws chips in, so it is the one that
            settles how a chip row behaves when it runs out of gutter. */}
        <View style={styles.chips}>
          {(['All', ...LIBRARY_SUBJECTS] as Filter[]).map((option) => (
            <Chip
              key={option}
              label={subjectLabel(option)}
              active={filter === option}
              onPress={() => setFilter(option)}
            />
          ))}
        </View>
      </View>

      {/* Both bands are about the library as a whole, so they step aside the
          moment a query or a chip narrows it — leaving them up would put two
          unrelated suggestions above a filtered result. */}
      {browsing && tiles.length === TILE_COUNT && (
        <View style={styles.section}>
          <SectionHeader
            label={t('explore.twoToTry')}
            count={n(
              new Date().toLocaleDateString(undefined, { month: 'short' })
            ).toUpperCase()}
          />
          <View style={styles.tiles}>
            {tiles.map((recipe) => (
              <Tile
                key={recipe.id}
                title={recipe.title}
                photoUrl={recipe.photoUrl}
                // No `.toUpperCase()`: `headline` is Khmer, which has no case,
                // so it was a no-op dressed up as a caption style.
                caption={`${recipe.headline} · ${n(recipe.totalMinutes)}′`}
                onPress={() => router.push(`/library/${recipe.id}`)}
              />
            ))}
          </View>
        </View>
      )}

      {browsing && (
        <View style={styles.section}>
          <SectionHeader label={t('explore.collections')} />
          {collections.map((collection, index) => (
            <LedgerRow
              key={collection.key}
              title={collection.label}
              value={n(collection.ids.length)}
              last={index === collections.length - 1}
              onPress={() => {
                // A collection is a saved query, not a place. Dropping the chip
                // back to All and putting its name in the search box is what
                // makes the back-out obvious — you clear a field, you don't hunt
                // for the way out of a screen you didn't mean to open.
                setFilter('All')
                setQuery(collection.label)
              }}
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

  const topPad = useScreenTopPad()

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ paddingTop: topPad }}>
          {masthead}
          <ExploreSkeleton />
        </View>
      </View>
    )
  }

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
            // The spinner belongs to the content, and the content begins under
            // the status bar — without this it spins behind the clock.
            progressViewOffset={topPad}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <LedgerRow
            style={styles.row}
            title={item.title}
            photoUrl={item.photoUrl}
            // A tick would mean "done"; this is "you have it". The saved marker
            // is the value column rather than a checkbox for that reason — and
            // because a checkbox you cannot untick is a broken control.
            value={
              savedIds.includes(item.id)
                ? t('explore.inYourBook')
                : `${n(item.totalMinutes)} ${t('detail.minutes')}`
            }
            last={index === visible.length - 1}
            onPress={() => router.push(`/library/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <NoResults
            suggestions={recipes.slice(0, 2)}
            onWrite={() => router.push('/recipe/new')}
            onPick={(id) => router.push(`/library/${id}`)}
            onClear={() => {
              setQuery('')
              setFilter('All')
            }}
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

/**
 * The dishes built on kroeung, by id — the paste itself first, since it is the
 * thing you would make before any of the others.
 *
 * A list rather than a scan of the ingredients, and not because scanning is
 * hard: the browse payload carries no ingredients at all, by design. It is also
 * the more honest rule — the collection means "starts by making this", which is
 * a fact about the method, not about a string appearing in an array.
 */
const KROEUNG_DISHES = [
  'kroeung',
  'fish-amok',
  'grilled-stuffed-squid',
  'chicken-emerald-soup',
]

/**
 * SCREENS.md § 11's 118pt tile. A photograph, a title over it, and a mono
 * caption beneath — the one place on this screen where a picture is the control
 * rather than a 46pt thumbnail beside a rule.
 */
function Tile({
  title,
  photoUrl,
  caption,
  onPress,
}: {
  title: string
  photoUrl: string
  caption: string
  onPress: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <Image source={{ uri: photoUrl }} style={styles.tilePhoto} resizeMode="cover" />
      {/* A recipe name, so the face follows its script rather than the toggle —
          the same rule every other user-written string on screen follows. */}
      <Text style={[styles.tileTitle, contentType('bodyStrong', title)]} numberOfLines={2}>
        {title}
      </Text>
      {/* `headline` is an ingredient name — content — so the caption goes
          through `contentType` too. The Latin `metadataSmall` is IBM Plex Mono,
          which has no Khmer glyphs at all: keyed to the language instead, every
          tile caption in the library would render as tofu. */}
      <Text style={[styles.tileCaption, contentType('metadataSmall', caption)]} numberOfLines={1}>
        {caption}
      </Text>
    </Pressable>
  )
}

/**
 * SCREENS.md § 12 — Explore's own no-results, which is not the Recipes index's.
 *
 * The difference is the second line: a search that misses here has missed in two
 * places, the user's book *and* the shared collections, and saying so is what
 * stops the screen reading as though the library were broken. `DID YOU MEAN`
 * then offers real rows rather than spell-corrections — with eight recipes,
 * showing two of them is more use than guessing at the typo.
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

/**
 * Copies the real screen's measurements — the chip row's height, the 118pt
 * tiles, the 46pt row thumbnails — so nothing jumps when the fetch lands.
 * `usePulse()` once, shared: independent animations drift out of phase within
 * seconds and read as broken rather than as loading.
 */
function ExploreSkeleton() {
  const styles = useThemedStyles(makeStyles)
  const pulse = usePulse()
  return (
    <View style={styles.skeleton}>
      <Skeleton pulse={pulse} style={styles.skeletonSearch} />
      <View style={styles.skeletonChips}>
        {['c0', 'c1', 'c2'].map((key) => (
          <Skeleton key={key} pulse={pulse} style={styles.skeletonChip} />
        ))}
      </View>
      <View style={styles.tiles}>
        <Skeleton pulse={pulse} style={styles.skeletonTile} />
        <Skeleton pulse={pulse} style={styles.skeletonTile} />
      </View>
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
    list: { paddingBottom: spacing.xxl },
    header: { gap: spacing.sectionSpacing },
    controls: { paddingHorizontal: spacing.gutter },
    section: { paddingHorizontal: spacing.gutter },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingTop: spacing.sm },
    indexHeader: { paddingHorizontal: spacing.gutter, marginTop: spacing.sm },
    row: { marginHorizontal: spacing.gutter },
    error: { ...type.body, color: c.danger, paddingHorizontal: spacing.gutter },

    tiles: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.md },
    // `flex: 1` on both, so the pair always divides the gutter exactly — a fixed
    // width would leave a ragged edge on every screen that isn't 390pt wide.
    tile: { flex: 1, gap: spacing.xs },
    tilePressed: { opacity: 0.7 },
    tilePhoto: {
      height: TILE_HEIGHT,
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

    skeleton: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xl, gap: spacing.lg },
    skeletonSearch: { height: 48, borderRadius: radius.card },
    skeletonChips: { flexDirection: 'row', gap: spacing.sm },
    skeletonChip: { width: 64, height: 34, borderRadius: radius.pill },
    skeletonTile: { flex: 1, height: TILE_HEIGHT, borderRadius: radius.card },
    skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    skeletonThumb: { width: 46, height: 46, borderRadius: radius.thumb },
    skeletonText: { flex: 1 },
    skeletonTitle: { width: '70%', height: 15 },
    skeletonValue: { width: 44, height: 11 },
  })
