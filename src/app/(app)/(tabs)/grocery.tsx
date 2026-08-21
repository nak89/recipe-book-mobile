import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native'
import type { TextInput as RNTextInput } from 'react-native'
import Animated, { LinearTransition } from 'react-native-reanimated'
import { Text, TextInput } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { useWeek } from '@/context/WeekContext'
import {
  addGroceryItem,
  getGroceryList,
  removeGroceryItem,
  setGroceryLine,
  updateGroceryItem,
} from '@/lib/api'
import type { GroceryItem, GroceryLine, GroceryList } from '@/lib/api'
import {
  atFloor,
  contributes,
  decrement,
  formatAmount,
  increment,
  isNarrowed,
  shareOf,
} from '@/lib/grocery'
import type { Lens } from '@/lib/grocery'
import { favouriteFeedback, selectionFeedback } from '@/lib/haptics'
import { setGroceryOutstanding } from '@/lib/groceryBadge'
import { isSameDay, toDateKey, weekDays } from '@/lib/week'
import { aisleForIngredient, AISLES } from '@/data/aisles'
import type { Aisle } from '@/data/aisles'
import { emojiForIngredient } from '@/data/ingredients'
import DishFilter from '@/components/grocery/DishFilter'
import LedgerRow from '@/components/ui/LedgerRow'
import Masthead, { MastheadAction, mastheadGlyphScale } from '@/components/ui/Masthead'
import ProfileButton from '@/components/ui/ProfileButton'
import SectionHeader from '@/components/ui/SectionHeader'
import Skeleton, { usePulse } from '@/components/ui/Skeleton'
import { ShareIcon } from '@/components/ui/icons'
import { parseNumeric, useLanguage, useNum, useT } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useAisleLabel } from '@/i18n/labels'
import type { StringKey } from '@/i18n/strings'
import {
  duration,
  ease,
  inputType,
  minHeights,
  radius,
  sizes,
  spacing,
  useScreenTopPad,
  useTheme,
  useThemedStyles,
} from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * The shopping list for the week on screen.
 *
 * **Derived, not stored.** The server reads the week's plan, walks its recipes'
 * ingredients and sums them, so changing Tuesday's dinner changes this list on
 * the next read — there is no rebuild button because there is nothing to
 * rebuild. What the database holds is only what derivation can't know: which
 * lines you have ticked, which amounts you have corrected by hand, and the
 * things you added yourself.
 *
 * **The week comes from `WeekContext`, shared with the planner**, because these
 * two tabs are two views of one week and shopping happens before the week it is
 * for. The three scope tabs and the dish chips under them both filter what has
 * already been fetched rather than re-fetching, which is why the whole screen —
 * every scope, every dish — is one request.
 *
 * **A ticked row sinks to `Gathered` at the foot of the list**, so the top of
 * the page is always what is still to buy and the shop shortens as you walk it.
 * This reverses an earlier rule — that ticked rows stay exactly where they are,
 * on the reasoning that a list reordering itself under your finger in a shop is
 * worse than a long one — and the motion is what pays for the reversal: the row
 * *travels* to its new place rather than teleporting out of one and into the
 * other, so you can see where the thing you just ticked went. Nothing is
 * hidden; un-ticking sends it back to its aisle by the same route.
 */
type Scope = 'week' | 'day' | 'missing'

/**
 * One drawn row: a line the plan derived, or something you typed in yourself.
 *
 * The two used to live in separate parts of the screen and never meet. They
 * share a `Section` now because `Gathered` takes both — a thing you added and
 * then found is as gathered as a thing the plan asked for.
 */
type Row = { kind: 'line'; line: GroceryLine } | { kind: 'item'; item: GroceryItem }

/**
 * A run of rows under one ruled header.
 *
 * The label is a union rather than a string because resolving one needs a hook
 * (`useAisleLabel`, `useT`), and both return a fresh function every render — put
 * them in the memo's dependencies and it recomputes on every render instead of
 * when the list changes.
 */
interface Section {
  id: string
  label: { aisle: Aisle } | { key: StringKey }
  rows: Row[]
}

/**
 * Lines bucketed into aisles, in the fixed order of `AISLES` rather than the
 * order the server sent — a shop has a layout and the list should follow it,
 * not the alphabet. Empty aisles are dropped.
 *
 * The aisle is derived from the *stored* name and never from the current
 * language, exactly as the emoji is. See `data/aisles.ts`.
 */
function byAisle(lines: GroceryLine[]): { aisle: Aisle; lines: GroceryLine[] }[] {
  const buckets = new Map<Aisle, GroceryLine[]>()
  for (const line of lines) {
    const aisle = aisleForIngredient(line.name)
    const bucket = buckets.get(aisle)
    if (bucket) bucket.push(line)
    else buckets.set(aisle, [line])
  }
  return AISLES.map((aisle) => ({ aisle, lines: buckets.get(aisle) ?? [] })).filter(
    (group) => group.lines.length > 0
  )
}

/**
 * How a row moves when it changes place.
 *
 * A plain timing on the design's own curve, never a spring: Chronicle allows
 * four transitions in the whole product and the paper does not bounce. It is a
 * `layout` transition rather than an enter/exit pair, which is the whole reason
 * the list is drawn as one flat parent — see `styles.list`.
 *
 * Reanimated's layout animations default to `ReduceMotion.System`, so anyone
 * who has asked their phone for less motion gets the row in its new place with
 * no travel and nothing else changes.
 */
const rowTransition = LinearTransition.duration(duration.sheet).easing(ease.outCubic)

/** The drawn height of a stepper button, and the slop that returns it to 44. */
const STEP_BUTTON = 34
const STEP_SLOP = { top: (sizes.hitMin - STEP_BUTTON) / 2, bottom: (sizes.hitMin - STEP_BUTTON) / 2 }

export default function GroceryScreen() {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const { language } = useLanguage()
  const aisleLabel = useAisleLabel()
  const { token } = useAuth()
  const { weekStart, weekStartKey, weekEndKey } = useWeek()
  const topPad = useScreenTopPad()
  const pulse = usePulse()

  const [list, setList] = useState<GroceryList | null>(null)
  const [loading, setLoading] = useState(true)
  // The key, never the translated sentence — otherwise an on-screen error
  // freezes in the language that raised it and `t` becomes a fetch dependency.
  const [error, setError] = useState<StringKey | null>(null)
  const [scope, setScope] = useState<Scope>('week')
  /**
   * The dish the list is narrowed to, or `null` for "All dishes" — a real
   * state rather than "nothing chosen yet". It is cleared when the week moves,
   * because a dish is a fact about *this* week's plan and next week almost
   * certainly doesn't hold it; leaving it set would show an empty list under a
   * chip that isn't in the row any more.
   */
  const [dish, setDish] = useState<string | null>(null)
  useEffect(() => {
    setDish(null)
  }, [weekStartKey])

  const [composerOpen, setComposerOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftAmount, setDraftAmount] = useState('')
  const [draftUnit, setDraftUnit] = useState('')
  const nameInput = useRef<RNTextInput>(null)

  useFocusEffect(
    useCallback(() => {
      if (!token) return
      let cancelled = false
      setError(null)
      getGroceryList(weekStartKey, weekEndKey, token)
        .then((data) => {
          if (cancelled) return
          // The same bail-out every refocus refetch in this app uses: a screen
          // regains focus while its transition is still running, and an
          // unconditional setState rebuilds the list on the frames the
          // animation needs.
          setList((prev) => (JSON.stringify(prev) === JSON.stringify(data) ? prev : data))
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
    }, [token, weekStartKey, weekEndKey])
  )

  // Memoised rather than derived inline: `list?.lines ?? []` builds a fresh
  // array on every render when `list` is null, which would make every useMemo
  // downstream of it recompute forever.
  const lines = useMemo(() => list?.lines ?? [], [list])
  const items = useMemo(() => list?.items ?? [], [list])
  const dishes = useMemo(() => list?.dishes ?? [], [list])

  /**
   * And dropped if the plan stops holding it. The list refetches on focus, so
   * unplanning the dinner you were filtering by is an ordinary path back from
   * the planner — and it would otherwise leave the screen empty, with the
   * explanation ("this dish") no longer in the row to point at.
   */
  useEffect(() => {
    if (dish && list && !dishes.some((d) => d.id === dish)) setDish(null)
  }, [dish, list, dishes])

  const total = lines.length + items.length
  const gathered =
    lines.filter((l) => l.ticked).length + items.filter((i) => i.ticked).length
  /** Week-wide, always: the dot on the tab is drawn outside this screen and
   *  knows nothing about which chip is pressed here. */
  const outstanding = total - gathered

  // Published for the dot on the Grocery tab, which is drawn by the dock and so
  // sits outside this screen entirely.
  useEffect(() => {
    setGroceryOutstanding(outstanding)
  }, [outstanding])

  /**
   * "Today" narrows to the day in view, and falls back to the week's first day
   * when the week on screen doesn't contain today — which it won't whenever you
   * are planning ahead, i.e. most of the time you are looking at this screen.
   */
  const days = useMemo(() => weekDays(weekStart), [weekStart])
  const focusDay = useMemo(
    () => days.find((d) => isSameDay(d, new Date())) ?? days[0],
    [days]
  )
  const dayLabel = useMemo(
    () =>
      isSameDay(focusDay, new Date())
        ? t('grocery.scopeDay')
        : n(`${focusDay.getDate()}/${focusDay.getMonth() + 1}`),
    [focusDay, t, n]
  )
  /**
   * The same fallback for the week tab. The planner can be showing any week and
   * this list follows it, so a tab reading `THIS WEEK` over next week's rows
   * would be a plain lie — it names the range instead whenever today isn't in
   * the seven days on screen.
   */
  const weekTabLabel = useMemo(
    () =>
      days.some((d) => isSameDay(d, new Date()))
        ? t('grocery.scopeWeek')
        : n(
            `${days[0].getDate()}/${days[0].getMonth() + 1} – ${days[6].getDate()}/${days[6].getMonth() + 1}`
          ),
    [days, t, n]
  )
  // The date a `LinePart` files a day's share under. Built by `toDateKey`, which
  // works in local time — `toISOString().slice(0, 10)` would convert to UTC
  // first and hand back tomorrow's key after 5pm in Phnom Penh, quietly
  // narrowing the list to a day that isn't on screen.
  const focusKey = useMemo(() => toDateKey(focusDay), [focusDay])

  /**
   * The two lenses over the list as one value, because they compose: "what do I
   * still need for the amok, today" is an ordinary question and each half alone
   * answers a different one. Both are read off a line's `parts`, which is why
   * the server sends the pieces rather than a total per day and a total per
   * dish — see `LinePart`.
   */
  const lens = useMemo<Lens>(
    () => ({ date: scope === 'day' ? focusKey : null, recipeId: dish }),
    [scope, focusKey, dish]
  )
  /**
   * Narrowed, the row goes read-only, and this is the rule rather than a
   * limitation of the day chip. A correction is stored against the **week** —
   * `(userId, weekStart, key)` is the whole address — so a + pressed under a
   * "Today" heading, or under one dish's chip, would silently rewrite the
   * week's total, and the share on screen is not the number it would rewrite.
   * Reading a slice is a lens; editing one would need a data model that doesn't
   * exist.
   */
  const narrowed = isNarrowed(lens)

  /**
   * What the bar measures: the week, or the dish if one is chosen.
   *
   * **Not what is on screen.** Under "Missing only" every visible row is by
   * definition un-ticked, so a bar counting the visible rows would read 0% at
   * the exact moment you had nearly finished. The bar answers "how far through
   * the shop am I", which is a question about the list rather than about the
   * tab — and a day is a lens on the week's shop, not a shop of its own. A dish
   * is different: choosing one says the amok is what you are buying for, and
   * leaving the bar on the week would report progress against a list you can't
   * see.
   */
  const scored = useMemo(() => {
    const relevant = dish ? lines.filter((l) => contributes(l.parts, { recipeId: dish })) : lines
    // Manual items are in every lens for the same reason they survive both
    // filters: they belong to the week's shop rather than to any dish.
    const all = relevant.length + items.length
    const done =
      relevant.filter((l) => l.ticked).length + items.filter((i) => i.ticked).length
    return { total: all, gathered: done }
  }, [lines, items, dish])

  /**
   * Every line the scope tab and the two lenses leave on screen, ticked or not —
   * the list before it is split in two.
   *
   * "Today" keeps the lines the focused day actually asked for, and a dish chip
   * keeps the lines that dish asked for. `parts` only carries meals that
   * contributed, so presence *is* the filter — and it has to come from the
   * server, because a week's total can't be taken back apart once it has been
   * summed. The day chip did nothing at all before that field existed: there
   * was nothing on a line to narrow it by.
   */
  const visibleLines = useMemo(
    () =>
      lines.filter((l) => {
        if (scope === 'missing' && l.ticked) return false
        return contributes(l.parts, lens)
      }),
    [lines, scope, lens]
  )

  /**
   * Neither lens touches these. A manual item carries no date and no dish —
   * it's something you thought of for the week's shop, not for a meal — so
   * there is nothing to match it against, and hiding the only rows you typed
   * yourself would make the + look like it had failed.
   */
  const visibleItems = useMemo(
    () => (scope === 'missing' ? items.filter((i) => !i.ticked) : items),
    [items, scope]
  )

  /**
   * The page in order: what you added, then the aisles, then everything already
   * in the basket.
   *
   * **Ticked rows leave their aisle entirely rather than sinking inside it.**
   * Sinking within a section would still leave a run of struck-through rows
   * above a run of live ones the moment you finished an aisle, which is the
   * thing this is meant to stop; one section at the foot is the only
   * arrangement in which the top of the page is *only* what is still to buy.
   *
   * `Gathered` mirrors the order above it — your own items first, then the
   * aisles — so a row's place down there is stable and doesn't depend on the
   * order you happened to tick things in, which nothing stores anyway.
   *
   * Under "Missing only" a ticked line is already gone, so the section simply
   * never appears; the tab and this are the same idea at two strengths.
   */
  const sections = useMemo<Section[]>(() => {
    const out: Section[] = []
    const pendingItems = visibleItems.filter((i) => !i.ticked)
    if (pendingItems.length > 0) {
      out.push({
        id: 'added',
        label: { key: 'grocery.addedByYou' },
        rows: pendingItems.map((item) => ({ kind: 'item', item })),
      })
    }
    for (const group of byAisle(visibleLines.filter((l) => !l.ticked))) {
      out.push({
        id: `aisle:${group.aisle}`,
        label: { aisle: group.aisle },
        rows: group.lines.map((line) => ({ kind: 'line', line })),
      })
    }
    const gathered: Row[] = [
      ...visibleItems.filter((i) => i.ticked).map((item): Row => ({ kind: 'item', item })),
      ...byAisle(visibleLines.filter((l) => l.ticked)).flatMap((group) =>
        group.lines.map((line): Row => ({ kind: 'line', line }))
      ),
    ]
    if (gathered.length > 0) {
      out.push({ id: 'gathered', label: { key: 'grocery.gathered' }, rows: gathered })
    }
    return out
  }, [visibleLines, visibleItems])

  /** Optimistic, and rolled back on failure — the tick has to land under your finger. */
  async function toggleLine(line: GroceryLine) {
    if (!token || !list) return
    const next = !line.ticked
    favouriteFeedback()
    const previous = list
    setList({
      ...list,
      lines: list.lines.map((l) => (l.key === line.key ? { ...l, ticked: next } : l)),
    })
    try {
      await setGroceryLine(weekStartKey, line.key, { ticked: next }, token)
    } catch {
      setList(previous)
      // A specific key rather than the generic one: when a row snaps back, which
      // action failed is the useful thing to say.
      setError('error.saveGrocery')
    }
  }

  async function stepLine(line: GroceryLine, direction: 1 | -1) {
    if (!token || !list) return
    if (direction === -1 && atFloor(line.amount, line.unit)) return
    const next =
      direction === 1 ? increment(line.amount, line.unit) : decrement(line.amount, line.unit)
    selectionFeedback()
    const previous = list
    setList({
      ...list,
      lines: list.lines.map((l) =>
        l.key === line.key ? { ...l, amount: next, amountOverride: next } : l
      ),
    })
    try {
      await setGroceryLine(weekStartKey, line.key, { amountOverride: next }, token)
    } catch {
      setList(previous)
      setError('error.saveGrocery')
    }
  }

  /** Clears a hand-typed correction, so the line reports the plan's sum again. */
  async function resetLine(line: GroceryLine) {
    if (!token || !list || line.amountOverride === null) return
    selectionFeedback()
    const previous = list
    setList({
      ...list,
      lines: list.lines.map((l) =>
        l.key === line.key ? { ...l, amount: l.planAmount, amountOverride: null } : l
      ),
    })
    try {
      await setGroceryLine(weekStartKey, line.key, { amountOverride: null }, token)
    } catch {
      setList(previous)
      setError('error.saveGrocery')
    }
  }

  async function toggleItem(item: GroceryItem) {
    if (!token || !list) return
    const next = !item.ticked
    favouriteFeedback()
    const previous = list
    setList({
      ...list,
      items: list.items.map((i) => (i.id === item.id ? { ...i, ticked: next } : i)),
    })
    try {
      await updateGroceryItem(item.id, { ticked: next }, token)
    } catch {
      setList(previous)
      setError('error.saveGrocery')
    }
  }

  async function stepItem(item: GroceryItem, direction: 1 | -1) {
    if (!token || !list) return
    if (direction === -1 && atFloor(item.amount, item.unit)) return
    const next =
      direction === 1 ? increment(item.amount, item.unit) : decrement(item.amount, item.unit)
    selectionFeedback()
    const previous = list
    setList({
      ...list,
      items: list.items.map((i) => (i.id === item.id ? { ...i, amount: next } : i)),
    })
    try {
      await updateGroceryItem(item.id, { amount: next }, token)
    } catch {
      setList(previous)
      setError('error.saveGrocery')
    }
  }

  async function removeItem(item: GroceryItem) {
    if (!token || !list) return
    const previous = list
    setList({ ...list, items: list.items.filter((i) => i.id !== item.id) })
    try {
      await removeGroceryItem(item.id, token)
    } catch {
      setList(previous)
      setError('error.clearGrocery')
    }
  }

  /**
   * Hands the week's list to the OS share sheet as plain text.
   *
   * Text rather than a link or a file: the list is derived and has no URL of
   * its own, and the person receiving it is standing in a shop. Ticked lines are
   * left in — someone sharing a half-done list is dividing it up, not handing
   * over what's left — and the aisle headers survive so the message reads the
   * way the screen does.
   *
   * `Share` is one of the few react-native APIs that does exist on web, via the
   * Web Share API, and it rejects rather than throwing when the user dismisses
   * it — which is not an error worth surfacing.
   */
  async function shareList() {
    if (!list) return
    const lines: string[] = []
    // Built from `visibleLines` rather than from `sections`, because a shared
    // list keeps its ticked rows in the aisle they belong to: someone sharing a
    // half-done list is dividing it up, not handing over what is left, and a
    // GATHERED heading in a message is the sender's business rather than the
    // reader's.
    for (const group of byAisle(visibleLines)) {
      lines.push(aisleLabel(group.aisle).toUpperCase())
      for (const line of group.lines) {
        lines.push(
          `  ${line.ticked ? '✓' : '·'} ${line.name} — ${n(formatAmount(line.amount, line.unit, language))}`
        )
      }
    }
    if (lines.length === 0) return
    await Share.share({ message: lines.join('\n') }).catch(() => {})
  }

  /**
   * The composer stays open after a submit, so several things can be added in a
   * row without reaching for the + again — which is how anyone actually writes
   * a shopping list.
   */
  async function submitDraft() {
    if (!token || !list) return
    const name = draftName.trim()
    if (!name) return
    // Blank means "one of them", which is the honest default for a list you're
    // writing while walking. `parseNumeric` folds Khmer digits first — typing
    // ២ here used to add a single item silently.
    const amount = parseNumeric(draftAmount) ?? 1
    const unit = draftUnit.trim()

    setDraftName('')
    setDraftAmount('')
    setDraftUnit('')
    nameInput.current?.focus()

    try {
      const created = await addGroceryItem(weekStartKey, { name, amount, unit }, token)
      setList((prev) => (prev ? { ...prev, items: [...prev.items, created] } : prev))
    } catch (err) {
      setError(apiErrorKey(err))
    }
  }

  /**
   * Four empty states, and they are four because they are four different facts:
   * nothing is planned at all, everything on this list is gathered, this dish
   * has nothing here, this day has nothing here. "Nothing to buy yet" under a
   * full week would be false, and "Everything gathered" is a congratulation
   * nobody earned by pressing a chip.
   *
   * Most specific wins, and the order below *is* the specificity: an empty book
   * first, then the tick state, then whichever lens is doing the hiding.
   */
  const nothingHere = sections.length === 0
  const empty = total === 0
  const nothingMissing = !empty && scope === 'missing' && nothingHere
  const nothingForDish = !empty && !nothingMissing && nothingHere && dish !== null
  const nothingToday = !empty && !nothingMissing && !nothingForDish && nothingHere && scope === 'day'

  return (
    <View style={styles.container}>
      <ScrollView
        scrollEventThrottle={16}
        // The inset pads the *content*, not the scroller: padding the scroller
        // is what cut the list off against a hard line under the status bar
        // instead of letting it pass beneath. `styles.content` already carries
        // `spacing.lg` all round, so this adds to it rather than replacing it.
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad, paddingBottom: spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Masthead
          title={t('market.masthead')}
          actions={
            <>
              <MastheadAction accessibilityLabel={t('market.share')} onPress={shareList}>
                {/* Geometry scaled to the 44pt ring, hairline held at 1.2 so the
                    mark and the ring around it are the same weight. */}
                <ShareIcon color={c.text} scale={mastheadGlyphScale} stroke={1.2} />
              </MastheadAction>
              <MastheadAction
                accessibilityLabel={t('tabs.addIngredient')}
                onPress={() => {
                  // Opening and focusing together. Pressing + while it is
                  // already open refocuses the field rather than doing nothing,
                  // which is what the retired counter-store used to buy.
                  setComposerOpen(true)
                  nameInput.current?.focus()
                }}
              >
                <View style={styles.plusH} />
                <View style={styles.plusV} />
              </MastheadAction>
              <ProfileButton />
            </>
          }
        />

        {/* SCREENS.md § 14's filter tabs, not chips: three tracked labels in a
            row, the selected one tamarind over a 2px rule. The standalone week
            label that used to sit above them is gone — it printed `THIS WEEK`
            directly over a chip reading the same words. Its other job, naming
            the range when the week on screen isn't the current one, moved into
            the first tab's own label, exactly as `dayLabel` already does. */}
        <View style={styles.tabs}>
          <FilterTab
            label={weekTabLabel}
            active={scope === 'week'}
            onPress={() => setScope('week')}
          />
          <FilterTab label={dayLabel} active={scope === 'day'} onPress={() => setScope('day')} />
          <FilterTab
            label={t('grocery.scopeMissing')}
            active={scope === 'missing'}
            onPress={() => setScope('missing')}
          />
        </View>

        {/* The dish chips, under the scope tabs and above the progress bar,
            where the mockup draws them.

            **Drawn from one dish up, not two.** The first version hid the row
            below two, on the reasoning that "All dishes" beside a single chip
            is two controls producing one list. True, and beside the point: the
            row is also what *says* the list can be filtered by dish, and a
            control that appears only once your week is busy enough is a feature
            nobody discovers. A week with one dinner in it is the ordinary case,
            not a degenerate one. Nothing planned at all is still nothing to
            filter — and that screen is the empty state anyway. */}
        {dishes.length > 0 && <DishFilter dishes={dishes} selected={dish} onSelect={setDish} />}

        {/* The count came back. It was dropped as noise when the bar was the
            only indicator; Chronicle asks for both, and they are not redundant —
            the bar is a glance and the count is the number you check against
            what's in the basket. The percentage on the right is the one figure
            on the screen worth colouring.

            The track is `surfaceSunken`, not the `--ink-800` the design kit
            renders. A near-black bar on a light surface reads as a *filled* bar
            at zero rather than as an empty track, and every other recessed
            track in this app is `surfaceSunken`. The handoff's §7.7 names this
            as the correction if the kit turns out to be a typo; it plainly is.

            The width is a CSS percentage, so it must **not** go through `n` —
            a Khmer digit in a style value is not a translation, it is a broken
            layout. Only text a person reads is converted. */}
        {scored.total > 0 && (
          <View style={styles.progress}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>
                {n(scored.gathered)} / {n(scored.total)} {t('market.gathered')}
              </Text>
              <Text style={styles.progressPercent}>
                {n(Math.round((scored.gathered / scored.total) * 100))}%
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.round((scored.gathered / scored.total) * 100)}%` },
                ]}
              />
            </View>
          </View>
        )}

        {error && <Text style={styles.error}>{t(error)}</Text>}

        {composerOpen && (
          <View style={styles.composer}>
            <TextInput
              ref={nameInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder={t('grocery.composerName')}
              placeholderTextColor={c.textPlaceholder}
              keyboardAppearance="light"
              style={[styles.composerInput, styles.composerName]}
              returnKeyType="done"
              onSubmitEditing={submitDraft}
            />
            <TextInput
              value={draftAmount}
              onChangeText={setDraftAmount}
              placeholder={t('grocery.composerAmount')}
              placeholderTextColor={c.textPlaceholder}
              keyboardAppearance="light"
              keyboardType="numeric"
              style={[styles.composerInput, styles.composerAmount]}
            />
            <TextInput
              value={draftUnit}
              onChangeText={setDraftUnit}
              placeholder={t('grocery.composerUnit')}
              placeholderTextColor={c.textPlaceholder}
              keyboardAppearance="light"
              style={[styles.composerInput, styles.composerUnit]}
            />
            <Pressable
              onPress={submitDraft}
              accessibilityRole="button"
              accessibilityLabel={t('grocery.composerAdd')}
              style={({ pressed }) => [styles.composerAdd, pressed && styles.pressed]}
            >
              <Ionicons name="arrow-up" size={18} color={c.onPrimary} />
            </Pressable>
            <Pressable
              onPress={() => setComposerOpen(false)}
              accessibilityRole="button"
              accessibilityLabel={t('grocery.composerClose')}
              style={({ pressed }) => [styles.composerClose, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={18} color={c.textMuted} />
            </Pressable>
          </View>
        )}

        {loading ? (
          <View style={styles.groups}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.group}>
                <Skeleton pulse={pulse} style={styles.headingSkeleton} />
                <Skeleton pulse={pulse} style={styles.rowSkeleton} />
                <Skeleton pulse={pulse} style={styles.rowSkeleton} />
              </View>
            ))}
          </View>
        ) : empty || nothingMissing || nothingForDish || nothingToday ? (
          <View style={styles.empty}>
            {/* SCREENS.md § 21's ghost: two stacked short rules, 78 and 52.
                A list has no numeral to ghost the way an empty book has its
                `០`, and an icon would be the only pictogram in the product. */}
            <View style={styles.ghostLong} />
            <View style={styles.ghostShort} />
            <Text style={styles.emptyTitle}>
              {t(
                nothingMissing
                  ? 'grocery.emptyMissingTitle'
                  : nothingForDish
                    ? 'grocery.emptyDishTitle'
                    : nothingToday
                      ? 'grocery.emptyDayTitle'
                      : 'grocery.emptyTitle'
              )}
            </Text>
            <Text style={styles.emptyBody}>
              {t(
                nothingMissing
                  ? 'grocery.emptyMissingBody'
                  : nothingForDish
                    ? 'grocery.emptyDishBody'
                    : nothingToday
                      ? 'grocery.emptyDayBody'
                      : 'grocery.emptyBody'
              )}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sections.map((section, sectionIndex) => (
              // A Fragment, not a View: Fragments create no host node, so every
              // header and every row is a direct child of the one flat parent —
              // which is what lets a row ticked in Produce travel down to
              // `Gathered` instead of unmounting on one side and mounting on
              // the other. See `styles.list`.
              <Fragment key={section.id}>
                {/* These sections used to stagger in, aisle by aisle. Chronicle
                    has no entrance animation anywhere — the list is simply
                    there, the way a printed page is. The only thing that moves
                    now is a row changing place, which is information rather
                    than decoration.

                    The panel is gone too. Chronicle defines a section by a
                    ruled header and a run of hairlines, never by a filled card
                    — the rules *are* the edges, and a tinted panel under them
                    would be a second, competing way of saying the same thing. */}
                <Animated.View
                  layout={rowTransition}
                  style={sectionIndex > 0 && styles.sectionSpaced}
                >
                  <SectionHeader
                    label={'aisle' in section.label ? aisleLabel(section.label.aisle) : t(section.label.key)}
                    count={n(section.rows.length)}
                  />
                </Animated.View>

                {section.rows.map((row, index) => {
                  const last = index === section.rows.length - 1
                  return row.kind === 'item' ? (
                    <Animated.View key={`item:${row.item.id}`} layout={rowTransition}>
                      <LedgerRow
                        emoji={emojiForIngredient(row.item.name)}
                        title={row.item.name}
                        ingredient
                        checked={row.item.ticked}
                        onToggle={() => toggleItem(row.item)}
                        last={last}
                        trailing={
                          <Stepper
                            amount={row.item.amount}
                            unit={row.item.unit}
                            name={row.item.name}
                            onStep={(d) => stepItem(row.item, d)}
                            onRemove={() => removeItem(row.item)}
                          />
                        }
                      />
                    </Animated.View>
                  ) : (
                    <Animated.View key={`line:${row.line.key}`} layout={rowTransition}>
                      <LedgerRow
                        emoji={emojiForIngredient(row.line.name)}
                        title={row.line.name}
                        ingredient
                        checked={row.line.ticked}
                        onToggle={() => toggleLine(row.line)}
                        last={last}
                        trailing={
                          // Narrowed to a day or to a dish, the number is that
                          // slice's share and the row goes read-only — see
                          // `narrowed` above for why the buttons cannot be left
                          // on. An override is only ever the *week's* number, so
                          // it is deliberately not consulted here: a hand-typed
                          // week total says nothing about what Tuesday's share
                          // of it should be.
                          <Stepper
                            amount={narrowed ? shareOf(row.line.parts, lens) : row.line.amount}
                            unit={row.line.unit}
                            name={row.line.name}
                            readOnly={narrowed}
                            overridden={row.line.amountOverride !== null}
                            onStep={(d) => stepLine(row.line, d)}
                            onReset={() => resetLine(row.line)}
                          />
                        }
                      />
                    </Animated.View>
                  )
                })}
              </Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {/* After the scroller, so it floats over it. */}
    </View>
  )
}

/**
 * One filter tab — a tracked label over a 2px rule when it is the live one.
 *
 * **Not a `Chip`.** A chip is a filled pill with a hairline, and three of them
 * in a row under the masthead read as three buttons competing with the rule
 * above; the design draws these as running heads instead, which is why the
 * selected one is marked by a rule rather than by a fill.
 *
 * The rule is drawn in both states and only its colour changes, so selecting a
 * tab can't shift the row by 2px — the same trick `DayStrip`'s underline uses.
 * `hitSlop` carries a 15pt-tall label out to the 44pt floor without letting the
 * targets of two tabs 20pt apart overlap.
 */
function FilterTab({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
      style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && styles.pressed]}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * The −/+ pair and the amount between them.
 *
 * The two buttons keep their 44pt touch area but inset it with a negative
 * margin, so the ingredient name keeps its width — **symmetrically on both**,
 * since an asymmetric inset paints the + circle over the end of the quantity.
 * Vertically the same trick runs through `hitSlop` rather than a margin: the
 * drawn button is short enough to sit inside the design's 38pt row, and the
 * slop puts the missing points back where they cost no layout. A 44pt-tall
 * button would have set the row's height on its own and quietly undone the
 * tightening `LedgerRow`'s ingredient variant exists for.
 *
 * The floor is one step, not zero: the − goes disabled rather than letting you
 * zero a row, because zeroing an item is not how you remove it and a row you
 * can lose by tapping twice is a row you will lose in a shop.
 */
function Stepper({
  amount,
  unit,
  name,
  overridden = false,
  readOnly = false,
  onStep,
  onReset,
  onRemove,
}: {
  amount: number
  unit: string
  name: string
  overridden?: boolean
  /** The amount is a slice of something the buttons can't write to — see the
   *  "Today" scope. Renders the number alone rather than a disabled pair of
   *  circles, which would read as broken rather than as not-applicable. */
  readOnly?: boolean
  onStep: (direction: 1 | -1) => void
  onReset?: () => void
  onRemove?: () => void
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  // A derived line's unit is app-generated text — this list is summed across
  // recipes rather than typed — so it reads in the interface's language. The
  // ingredient rows on a recipe page are the opposite case and stay verbatim.
  const { language } = useLanguage()
  const floored = atFloor(amount, unit)

  if (readOnly) {
    return (
      <View style={styles.stepper}>
        <Text style={styles.amount} numberOfLines={1}>
          {n(formatAmount(amount, unit, language))}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.stepper}>
      <Pressable
        onPress={() => (floored ? onRemove?.() : onStep(-1))}
        disabled={floored && !onRemove}
        accessibilityRole="button"
        accessibilityLabel={t(floored && onRemove ? 'grocery.remove' : 'grocery.less').replace(
          '{name}',
          name
        )}
        hitSlop={STEP_SLOP}
        style={({ pressed }) => [
          styles.stepButton,
          floored && !onRemove && styles.stepDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons
          name={floored && onRemove ? 'trash-outline' : 'remove'}
          size={16}
          color={c.text}
        />
      </Pressable>

      <Pressable
        onPress={onReset}
        disabled={!overridden}
        accessibilityRole={overridden ? 'button' : undefined}
        accessibilityLabel={overridden ? t('grocery.resetAmount') : undefined}
        style={styles.amountWrap}
      >
        {/* An edited amount is marked, so the number can be told apart from the
            one the plan worked out. Tapping it puts the plan's sum back. */}
        <Text style={[styles.amount, overridden && styles.amountEdited]} numberOfLines={1}>
          {n(formatAmount(amount, unit, language))}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => onStep(1)}
        accessibilityRole="button"
        accessibilityLabel={t('grocery.more').replace('{name}', name)}
        hitSlop={STEP_SLOP}
        style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={16} color={c.text} />
      </Pressable>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  /**
   * **No `paddingHorizontal` here**, and that is the fix rather than an
   * omission. `Masthead` applies `spacing.gutter` itself, so padding the scroll
   * content too inset the header by 48pt: the wordmark sat a gutter in from
   * every other screen's, its `flex: 1` title had a gutter less room so it
   * truncated sooner, and — most visibly — its 1.5px rule stopped short of the
   * page on both sides while the rules under it ran full width. Every child
   * carries its own gutter instead, which is what the dashboard and the planner
   * already do.
   */
  content: { gap: spacing.sectionSpacing },

  // 20pt apart and 12 below the masthead rule, per the mockup. `sectionSpacing`
  // would put them where a section goes; these belong to the rule above them.
  tabs: {
    flexDirection: 'row',
    gap: spacing.xl - spacing.xs,
    paddingHorizontal: spacing.gutter,
    marginTop: -spacing.sm,
  },
  // The rule is drawn in both states so selecting one can't move the row.
  tab: { paddingBottom: spacing.xs, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: c.primary },
  tabLabel: { ...type.filterTab, color: c.textMuted, textTransform: 'uppercase' },
  tabLabelActive: { color: c.primary },

  // Same rule as the share glyph: the arms grow with the ring, the 1.2 stroke
  // does not, so every mark on this header is one hairline weight.
  plusH: { position: 'absolute', width: 11 * mastheadGlyphScale, height: 1.2, backgroundColor: c.text },
  plusV: { position: 'absolute', width: 1.2, height: 11 * mastheadGlyphScale, backgroundColor: c.text },

  progress: { gap: spacing.sm, paddingHorizontal: spacing.gutter },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { ...type.body, color: c.text },
  progressPercent: { ...type.metadata, color: c.primary },
  track: {
    // 4, per the design. The old 6 was from a system with heavier chrome
    // throughout; beside 1px rules it read as a slab.
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSunken,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: c.primary },

  error: { ...type.body, color: c.danger, paddingHorizontal: spacing.gutter },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: c.surfaceAlt,
    // A margin, not padding: this block has a fill, so the gutter has to move
    // the panel rather than inset its contents inside a full-bleed one.
    marginHorizontal: spacing.gutter,
  },
  composerInput: {
    minHeight: minHeights.search,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: c.surface,
    // One line, so the token's line box comes off — see `inputType`.
    ...inputType(type.bodyLarge),
    color: c.text,
  },
  // Only the name flexes; the two numbers hold fixed widths so the row can
  // never wrap onto a second line, the same rule the ingredient row follows.
  composerName: { flex: 1, minWidth: 0 },
  composerAmount: { width: 64, textAlign: 'center' },
  composerUnit: { width: 64, textAlign: 'center' },
  composerAdd: {
    width: sizes.circleButton,
    height: sizes.circleButton,
    borderRadius: radius.pill,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerClose: {
    width: sizes.circleButton,
    height: sizes.circleButton,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // The skeleton's shape, and now only the skeleton's: while the list is
  // loading there is nothing to reorder, so those three placeholder sections
  // stay ordinary nested Views.
  groups: { gap: spacing.sectionSpacing },
  group: { paddingHorizontal: spacing.gutter },

  /**
   * The real list is **one flat parent** — every header and every row a direct
   * child — rather than a View per section.
   *
   * That is what makes the sink legible. Reanimated animates a child moving
   * *within* its parent; a row that changed parents on its way to `Gathered`
   * would unmount from its aisle and mount again at the foot, and the only
   * honest animation for that is a fade out and a fade in — which says the row
   * was destroyed and another one made, not that this one moved.
   *
   * The cost is that section spacing can't ride on a container's `gap` any
   * more, since a gap would then fall between every row. It rides on the
   * headers instead (`sectionSpaced`), which is where the air belongs anyway —
   * see `SectionHeader` on why a header and its first row are one unit.
   */
  list: { paddingHorizontal: spacing.gutter },
  sectionSpaced: { marginTop: spacing.sectionSpacing },

  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepButton: {
    width: sizes.hitMin,
    // Short enough to fit the design's 38pt ingredient row; `STEP_SLOP` carries
    // the touch target back out to 44 without the row growing to match.
    height: STEP_BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
    // Symmetric on both buttons. The touch area stays 44pt while the drawn gap
    // closes up, so the ingredient name keeps its width — and an asymmetric
    // inset would paint the + circle over the end of the quantity.
    marginHorizontal: -6,
  },
  stepDisabled: { opacity: 0.5 },
  amountWrap: { minWidth: 68, alignItems: 'center' },
  // Mono 12, the mockup's own `400 12px/1 'IBM Plex Mono'` — not `bodyStrong`,
  // which set a quantity in the medium serif at 15 and made every line of the
  // list read as heavily as its heading. In Khmer the scale swaps in Kantumruy,
  // since IBM Plex Mono has no Khmer glyphs to set `១ កណ្ដាប់` with.
  amount: { ...type.metadata, color: c.textMuted },
  amountEdited: { color: c.text },

  pressed: { opacity: 0.7 },

  headingSkeleton: { height: 12, width: 96, borderRadius: 4, marginBottom: spacing.sectionGap },
  // Copies the ingredient row's own metrics — `rowYTight` above and below a
  // 20pt line box — so the real rows land where the placeholders were.
  rowSkeleton: { height: 20, borderRadius: 4, marginVertical: spacing.rowYTight },

  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.gutter,
  },
  // Two stacked rules at the design's own 78 and 52, standing in for a glyph.
  ghostLong: { width: 78, height: 1.5, backgroundColor: c.borderStrong },
  ghostShort: { width: 52, height: 1.5, backgroundColor: c.borderStrong, marginBottom: spacing.sm },
  emptyTitle: { ...type.emptyTitle, color: c.text, textAlign: 'center' },
  emptyBody: { ...type.bodyRead, color: c.textMuted, textAlign: 'center', maxWidth: 280 },

})
