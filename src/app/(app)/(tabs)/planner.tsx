import { useCallback, useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { clearPlanSlot, getPlan, getRecipes, setPlanSlot } from '@/lib/api'
import { addDays, isSameDay, toDateKey, weekDays } from '@/lib/week'
import { openMenuFeedback, selectionFeedback } from '@/lib/haptics'
import DayStrip from '@/components/planner/DayStrip'
import { EmptySlot, FilledSlot, PLAN_SLOT_HEIGHT } from '@/components/planner/PlanSlot'
import RecipePicker from '@/components/planner/RecipePicker'
import ActionSheet from '@/components/ui/ActionSheet'
import ProfileButton from '@/components/ui/ProfileButton'
import Skeleton, { usePulse } from '@/components/ui/Skeleton'
import { useDockClearance } from '@/components/TabBar'
import { useDockScrollHandler } from '@/components/dock/DockScroll'
import { useT } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useMealtimeLabel } from '@/i18n/labels'
import type { StringKey } from '@/i18n/strings'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { MEALTIMES } from '@/types/recipe'
import type { Mealtime, PlanSlot, Recipe } from '@/types/recipe'

/**
 * The meal planner: a week of days, each holding one slot per mealtime.
 *
 * A slot is addressed by `(date, mealtime)` and the API is a PUT to that
 * address, so filling one is idempotent and the optimistic writes here are safe
 * to retry. Nothing on this screen creates a resource — the slots all exist
 * conceptually the moment the week does.
 *
 * The plan and the recipe library are fetched separately. They could be one
 * request, but the picker needs the whole library and the rows need only the
 * six fields the plan endpoint already embeds — merging them would mean sending
 * every recipe's ingredients and steps to a screen that renders neither.
 */
export default function PlannerScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const mealtimeLabel = useMealtimeLabel()
  const { token } = useAuth()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const dockClearance = useDockClearance()
  const dockScrollHandler = useDockScrollHandler()
  const pulse = usePulse()

  // `anchor` is any day in the week being shown; the strip derives the seven
  // from it. Keeping a *day* rather than a week index means "today" needs no
  // special case and the week rolls over at midnight without arithmetic.
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => new Date())
  const [slots, setSlots] = useState<PlanSlot[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  // The key, never the translated sentence — otherwise an on-screen error
  // freezes in the language that raised it and `t` becomes a fetch dependency.
  const [error, setError] = useState<StringKey | null>(null)
  const [pickerFor, setPickerFor] = useState<Mealtime | null>(null)
  const [sheetFor, setSheetFor] = useState<Mealtime | null>(null)

  const days = useMemo(() => weekDays(anchor), [anchor])
  const from = toDateKey(days[0])
  const to = toDateKey(days[days.length - 1])
  const selectedKey = toDateKey(selected)

  useFocusEffect(
    useCallback(() => {
      if (!token) return
      let cancelled = false
      setError(null)
      Promise.all([getPlan(from, to, token), getRecipes(token)])
        .then(([plan, library]) => {
          if (cancelled) return
          // Same bail-out as the dashboard's refocus refetch: a screen regains
          // focus while its transition is still running, and an unconditional
          // setState rebuilds the whole week on the frames the animation needs.
          setSlots((prev) => (JSON.stringify(prev) === JSON.stringify(plan) ? prev : plan))
          setRecipes((prev) => (JSON.stringify(prev) === JSON.stringify(library) ? prev : library))
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
    }, [token, from, to])
  )

  /** Slots keyed `date|mealtime`, so a lookup per row is O(1) rather than a scan. */
  const bySlot = useMemo(() => {
    const map = new Map<string, PlanSlot>()
    for (const slot of slots) map.set(`${slot.date}|${slot.mealtime}`, slot)
    return map
  }, [slots])

  const plannedKeys = useMemo(() => new Set(slots.map((s) => s.date)), [slots])

  const total = days.length * MEALTIMES.length

  /**
   * Counted over the week on screen, not over `slots.length`.
   *
   * Shifting the week re-runs the fetch but leaves the previous week's rows in
   * state until it lands — harmless for the strip and the slots, which look up
   * by date and simply miss, but `slots.length` would spend that moment
   * reporting last week's total under this week's days. Comparing the keys as
   * strings is safe: `YYYY-MM-DD` sorts lexicographically the same way it sorts
   * chronologically, which is most of why the format was chosen.
   */
  const plannedThisWeek = useMemo(
    () => slots.filter((s) => s.date >= from && s.date <= to).length,
    [slots, from, to]
  )

  function shiftWeek(by: number) {
    const next = addDays(anchor, by * 7)
    setAnchor(next)
    // Move the selection with the week rather than leaving it on a day no longer
    // shown. Landing on the same weekday is what makes "next week" feel like a
    // step sideways instead of a jump.
    setSelected(addDays(selected, by * 7))
    selectionFeedback()
  }

  async function assign(mealtime: Mealtime, recipe: Recipe) {
    if (!token) return
    setPickerFor(null)
    setSheetFor(null)
    const previous = slots
    // Optimistic: the row has to fill under your finger. The temporary id is
    // replaced by the server's on success and thrown away on failure.
    const optimistic: PlanSlot = {
      id: `pending:${selectedKey}:${mealtime}`,
      date: selectedKey,
      mealtime,
      recipeId: recipe.id,
      recipe: {
        id: recipe.id,
        title: recipe.title,
        photoUrl: recipe.photoUrl,
        totalMinutes: recipe.totalMinutes,
        servings: recipe.servings,
        mealtime: recipe.mealtime,
      },
    }
    setSlots((prev) => [
      ...prev.filter((s) => !(s.date === selectedKey && s.mealtime === mealtime)),
      optimistic,
    ])
    try {
      const saved = await setPlanSlot(selectedKey, mealtime, recipe.id, token)
      setSlots((prev) => prev.map((s) => (s.id === optimistic.id ? saved : s)))
    } catch {
      // A specific message, not the status mapping: the useful thing to say
      // when an optimistic row snaps back is which action failed.
      setSlots(previous)
      setError('error.savePlan')
    }
  }

  async function clear(mealtime: Mealtime) {
    if (!token) return
    setSheetFor(null)
    const previous = slots
    setSlots((prev) => prev.filter((s) => !(s.date === selectedKey && s.mealtime === mealtime)))
    try {
      await clearPlanSlot(selectedKey, mealtime, token)
    } catch {
      setSlots(previous)
      setError('error.clearPlan')
    }
  }

  const sheetSlot = sheetFor ? bySlot.get(`${selectedKey}|${sheetFor}`) : undefined

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: dockClearance },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={dockScrollHandler}
        scrollEventThrottle={16}
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('planner.title')}</Text>
            <Text style={styles.subtitle}>
              {t('planner.subtitle')
                .replace('{n}', String(plannedThisWeek))
                .replace('{total}', String(total))}
            </Text>
          </View>
          <ProfileButton />
        </View>

        <View style={styles.weekNav}>
          <Pressable
            onPress={() => shiftWeek(-1)}
            accessibilityRole="button"
            accessibilityLabel={t('planner.previousWeek')}
            style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={18} color={c.text} />
          </Pressable>

          <Pressable
            onPress={() => {
              const today = new Date()
              setAnchor(today)
              setSelected(today)
              selectionFeedback()
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.weekLabelWrap, pressed && styles.pressed]}
          >
            {/* Tapping the label returns to today — the one navigation a week
                view always needs and the arrows make tedious after a few taps. */}
            <Text style={styles.weekLabel} numberOfLines={1}>
              {days.some((d) => isSameDay(d, new Date()))
                ? t('planner.thisWeek')
                : `${days[0].getDate()} – ${days[6].getDate()}`}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => shiftWeek(1)}
            accessibilityRole="button"
            accessibilityLabel={t('planner.nextWeek')}
            style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-forward" size={18} color={c.text} />
          </Pressable>
        </View>

        <DayStrip days={days} selected={selected} plannedKeys={plannedKeys} onSelect={setSelected} />

        {error && <Text style={styles.error}>{t(error)}</Text>}

        {loading ? (
          // The skeleton copies the real row's height exactly, so the slots land
          // where the placeholders were instead of the page jumping.
          <View style={styles.slots}>
            {MEALTIMES.map((mealtime) => (
              <View key={mealtime} style={styles.section}>
                <Skeleton pulse={pulse} style={styles.headingSkeleton} />
                <Skeleton pulse={pulse} style={styles.slotSkeleton} />
              </View>
            ))}
          </View>
        ) : recipes.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color={c.textPlaceholder} />
            <Text style={styles.emptyTitle}>{t('planner.noRecipesTitle')}</Text>
            <Text style={styles.emptyBody}>{t('planner.noRecipesBody')}</Text>
          </View>
        ) : (
          <View style={styles.slots}>
            {MEALTIMES.map((mealtime) => {
              const slot = bySlot.get(`${selectedKey}|${mealtime}`)
              const label = mealtimeLabel(mealtime)
              return (
                <View key={mealtime} style={styles.section}>
                  <Text style={styles.sectionTitle}>{label}</Text>
                  {slot ? (
                    <FilledSlot
                      recipe={slot.recipe}
                      meta={`${slot.recipe.totalMinutes} min · ${slot.recipe.servings}`}
                      moreLabel={t('planner.change')}
                      onPress={() => router.push(`/recipe/${slot.recipeId}`)}
                      onLongPress={() => {
                        openMenuFeedback()
                        setSheetFor(mealtime)
                      }}
                    />
                  ) : (
                    <EmptySlot
                      // Lowercased for English sentence flow ("Add breakfast").
                      // A no-op on Khmer, which has no letter case at all.
                      label={t('planner.addSlot').replace('{meal}', label.toLowerCase())}
                      onPress={() => setPickerFor(mealtime)}
                    />
                  )}
                </View>
              )
            })}
          </View>
        )}
      </Animated.ScrollView>

      <RecipePicker
        visible={pickerFor !== null}
        title={
          pickerFor
            ? t('planner.pickTitle').replace('{meal}', mealtimeLabel(pickerFor).toLowerCase())
            : ''
        }
        recipes={recipes}
        onPick={(recipe) => pickerFor && assign(pickerFor, recipe)}
        onClose={() => {
          setPickerFor(null)
          setSheetFor(null)
        }}
      />

      <ActionSheet
        visible={sheetFor !== null}
        title={sheetSlot?.recipe.title}
        onClose={() => setSheetFor(null)}
        actions={[
          {
            label: t('planner.change'),
            icon: 'swap-horizontal-outline',
            // The sheet is deliberately left open behind the picker, the same
            // way the dashboard layers its delete confirmation over this sheet.
            // Closing one Modal while presenting another in the same frame is
            // the "attempt to present while presenting" race on iOS; both are
            // dismissed together when the picker resolves.
            onPress: () => setPickerFor(sheetFor),
          },
          {
            label: t('planner.clear'),
            icon: 'close-circle-outline',
            destructive: true,
            onPress: () => sheetFor && clear(sheetFor),
          },
        ]}
      />
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { gap: spacing.lg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    headerText: { flex: 1, minWidth: 0, gap: 2 },
    // No pinned lineHeight — a Khmer cluster stacks marks above the base
    // consonant and both platforms shave the line box from the top.
    title: { ...type.display, color: c.text },
    subtitle: { ...type.body, color: c.textMuted },
    weekNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.lg,
    },
    navButton: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weekLabelWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 38 },
    weekLabel: { ...type.bodyStrong, color: c.text },
    pressed: { opacity: 0.85 },
    slots: { gap: spacing.lg },
    section: { gap: spacing.sm, paddingHorizontal: spacing.lg },
    sectionTitle: { ...type.section, color: c.text },
    headingSkeleton: { height: 17, width: 96, borderRadius: radius.sm },
    slotSkeleton: { height: PLAN_SLOT_HEIGHT, borderRadius: radius.md },
    error: { ...type.body, color: c.danger, paddingHorizontal: spacing.lg },
    empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxl },
    emptyTitle: { ...type.section, color: c.text },
    emptyBody: { ...type.body, color: c.textMuted, textAlign: 'center' },
  })
