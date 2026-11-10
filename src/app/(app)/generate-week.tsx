import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import RecipePicker from '@/components/planner/RecipePicker'
import ActionSheet from '@/components/ui/ActionSheet'
import AddRow from '@/components/ui/AddRow'
import Chip from '@/components/ui/Chip'
import LedgerRow from '@/components/ui/LedgerRow'
import PrimaryButton from '@/components/ui/PrimaryButton'
import SearchBar from '@/components/ui/SearchBar'
import SectionHeader from '@/components/ui/SectionHeader'
import SettingRow from '@/components/ui/SettingRow'
import { Text } from '@/components/ui/Text'
import { useAuth } from '@/context/AuthContext'
import { COMMON_INGREDIENTS } from '@/data/ingredients'
import { KHMER_INGREDIENTS } from '@/data/ingredients.km'
import { useLanguage, useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useDayLabel, useMealtimeLabel, useMonthLabel } from '@/i18n/labels'
import { ApiError, applyMealWeek, getPlan, getRecipes } from '@/lib/api'
import type { GeneratedMealtime } from '@/lib/dinnerDraft'
import { addDays, fromDateKey, startOfWeek, toDateKey, weekDays } from '@/lib/week'
import { foldIngredientName, fridgeMatches, ingredientNames, makeWeekDraft, moveWeekMeal, replacementRecipes, slotKey, WIZARD_MEALS } from '@/lib/weekWizard'
import type { WizardSlot } from '@/lib/weekWizard'
import { contentType, sizes, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { PlanSlot, Recipe } from '@/types/recipe'

const titles = ['generate.whichMeals', 'generate.variety', 'generate.fridge', 'generate.review'] as const
type Library = { recipes: Recipe[]; plan: PlanSlot[] }

export default function GenerateWeekRoute() {
  const { week } = useLocalSearchParams<{ week?: string }>()
  const date = typeof week === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(week) ? fromDateKey(week) : null
  const from = date && toDateKey(startOfWeek(date)) === week ? week : toDateKey(startOfWeek(new Date()))
  return <GenerateWeek key={from} from={from} />
}

function GenerateWeek({ from }: { from: string }) {
  const { token } = useAuth()
  const router = useRouter()
  const t = useT()
  const n = useNum()
  const dayLabel = useDayLabel()
  const mealLabel = useMealtimeLabel()
  const monthLabel = useMonthLabel()
  const { language } = useLanguage()
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const writing = useRef(false)
  const [step, setStep] = useState(0)
  const [meals, setMeals] = useState<GeneratedMealtime[]>(['Lunch', 'Dinner'])
  const [options, setOptions] = useState({ allowRepeats: false, includeUntagged: false })
  const [fridge, setFridge] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [load, setLoad] = useState(0)
  const [library, setLibrary] = useState<Library | null>(null)
  const [loadError, setLoadError] = useState<StringKey | null>(null)
  const [draft, setDraft] = useState<WizardSlot[] | null>(null)
  const [editing, setEditing] = useState<{ slot: WizardSlot; mode: 'menu' | 'move' | 'pick' } | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<StringKey | null>(null)
  const dates = weekDays(fromDateKey(from)).map(toDateKey)
  const to = toDateKey(addDays(fromDateKey(from), 6))

  useEffect(() => {
    if (!token) return
    let active = true
    Promise.all([getRecipes(token), getPlan(from, to, token)])
      .then(([recipes, plan]) => { if (active) setLibrary({ recipes, plan }) })
      .catch(error => { if (active) setLoadError(apiErrorKey(error)) })
    return () => { active = false }
  }, [token, from, to, load])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (writing.current) return true
      if (step === 0) return false
      setStep(step - 1)
      scroll.current?.scrollTo({ y: 0, animated: false })
      return true
    })
    return () => subscription.remove()
  }, [step])

  function go(next: number) {
    Keyboard.dismiss()
    setEditing(null)
    setStep(next)
    scroll.current?.scrollTo({ y: 0, animated: false })
  }

  function close() {
    if (writing.current) return
    if (router.canGoBack()) router.back()
    else router.replace('/planner')
  }

  function refresh() {
    setLibrary(null)
    setLoadError(null)
    setSaveError(null)
    setDraft(null)
    setLoad(value => value + 1)
    go(2)
  }

  function preview() {
    if (!library) return
    if (!draft) {
      setDraft(makeWeekDraft(dates, WIZARD_MEALS.filter(meal => meals.includes(meal)),
        library.recipes, library.plan, options, fridge))
    }
    go(3)
  }

  const changes = draft?.filter(slot => slot.recipeId !== slot.expectedRecipeId) ?? []
  async function apply() {
    if (!token || writing.current || changes.length === 0) return
    writing.current = true
    setSaving(true)
    setSaveError(null)
    try {
      await applyMealWeek(from, changes, token)
      writing.current = false
      close()
    } catch (error) {
      setSaveError(error instanceof ApiError && error.status === 409 ? 'generate.changed' : apiErrorKey(error))
    } finally {
      writing.current = false
      setSaving(false)
    }
  }

  function place(slot: WizardSlot, recipeId: string | null) {
    setDraft(current => current?.map(entry => slotKey(entry) === slotKey(slot) ? { ...entry, recipeId } : entry) ?? null)
    setEditing(null)
    setSaveError(null)
  }

  const labelDay = (date: string) => {
    const day = fromDateKey(date)
    return `${dayLabel(day)} · ${n(day.getDate())} ${monthLabel(day)}`
  }
  const normalized = foldIngredientName(query)
  const chosenNames = new Set(fridge.map(foldIngredientName))
  const builtIn = (language === 'km' ? [...KHMER_INGREDIENTS, ...COMMON_INGREDIENTS] : [...COMMON_INGREDIENTS, ...KHMER_INGREDIENTS]).map(ingredient => ingredient.name)
  const names = step === 2 && library ? ingredientNames(library.recipes, builtIn) : []
  const suggestions = names.filter(name => {
    const key = foldIngredientName(name)
    return key.includes(normalized) && !chosenNames.has(key)
  }).slice(0, 10)
  const canAdd = normalized && !chosenNames.has(normalized) && !names.some(name => foldIngredientName(name) === normalized)
  function addIngredient(name: string) {
    setFridge(current => current.some(item => foldIngredientName(item) === foldIngredientName(name)) ? current : [...current, name])
    setQuery('')
    setDraft(null)
  }

  const pickerChoices = editing?.mode === 'pick' && library && draft
    ? replacementRecipes(editing.slot, draft, library.recipes, library.plan, options, fridge) : []
  const emptyCount = draft?.filter(slot => !slot.recipeId).length ?? 0
  const weekLabel = `${n(fromDateKey(from).getDate())} – ${n(fromDateKey(to).getDate())} ${monthLabel(fromDateKey(to))}`

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          {step > 0
            ? <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={t('common.back')} disabled={saving} onPress={() => go(step - 1)}>
                <Ionicons name="chevron-back" size={sizes.hitMin / 2} color={c.text} />
              </Pressable>
            : <View style={styles.icon} />}
          <Text style={styles.headerTitle}>{t('generate.open')}</Text>
          <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={t('common.close')} disabled={saving} onPress={close}>
            <Ionicons name="close" size={sizes.hitMin / 2} color={c.text} />
          </Pressable>
        </View>
        <ScrollView ref={scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {titles.map((title, index) => <View key={title} style={[styles.bar, index <= step && styles.barActive]} />)}
          </View>
          <Text style={styles.meta}>{t('generate.step').replace('{n}', n(step + 1))} · {weekLabel}</Text>
          <Text accessibilityRole="header" style={styles.title}>{t(titles[step])}</Text>

          {step === 0 && <>
            <Text style={styles.copy}>{t('generate.mealHelp')}</Text>
            {WIZARD_MEALS.map(meal => <LedgerRow key={meal} title={mealLabel(meal)} checked={meals.includes(meal)} checkedAppearance="selected"
              onToggle={checked => {
                setMeals(current => checked ? [...current, meal] : current.filter(item => item !== meal))
                setDraft(null)
              }} />)}
          </>}

          {step === 1 && <>
            <Text style={styles.copy}>{t('generate.varietyHelp')}</Text>
            <SettingRow label={t('generate.repeats')} hint={t('generate.repeatHelp')} trailing="switch" checked={options.allowRepeats}
              onToggle={allowRepeats => { setOptions(current => ({ ...current, allowRepeats })); setDraft(null) }} />
            <SettingRow label={t('generate.untagged')} hint={t('generate.untaggedHelp')} trailing="switch" checked={options.includeUntagged}
              onToggle={includeUntagged => { setOptions(current => ({ ...current, includeUntagged })); setDraft(null) }} />
          </>}

          {step === 2 && <>
            <Text style={styles.copy}>{t('generate.fridgeHelp')}</Text>
            <SearchBar value={query} onChangeText={setQuery} placeholder={t('generate.fridgeSearch')} />
            {fridge.length > 0 && <View style={styles.chips}>
              {fridge.map(name => <Chip key={name} label={`${name} ×`} active onPress={() => {
                setFridge(current => current.filter(item => item !== name))
                setDraft(null)
              }} />)}
            </View>}
            {canAdd ? <AddRow label={t('generate.addIngredient').replace('{name}', query.trim())} onPress={() => addIngredient(query.trim())} /> : null}
            {suggestions.map(name => <LedgerRow key={name} title={name} ingredient onPress={() => addIngredient(name)} />)}
            {!library && <Text style={styles.copy} accessibilityLiveRegion="polite">{t(loadError ?? 'generate.loading')}</Text>}
            {loadError && <PrimaryButton label={t('common.retry')} variant="outline" onPress={refresh} />}
          </>}

          {step === 3 && draft && library && <>
            <Text style={styles.copy}>{t('generate.reviewHelp')}</Text>
            {emptyCount > 0 && <Text style={styles.copy}>{t('generate.openSlots').replace('{n}', n(emptyCount))}</Text>}
            {dates.map(date => (
              <View key={date} style={styles.day}>
                <SectionHeader variant="recipe" label={labelDay(date)} />
                {draft.filter(entry => entry.date === date).map(entry => {
                  const recipe = library.recipes.find(item => item.id === entry.recipeId)
                  const planned = library.plan.find(item => item.recipeId === entry.recipeId)?.recipe
                  const dish = recipe ?? planned
                  const matches = recipe ? fridgeMatches(recipe, fridge) : []
                  return <View key={slotKey(entry)}>
                    <Text style={styles.meta}>{mealLabel(entry.mealtime)}</Text>
                    {entry.recipeId ? <LedgerRow title={dish?.title ?? t('generate.kept')} photoUrl={dish?.photoUrl}
                      value={entry.recipeId === entry.expectedRecipeId ? t('generate.kept') : undefined}
                      accessibilityLabel={`${mealLabel(entry.mealtime)} · ${dish?.title ?? t('generate.kept')}`}
                      onPress={saving ? undefined : () => setEditing(current => current?.mode === 'menu' && slotKey(current.slot) === slotKey(entry) ? null : { slot: entry, mode: 'menu' })} />
                      : <AddRow label={t('generate.addMeal')} onPress={() => {
                        if (!saving) setEditing({ slot: entry, mode: 'pick' })
                      }} />}
                    {editing?.mode === 'menu' && slotKey(editing.slot) === slotKey(entry) && <View style={styles.chips}>
                      {([
                        ['generate.replace', () => setEditing({ slot: entry, mode: 'pick' })],
                        ['generate.move', () => setEditing({ slot: entry, mode: 'move' })],
                        ['generate.removeMeal', () => place(entry, null)],
                      ] as const).map(([label, action]) => <Pressable key={label} style={styles.action} accessibilityRole="button" onPress={action}>
                        <Text style={styles.actionText}>{t(label)}</Text>
                      </Pressable>)}
                    </View>}
                    {matches.length > 0 && <Text style={[styles.match, contentType('ingredientName', matches.join(', '))]}>
                      {t('generate.uses').replace('{names}', matches.join(', '))}
                    </Text>}
                  </View>
                })}
              </View>
            ))}
            {saveError && <Text style={styles.error} accessibilityRole="alert">{t(saveError)}</Text>}
            {saveError === 'generate.changed' && <PrimaryButton label={t('generate.refresh')} variant="outline" onPress={refresh} />}
            {!changes.length && <Text style={styles.copy}>{t('generate.noChanges')}</Text>}
          </>}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton
            label={t(step === 3 ? 'generate.apply' : step === 2 ? 'generate.preview' : 'common.next')}
            loading={saving}
            disabled={step === 0 ? !meals.length : step === 2 ? !library : step === 3 && (!changes.length || saveError === 'generate.changed')}
            onPress={() => { if (step === 3) void apply(); else if (step === 2) preview(); else go(step + 1) }}
          />
        </View>
      </KeyboardAvoidingView>
      <ActionSheet visible={editing?.mode === 'move'} onClose={() => setEditing(null)}
        title={t('generate.moveTo')}
        actions={editing?.mode === 'move' ? dates.filter(date => date !== editing.slot.date).map(date => ({
          label: draft?.some(slot => slot.date === date && slot.mealtime === editing.slot.mealtime && slot.recipeId)
            ? t('generate.swapWith').replace('{day}', labelDay(date)) : labelDay(date),
          icon: 'swap-horizontal-outline',
          onPress: () => { setDraft(current => current ? moveWeekMeal(current, editing.slot, date) : null); setSaveError(null) },
        })) : []}
      />
      <RecipePicker visible={editing?.mode === 'pick'} title={t(editing?.slot.recipeId ? 'generate.replace' : 'generate.addMeal')}
        recipes={pickerChoices} onClose={() => setEditing(null)} onPick={recipe => { if (editing) place(editing.slot, recipe.id) }} />
    </SafeAreaView>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  headerTitle: { ...type.section, color: c.text, flexShrink: 1, textAlign: 'center' },
  icon: { minWidth: sizes.hitMin, minHeight: sizes.hitMin, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.gutter, gap: spacing.md },
  progress: { flexDirection: 'row', gap: spacing.xs },
  bar: { flex: 1, borderBottomWidth: 2, borderColor: c.borderStrong },
  barActive: { borderColor: c.primary },
  title: { ...type.displayLarge, color: c.text },
  meta: { ...type.caption, color: c.textMuted },
  copy: { ...type.bodyRead, color: c.text },
  match: { color: c.primary },
  action: { minHeight: sizes.hitMin, justifyContent: 'center', paddingHorizontal: spacing.sm },
  actionText: { ...type.bodyStrong, color: c.primary, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.primary },
  error: { ...type.bodyRead, color: c.danger },
  day: { gap: spacing.sm, marginTop: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border },
})
