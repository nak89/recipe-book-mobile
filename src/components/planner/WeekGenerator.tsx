import type Animated from 'react-native-reanimated'
import type { AnimatedRef, SharedValue } from 'react-native-reanimated'
import DinnerDragList from './DinnerDragList'
import ActionSheet from '@/components/ui/ActionSheet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Chip from '@/components/ui/Chip'
import LedgerRow from '@/components/ui/LedgerRow'
import SectionHeader from '@/components/ui/SectionHeader'
import { ApiError, applyDinnerWeek, getPlan, getRecipes } from '@/lib/api'
import { dinnerAlternatives, generateDinners, swapDinner, moveDinnerBetweenDays, reshuffleDinners } from '@/lib/dinnerDraft'
import type { DinnerEntry, DinnerOptions } from '@/lib/dinnerDraft'
import { addDays, fromDateKey, toDateKey } from '@/lib/week'
import { apiErrorKey } from '@/i18n/errors'
import { useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { useDayLabel } from '@/i18n/labels'
import { sizes, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { PlanSlot, Recipe } from '@/types/recipe'

type Preview = { recipes: Recipe[]; plan: PlanSlot[]; entries: DinnerEntry[] }

/** Keyed by account/week in the planner; a late response cannot update another week. */
export default function WeekGenerator({ from, to, token, onApplied, scrollRef, contentHeight, onDragChange }: {
  from: string; to: string; token: string; onApplied: (slots: PlanSlot[]) => void
  scrollRef: AnimatedRef<Animated.ScrollView>; contentHeight: SharedValue<number>; onDragChange: (dragging: boolean) => void
}) {
  const t = useT(), n = useNum(), dayLabel = useDayLabel()
  const styles = useThemedStyles(makeStyles)
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => toDateKey(addDays(fromDateKey(from), i))), [from])
  const [preview, setPreview] = useState<Preview | null>(null)
  const [options, setOptions] = useState<DinnerOptions>({ includeUntagged: false, allowRepeats: false })
  const [movingDate, setMovingDate] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragChanged = useCallback((value: boolean) => { setDragging(value); onDragChange(value) }, [onDragChange])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [applied, setApplied] = useState(false)
  const [error, setError] = useState<StringKey | null>(null)
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])

  async function loadPreview() {
    if (busy.current) return
    busy.current = true; setLoading(true); setError(null); setApplied(false)
    try {
      const [recipes, plan] = await Promise.all([getRecipes(token), getPlan(from, to, token)])
      if (mounted.current) setPreview({ recipes, plan, entries: generateDinners(dates, recipes, plan, options) })
    } catch (err) { if (mounted.current) setError(apiErrorKey(err)) }
    finally { busy.current = false; if (mounted.current) setLoading(false) }
  }

  function regenerate(next = options) {
    if (!preview || busy.current || dragging) return
    setOptions(next)
    setPreview({ ...preview, entries: reshuffleDinners(preview.entries, preview.recipes, next) })
    setError(null)
  }

  async function apply() {
    if (!preview || busy.current || dragging || preview.entries.some(entry => !entry.recipeId)) return
    const entries = preview.entries.filter(entry => entry.recipeId && entry.recipeId !== entry.originalRecipeId).map(entry => ({ date: entry.date, recipeId: entry.recipeId!, expectedRecipeId: entry.originalRecipeId }))
    if (!entries.length) return
    busy.current = true; setSaving(true); setError(null)
    try {
      const saved = await applyDinnerWeek(from, entries, token)
      if (mounted.current) { onApplied(saved); setPreview(null); setApplied(true) }
    } catch (err) {
      if (mounted.current) setError(err instanceof ApiError && err.status === 409 ? 'generate.changed' : apiErrorKey(err))
    } finally { busy.current = false; if (mounted.current) setSaving(false) }
  }

  const missing = preview?.entries.filter(entry => !entry.recipeId).length ?? 0
  const additions = preview?.entries.filter(entry => !entry.kept).length ?? 0
  return (
    <View style={styles.section}>
      {!preview ? <>
        <PrimaryButton label={t('generate.open')} variant="outline" loading={loading} onPress={loadPreview} />
        {applied && <Text accessibilityLiveRegion="polite" style={styles.body}>{t('generate.applied')}</Text>}
      </> : <>
        <SectionHeader variant="recipe" label={t('generate.title')} />
        <Text style={styles.body}>{t('generate.description')}</Text>
        <View style={styles.options}>
          <Chip style={styles.optionChip} label={t('generate.untagged')} active={options.includeUntagged} onPress={() => regenerate({ ...options, includeUntagged: !options.includeUntagged })} />
          <Chip style={styles.optionChip} label={t('generate.repeats')} active={options.allowRepeats} onPress={() => regenerate({ ...options, allowRepeats: !options.allowRepeats })} />
        </View>
        {additions === 0 && <Text style={styles.body}>{t('generate.full')}</Text>}
        {missing > 0 && <Text accessibilityLiveRegion="polite" style={styles.body}>{t('generate.shortage').replace('{n}', n(missing))}</Text>}
        <Text style={styles.body}>{t('generate.dragHint')}</Text>
        <DinnerDragList entries={preview.entries} disabled={saving || loading} scrollRef={scrollRef} contentHeight={contentHeight}
          onDragChange={dragChanged}
          onMove={(from, to) => setPreview({ ...preview, entries: moveDinnerBetweenDays(from, to, preview.entries) })}
          renderHeader={entry => {
            const date = fromDateKey(entry.date)
            return <SectionHeader label={`${dayLabel(date)} · ${n(date.getDate())}/${n(date.getMonth() + 1)}`} />
          }} renderDish={entry => {
            const date = fromDateKey(entry.date)
            const recipe = preview.recipes.find(recipe => recipe.id === entry.recipeId) ?? preview.plan.find(slot => slot.recipeId === entry.recipeId)?.recipe
            const swappable = dinnerAlternatives(entry, preview.entries, preview.recipes, options).length > 0
            return <View style={styles.previewRow}>
              <LedgerRow style={styles.dish} last title={recipe?.title ?? t('generate.noChoice')} photoUrl={recipe?.photoUrl}
                value={entry.kept ? t('generate.kept') : entry.manual ? t('generate.moved') : undefined} />
              <View>
                {!!entry.recipeId && <Pressable accessibilityRole="button" accessibilityLabel={`${t('generate.move')} · ${dayLabel(date)}`}
                  disabled={saving || loading || dragging} onPress={() => setMovingDate(entry.date)} style={styles.swap}>
                  <Text style={styles.link}>{t('generate.move')}</Text>
                </Pressable>}
                {!entry.kept && <Pressable accessibilityRole="button" accessibilityLabel={`${t('generate.swap')} · ${dayLabel(date)}`}
                  disabled={!swappable || saving || loading || dragging} accessibilityState={{ disabled: !swappable || saving || loading || dragging }}
                  onPress={() => setPreview({ ...preview, entries: swapDinner(entry.date, preview.entries, preview.recipes, options) })}
                  style={({ pressed }) => [styles.swap, (!swappable || saving || loading) && styles.disabled, pressed && styles.pressed]}>
                  <Text style={styles.link}>{t('generate.swap')}</Text>
                </Pressable>}
              </View>
            </View>
          }} />
        <ActionSheet visible={movingDate !== null} title={t('generate.moveTo')} onClose={() => setMovingDate(null)}
          actions={preview.entries.filter(entry => entry.date !== movingDate).map(entry => {
            const date = fromDateKey(entry.date)
            return { label: `${dayLabel(date)} · ${n(date.getDate())}/${n(date.getMonth() + 1)}`, icon: 'swap-horizontal-outline',
              onPress: () => movingDate && setPreview({ ...preview, entries: moveDinnerBetweenDays(movingDate, entry.date, preview.entries) }) }
          })} />
        <PrimaryButton label={t('generate.apply')} loading={saving} disabled={missing > 0 || additions === 0 || loading || dragging} onPress={apply} />
        <PrimaryButton label={t('generate.shuffle')} variant="outline" disabled={saving || loading || dragging || additions === 0} onPress={() => regenerate()} />
        {error && <PrimaryButton label={t('generate.refresh')} variant="outline" loading={loading} disabled={saving || dragging} onPress={loadPreview} />}
        <PrimaryButton label={t('common.cancel')} variant="outline" disabled={saving || loading || dragging} onPress={() => { setPreview(null); setError(null) }} />
      </>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  section: { paddingHorizontal: spacing.gutter, gap: spacing.md },
  body: { ...type.bodyRead, color: c.textMuted },
  error: { ...type.bodyRead, color: c.danger },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionChip: { maxWidth: '100%', minHeight: sizes.hitMin },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dish: { flex: 1 },
  swap: { minHeight: sizes.hitMin, minWidth: sizes.hitMin, justifyContent: 'center', paddingHorizontal: spacing.sm },
  link: { ...type.bodyStrong, color: c.primary },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.6 },
})
