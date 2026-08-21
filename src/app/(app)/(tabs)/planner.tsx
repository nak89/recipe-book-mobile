import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { useWeek } from '@/context/WeekContext'
import { clearPlanSlot, getPlan, getRecipes, setPlanSlot } from '@/lib/api'
import { addDays, toDateKey, weekDays } from '@/lib/week'
import { openMenuFeedback, selectionFeedback } from '@/lib/haptics'
import DayStrip from '@/components/planner/DayStrip'
import RecipePicker from '@/components/planner/RecipePicker'
import ActionSheet from '@/components/ui/ActionSheet'
import AddRow from '@/components/ui/AddRow'
import LedgerRow from '@/components/ui/LedgerRow'
import Masthead from '@/components/ui/Masthead'
import ProfileButton from '@/components/ui/ProfileButton'
import SectionHeader from '@/components/ui/SectionHeader'
import Skeleton, { usePulse } from '@/components/ui/Skeleton'
import { useNum, useT } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useMealtimeLabel, useMonthLabel } from '@/i18n/labels'
import type { StringKey } from '@/i18n/strings'
import { radius, spacing, useScreenTopPad, useThemedStyles } from '@/theme'
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
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const mealtimeLabel = useMealtimeLabel()
  const monthLabel = useMonthLabel()
  const { token } = useAuth()
  const topPad = useScreenTopPad()
  const router = useRouter()
  const pulse = usePulse()

  // The week is shared with the grocery list rather than held here: the two are
  // views of one thing, and the shopping happens *before* the week it is for, so
  // planning next week and then swiping across has to reach next week's list.
  const { weekStart, weekStartKey, weekEndKey, shiftWeek: shiftSharedWeek, goToToday } = useWeek()
  // The selected *day* stays local — the grocery list has no notion of one.
  const [selected, setSelected] = useState(() => new Date())
  const [slots, setSlots] = useState<PlanSlot[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  // The key, never the translated sentence — otherwise an on-screen error
  // freezes in the language that raised it and `t` becomes a fetch dependency.
  const [error, setError] = useState<StringKey | null>(null)
  const [pickerFor, setPickerFor] = useState<Mealtime | null>(null)
  const [sheetFor, setSheetFor] = useState<Mealtime | null>(null)

  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const from = weekStartKey
  const to = weekEndKey
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

  function shiftWeek(by: number) {
    shiftSharedWeek(by)
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

  /**
   * `10 — 16 AUGUST`, in the **app's** language.
   *
   * It used to read the month off the phone's locale, on the reasoning that a
   * phone-native month name beats one Hermes' reduced ICU might silently render
   * in English. Both halves of that were true and the conclusion still wasn't:
   * a Khmer UI printed Khmer numerals against an English month on one line,
   * which is the one-language-at-a-time rule broken in the place it is most
   * visible. `useMonthLabel` reads the app's own dictionary, so neither ICU nor
   * the phone gets a say.
   */
  const weekLabel = `${n(days[0].getDate())} — ${n(days[6].getDate())} ${monthLabel(
    days[6]
  ).toUpperCase()}`

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad, paddingBottom: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Masthead title={t('week.masthead')} actions={<ProfileButton />} />

        <View style={styles.weekNav}>
          <Arrow direction="back" label={t('planner.previousWeek')} onPress={() => shiftWeek(-1)} />
          <Pressable
            onPress={() => {
              goToToday()
              setSelected(new Date())
              selectionFeedback()
            }}
            accessibilityRole="button"
            accessibilityLabel={t('planner.thisWeek')}
            style={({ pressed }) => [styles.weekLabelWrap, pressed && styles.pressed]}
          >
            {/* Tapping the label returns to today — the one navigation a week
                view always needs, and the arrows make it tedious after a few. */}
            <Text style={styles.weekLabel} numberOfLines={1}>
              {weekLabel}
            </Text>
          </Pressable>
          <Arrow direction="forward" label={t('planner.nextWeek')} onPress={() => shiftWeek(1)} />
        </View>

        <DayStrip days={days} selected={selected} plannedKeys={plannedKeys} onSelect={setSelected} />

        {/* The design's day summary ("3 dishes planned" left, total time in
            tamarind mono right) is deliberately gone. On an empty day it said
            "Nothing planned yet." directly above the empty block saying the
            same sentence — the same words twice, forty pixels apart — and on a
            full day it only counted rows you can already see and see the
            duration of. The four ruled sections below are the summary. */}

        {error && <Text style={styles.error}>{t(error)}</Text>}

        {loading ? (
          <View style={styles.slots}>
            {MEALTIMES.map((mealtime) => (
              <View key={mealtime} style={styles.section}>
                <Skeleton pulse={pulse} style={styles.headingSkeleton} />
                <Skeleton pulse={pulse} style={styles.slotSkeleton} />
              </View>
            ))}
          </View>
        ) : recipes.length === 0 ? (
          /* No recipes at all is a different state from an unplanned week, and
             it needs a different answer: planning is impossible until something
             exists to plan, so the week's own empty copy would be a dead end. */
          <View style={styles.empty}>
            <View style={styles.ghostRule} />
            <Text style={styles.emptyTitle}>{t('planner.noRecipesTitle')}</Text>
            <Text style={styles.emptyBody}>{t('planner.noRecipesBody')}</Text>
          </View>
        ) : (
          /* An empty day draws the same four ruled sections as a full one.
             SCREENS.md § 14's centred block — ghost em-dash, one muted line and
             a row that only *revealed* these sections — is gone: it put a tap
             between the user and the thing they came to do, and the four
             headings say "nothing planned" by standing empty. */
          <View style={styles.slots}>
            {MEALTIMES.map((mealtime) => {
              const slot = bySlot.get(`${selectedKey}|${mealtime}`)
              const label = mealtimeLabel(mealtime)
              return (
                <View key={mealtime} style={styles.section}>
                  <SectionHeader label={label} />
                  {slot ? (
                    <LedgerRow
                      title={slot.recipe.title}
                      photoUrl={slot.recipe.photoUrl}
                      value={`${n(slot.recipe.totalMinutes)} ${t('detail.minutes')}`}
                      last
                      onPress={() => router.push(`/recipe/${slot.recipeId}`)}
                      onLongPress={() => {
                        openMenuFeedback()
                        setSheetFor(mealtime)
                      }}
                    />
                  ) : (
                    <AddRow
                      // Lowercased for English sentence flow ("Add breakfast").
                      // A no-op in Khmer, which has no letter case at all.
                      label={t('planner.addSlot').replace('{meal}', label.toLowerCase())}
                      onPress={() => setPickerFor(mealtime)}
                    />
                  )}
                </View>
              )
            })}
            {/* SCREENS.md § 13 closes the page with a bordered SEND WEEK TO
                MARKET button. It is gone: the market list is *derived* from
                this plan and is never stored, so putting a dish on a day has
                already sent its ingredients. A button offering to do what the
                data model does on its own implies the list can be stale. */}
          </View>
        )}
      </ScrollView>

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
            // way the index layers its delete confirmation over this sheet.
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

/** The arrow's box, and the two numbers its strokes are built from. */
const ARROW = 32
const THICK = 1.4
/** How far a 9pt stroke at 45° reaches from its own centre, vertically. */
const REACH = (9 / 2) * Math.SQRT1_2

/**
 * A week-navigation arrow, drawn from two 1.4px rules.
 *
 * Not an `Ionicons` chevron: at this size that glyph carries a text face's
 * stroke contrast and lands visibly heavier than every other mark on the page.
 * The circle around it is gone too — Chronicle has no filled icon buttons.
 *
 * The two strokes are positioned off `REACH` rather than off a hand-picked
 * inset so they close at the vertex. Change the 9pt length and the point still
 * meets; hardcode the offsets again and it won't.
 */
function Arrow({
  direction,
  label,
  onPress,
}: {
  direction: 'back' | 'forward'
  label: string
  onPress: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}
    >
      <View style={[styles.arrowTop, direction === 'forward' && styles.arrowTopForward]} />
      <View style={[styles.arrowBottom, direction === 'forward' && styles.arrowBottomForward]} />
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { gap: spacing.sectionSpacing },

    weekNav: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.gutter,
      // Pulls back against the page's 20pt section gap to the mockup's 12,
      // which sits the week under its masthead rule rather than floating it
      // halfway to the day strip. `content` sets the gap for the whole page, so
      // the correction belongs here rather than as a different gap for all.
      marginTop: -spacing.sm,
    },
    weekLabelWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: ARROW },
    // `sectionLabel`, not `metadata`: the mockup sets this line at mono **500**
    // with .2em tracking, and `metadata` is mono 400 with none at all — which
    // is the whole of why it read tighter and lighter here than in the design.
    // The Khmer half of `sectionLabel` is Kantumruy Medium 13 with tracking
    // dropped, which is also what the mockup specifies.
    weekLabel: { ...type.sectionLabel, color: c.text, textTransform: 'uppercase' },
    pressed: { opacity: 0.6 },

    arrow: { width: 24, height: ARROW, justifyContent: 'center' },
    // The two strokes meet at a point, and the geometry has to say so: a 9pt
    // bar at 45° reaches 9/2·sin45 ≈ 3.18 above and below its own centre, so
    // each bar's centre sits exactly that far from the container's middle and
    // the halves join. They were both inset 10 from their own edge, which left
    // a 4pt gap at the vertex — the arrowheads looked snapped off.
    arrowTop: {
      position: 'absolute',
      left: 6,
      top: ARROW / 2 - REACH - THICK / 2,
      width: 9,
      height: THICK,
      backgroundColor: c.text,
      transform: [{ rotate: '-45deg' }],
    },
    arrowBottom: {
      position: 'absolute',
      left: 6,
      bottom: ARROW / 2 - REACH - THICK / 2,
      width: 9,
      height: THICK,
      backgroundColor: c.text,
      transform: [{ rotate: '45deg' }],
    },
    arrowTopForward: { transform: [{ rotate: '45deg' }] },
    arrowBottomForward: { transform: [{ rotate: '-45deg' }] },

    slots: { gap: spacing.sectionSpacing },
    section: { paddingHorizontal: spacing.gutter },
    headingSkeleton: { height: 12, width: 96, borderRadius: 4, marginBottom: spacing.sectionGap },
    slotSkeleton: { height: 70, borderRadius: radius.thumb },

    error: { ...type.body, color: c.danger, paddingHorizontal: spacing.gutter },

    empty: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.gutter, paddingTop: spacing.xxl },
    // SCREENS.md § 20's ghost: a rule, not a glyph. A week has no numeral to
    // ghost the way an empty book has its `០`, and a stray `0` here would read
    // as a count of something.
    ghostRule: { width: 54, height: 1.5, backgroundColor: c.borderStrong, marginBottom: spacing.sm },
    emptyTitle: { ...type.emptyTitle, color: c.text, textAlign: 'center' },
    emptyBody: { ...type.bodyRead, color: c.textMuted, textAlign: 'center' },
  })
