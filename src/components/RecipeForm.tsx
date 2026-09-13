import { createRef, forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useHeaderHeight } from 'expo-router/react-navigation'
import { useNavigation } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { ActivityIndicator, Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '@/components/ui/Text'
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { ApiError, getRecipes, uploadPhoto } from '@/lib/api'
import {
  fieldForServerIssue,
  ingredientKey,
  recipeSizeError,
  stepForField,
  stepKey,
  summarise,
  usedIngredients,
  usedSteps,
  validateStep,
} from '@/lib/recipeValidation'
import type { FieldErrors, Localiser } from '@/lib/recipeValidation'
import { foldForCompare } from '@/lib/text'
import { formatDuration } from '@/lib/timer'
import { parseNumeric, parseWholeNumber, useNum, useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useDifficultyLabel, useMealtimeLabel } from '@/i18n/labels'
import Chip from '@/components/ui/Chip'
import Field from '@/components/ui/Field'
import FieldTrigger from '@/components/ui/FieldTrigger'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Reorderable from '@/components/ui/Reorderable'
import Select from '@/components/ui/Select'
import IngredientPicker from '@/components/IngredientPicker'
import ToolPicker from '@/components/ToolPicker'
import TimerPicker from '@/components/TimerPicker'
import UnitPicker from '@/components/UnitPicker'
import { emojiForIngredient } from '@/data/ingredients'
import type { CommonIngredient } from '@/data/ingredients'
import { emojiForCuisine } from '@/data/cuisines'
import { useCuisines } from '@/data/usePantry'
import { move } from '@/lib/reorder'
import {
  inputType,
  minHeights,
  radius,
  sizes,
  spacing,
  useTheme,
  useThemedStyles,
  useTypeScale,
} from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { DIFFICULTIES, MEALTIMES } from '@/types/recipe'
import type {
  Difficulty,
  FormIngredient,
  FormStep,
  Mealtime,
  Recipe,
  RecipeInput,
} from '@/types/recipe'

// Keys rather than labels: the indicator bar renders them through `t`, but
// STEP_KEYS.length is still what drives the page count and the submit loop, so
// adding a step remains this array plus a <Page>.
const STEP_KEYS = [
  'form.step.basics',
  'form.step.ingredients',
  'form.step.steps',
  'form.step.nutrition',
] as const

/**
 * The round numbers a recipe's total time almost always lands on. The picker
 * keeps `allowCustom`, so these are a shortcut and not a limit — the column
 * takes any whole number, and plenty of existing recipes sit between them.
 */
const TOTAL_MINUTE_PRESETS = [5, 10, 15, 30, 45, 60, 75, 90, 120]

/**
 * One page of the wizard: a full-width vertical scroller inside the pager.
 *
 * `width` is passed rather than flexed because a horizontal ScrollView sizes its
 * children to their content — a flexed page collapses to nothing and all four
 * end up stacked in the first screenful.
 */
const Page = forwardRef<
  ScrollView,
  {
    width: number
    contentStyle: StyleProp<ViewStyle>
    children: ReactNode
    /** False while a row is being dragged — see `Reorderable`. */
    scrollEnabled?: boolean
  }
>(function Page({ width, contentStyle, children, scrollEnabled = true }, ref) {
  return (
    <ScrollView
      ref={ref}
      style={{ width }}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      // A drag is a vertical gesture inside a vertical scroller, so one of them
      // has to stand down. One re-render at each end of the gesture.
      scrollEnabled={scrollEnabled}
    >
      {children}
    </ScrollView>
  )
})

/**
 * A blank nutrition box means "I don't know", which has to reach the API as an
 * explicit null. Sending nothing at all would leave whatever was saved before
 * untouched, so clearing a value would appear to work and then undo itself on
 * the next load.
 */
// `parseNumeric` already returns null for blank and for anything unparseable,
// and folds Khmer digits on the way — `Number('៥០០')` is NaN, which used to
// reach the API as a JSON `null` and silently clear the column instead of
// failing. The wrapper stays for the name, which is what the call sites read.
function toNullableNumber(raw: string): number | null {
  return parseNumeric(raw)
}

/** `!= null` on purpose: a stored 0 is a real value and must seed as "0". */
function toFormNumber(value: number | null | undefined): string {
  return value != null ? String(value) : ''
}

// The cuisine options used to be hoisted to module scope for reference
// stability, since Select memoises on them. They can't be any more — the list
// follows the language — so stability now comes from `useCuisines()` returning a
// memoised array and the `useMemo` below keying off it. Same guarantee, one
// level down.

function genId() {
  return Math.random().toString(36).slice(2)
}

function toFormIngredients(recipe?: Recipe): FormIngredient[] {
  if (!recipe || recipe.ingredients.length === 0) {
    return [{ id: genId(), name: '', quantity: '', unit: '' }]
  }
  return recipe.ingredients.map((i) => ({
    id: i.id ?? genId(),
    name: i.name,
    quantity: String(i.quantity),
    unit: i.unit,
  }))
}

function toFormSteps(recipe?: Recipe): FormStep[] {
  if (!recipe || recipe.steps.length === 0) {
    return [{ id: genId(), instruction: '', durationSeconds: null }]
  }
  return [...recipe.steps]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((s) => ({
      id: s.id ?? genId(),
      instruction: s.instruction,
      // `?? null`, not `?? undefined`: the form's shape is `number | null` so
      // there is one way to say "no timer", and an older recipe saved before
      // the column existed comes back with the field absent.
      durationSeconds: s.durationSeconds ?? null,
    }))
}

/**
 * Four steps, one component. All the form state lives here rather than across
 * four routes, so a back gesture can't lose a half-filled recipe and there's a
 * single submit at the end.
 *
 * **Order is free in both modes.** The four steps are pages of a horizontal
 * pager, reachable by swipe or by tapping the indicator, so you can start with
 * the Steps and fill the Basics afterwards. `Next` still validates the step
 * you're on and still refuses to advance — it's a checkpoint, not a gate, and
 * nothing invalid can be saved because `handleSubmit` re-validates all four.
 */
export default function RecipeForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Recipe
  onSubmit: (data: RecipeInput) => Promise<void>
  // A key, not a sentence. As a `string` this quietly accepted raw English
  // from both call sites and shipped an untranslated button.
  submitLabel: StringKey
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  // The validators take both halves of the language together — see `Localiser`.
  // Memoised so `validateStep` isn't handed a new object on every keystroke.
  const loc = useMemo<Localiser>(() => ({ t, n }), [t, n])
  const mealtimeLabel = useMealtimeLabel()
  const difficultyLabel = useDifficultyLabel()
  const { token } = useAuth()
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const navigation = useNavigation()
  // The one place a factory can't be used: react-navigation takes a plain
  // style object for the header title, so the scale is read rather than passed.
  const typeScale = useTypeScale()
  const isEditing = initial !== undefined

  // The horizontal pager, plus one vertical scroller per page. A field's offset
  // is relative to its own page, so scrolling to an error means picking the
  // right ref rather than sharing one.
  const pagerRef = useRef<ScrollView>(null)
  const pageRefs = useRef(STEP_KEYS.map(() => createRef<ScrollView>())).current

  // `onLayout` is the authority — this form is a modal on iOS and a resizable
  // window on web, so the window's width is only ever an opening guess.
  //
  // But it has to be *some* guess on native. Starting at 0 leaves the first
  // frame empty and mounts the entire form one frame later, which drops that
  // mount straight onto the modal's slide-up animation and visibly hitches it.
  // A native modal is full-bleed horizontally, so the window width is right or
  // near enough for a single frame, and the realign effect below corrects it.
  // On web it can be wildly wrong (the window is not the container), and there
  // is no presentation animation to protect, so web still waits to measure.
  const [pageWidth, setPageWidth] = useState(
    Platform.OS === 'web' ? 0 : Dimensions.get('window').width
  )

  const [step, setStep] = useState(0)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 'Beginner')
  const [mealtime, setMealtime] = useState<Mealtime | undefined>(initial?.mealtime)
  const [cuisine, setCuisine] = useState(initial?.cuisine ?? '')
  const [totalMinutes, setTotalMinutes] = useState(initial ? String(initial.totalMinutes) : '')
  const [servings, setServings] = useState(initial ? String(initial.servings) : '')
  const [tools, setTools] = useState(initial?.tools.join(', ') ?? '')
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initial?.photoUrl)
  const [uploading, setUploading] = useState(false)
  const [ingredients, setIngredients] = useState<FormIngredient[]>(toFormIngredients(initial))
  const [steps, setSteps] = useState<FormStep[]>(toFormSteps(initial))
  const [calories, setCalories] = useState(toFormNumber(initial?.calories))
  const [protein, setProtein] = useState(toFormNumber(initial?.protein))
  const [carbs, setCarbs] = useState(toFormNumber(initial?.carbs))
  const [fat, setFat] = useState(toFormNumber(initial?.fat))
  // Per-field messages, shown under the input they belong to. Separate from
  // `submitError`, which is for failures with no field to blame (offline, 500).
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [toolPickerOpen, setToolPickerOpen] = useState(false)
  // Which step's timer is being set, by row id — one picker for the whole form,
  // exactly like `unitPickerFor`.
  const [timerFor, setTimerFor] = useState<string | null>(null)
  // The id of the ingredient row whose unit is being picked, or null. One picker
  // instance serves every row — mounting one per row would put a Modal behind
  // each of up to a hundred ingredients.
  const [unitPickerFor, setUnitPickerFor] = useState<string | null>(null)
  const [takenTitles, setTakenTitles] = useState<Set<string>>(new Set())
  // True only while a row is being dragged. React state rather than a shared
  // value because it drives a prop on the scroller — two re-renders per drag,
  // at the two moments the user is not looking at anything else.
  const [dragging, setDragging] = useState(false)

  const cuisines = useCuisines()
  const cuisineOptions = useMemo(
    () => cuisines.map((c) => ({ label: c.name, emoji: c.emoji })),
    [cuisines]
  )
  const minuteOptions = useMemo(
    () => TOTAL_MINUTE_PRESETS.map((n) => ({ label: String(n), emoji: '⏱' })),
    []
  )
  // The comma string as a list. It's what the picker ticks against, so a tool
  // typed by hand shows as added there too.
  const selectedTools = useMemo(
    () => tools.split(',').map((s) => s.trim()).filter(Boolean),
    [tools]
  )
  // What the trigger shows: the first tool, then how many others there are.
  // Counted through `n()`, like every other number the interface prints.
  const toolSummary = useMemo(() => {
    if (selectedTools.length === 0) return undefined
    const [first, ...rest] = selectedTools
    return rest.length === 0 ? first : `${first} +${n(rest.length)}`
  }, [selectedTools, n])

  // The other recipes' titles, so a duplicate is caught on this screen instead
  // of coming back as a 409 after Save. The server still enforces it — this is
  // only about saying so earlier, which is why a failed fetch is ignored.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    getRecipes(token)
      .then((list) => {
        if (cancelled) return
        setTakenTitles(
          new Set(list.filter((r) => r.id !== initial?.id).map((r) => foldForCompare(r.title)))
        )
      })
      .catch(() => {
        // Non-fatal: the 409 from the server is the backstop.
      })
    return () => {
      cancelled = true
    }
  }, [token, initial?.id])

  /**
   * The header, per SCREENS.md § 14: a bare `‹`, the title centred in mono, and
   * a tamarind SAVE — on every page, not just the last one.
   *
   * SAVE is always live. It runs the same `handleSubmit` the footer button
   * does, which re-validates all four steps and pages to the first one that
   * fails, so pressing it on a half-filled recipe is answered with the problem
   * rather than with a disabled control. That is also why it isn't greyed out:
   * a dead button on page 1 can't tell you what page 3 is missing.
   *
   * `handleSubmit` is read through a ref rather than named as a dependency.
   * It closes over every piece of form state and so is a new function on every
   * keystroke; in the dependency array it would re-run `setOptions` — and
   * therefore re-render the screen — on each one.
   */
  const submitRef = useRef(handleSubmit)
  submitRef.current = handleSubmit

  useEffect(() => {
    navigation.setOptions({
      // The title itself stays with the Stack, which owns it and re-renders on
      // a language change — this only says how it is set.
      headerTitleAlign: 'center',
      // The strip of tabs sits directly under the title in the mockup, with
      // nothing drawn between them.
      headerShadowVisible: false,
      headerTitleStyle: { ...typeScale.sectionLabel, color: c.text, textTransform: 'uppercase' },
      // iOS labels the back button with the previous screen's title; § 14 draws
      // a chevron alone.
      headerBackButtonDisplayMode: 'minimal',
      headerRight: () => (
        <Pressable
          onPress={() => submitRef.current()}
          hitSlop={12}
          disabled={submitting || uploading}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
          style={({ pressed }) => [
            (pressed || submitting || uploading) && styles.pressedSoft,
          ]}
        >
          <Text style={styles.headerAction}>{t('common.save')}</Text>
        </Pressable>
      ),
    })
  }, [navigation, t, typeScale, c.text, styles, submitting, uploading])

  /**
   * iOS's swipe-from-the-left-edge would pop the whole screen when the user is
   * reaching for the previous step, so it's live only on the first page, where
   * the pager has nothing to its left and going back really is the right answer.
   *
   * **Editing only.** `recipe/new` is `presentation: 'modal'`, where the same
   * option controls the *vertical* swipe-to-dismiss — disabling it there would
   * shut the only gesture out of the form.
   */
  useEffect(() => {
    if (!isEditing) return
    navigation.setOptions({ gestureEnabled: step === 0 })
  }, [navigation, isEditing, step])

  // Read inside the width effect below without making it depend on the step —
  // see the note there.
  const stepRef = useRef(step)
  useEffect(() => {
    stepRef.current = step
  }, [step])

  /**
   * A rotation or a browser resize changes the page width while the pager's
   * offset stays in the old pixels, leaving it parked between two pages.
   * Re-align, unanimated: this is a correction, not navigation.
   *
   * Deliberately not keyed on `step`. Ordinary step changes are already driven
   * by `goTo`'s animated scroll and by the gesture itself, and re-running this
   * on each one would cut those short.
   */
  useEffect(() => {
    if (pageWidth === 0) return
    pagerRef.current?.scrollTo({ x: stepRef.current * pageWidth, animated: false })
  }, [pageWidth])

  // Where each validated field sits inside the scroll content, recorded on
  // layout so an error can scroll itself into view rather than leaving the user
  // to hunt for the red text.
  const fieldOffsets = useRef<Record<string, number>>({})

  // Both draggable lists sit inside a wrapper of their own, so a row's own
  // `onLayout` reports a `y` relative to that wrapper rather than to the page.
  // These hold where each wrapper starts, and `registerNested` adds the two
  // together — without which an invalid ingredient scrolls the page to roughly
  // the top of the list instead of to the row that is actually wrong.
  const ingredientsTop = useRef(0)
  const stepsTop = useRef(0)

  // Variadic because side-by-side fields share one wrapper: measuring them
  // separately would record a y relative to the row rather than to the scroll
  // content, so both names point at the row they're actually in.
  function registerField(...names: string[]) {
    return (event: LayoutChangeEvent) => {
      for (const name of names) fieldOffsets.current[name] = event.nativeEvent.layout.y
    }
  }

  /** `registerField` for a row inside one of the reorderable lists. */
  function registerNested(base: { current: number }, name: string) {
    return (event: LayoutChangeEvent) => {
      fieldOffsets.current[name] = base.current + event.nativeEvent.layout.y
    }
  }

  function scrollToField(name?: string) {
    // Deferred: the pager animates sideways, so the destination page hasn't
    // settled on this frame and its offsets may not be recorded yet.
    setTimeout(() => {
      const y = name ? fieldOffsets.current[name] : undefined
      const page = pageRefs[name ? stepForField(name) : step]
      page?.current?.scrollTo({ y: Math.max((y ?? 0) - spacing.xl, 0), animated: true })
    }, 60)
  }

  // Keeps a newly added row above the keyboard instead of behind it.
  function scrollToBottom() {
    setTimeout(() => pageRefs[step]?.current?.scrollToEnd({ animated: true }), 50)
  }

  /** Drops one field's error as soon as the user edits it. */
  function clearError(...fields: string[]) {
    setErrors((prev) => {
      if (!fields.some((f) => prev[f])) return prev
      const next = { ...prev }
      for (const field of fields) delete next[field]
      return next
    })
  }

  /**
   * Shows a set of errors, moving to the step that owns the first one.
   *
   * Goes through `goTo` rather than `setStep`: setting the state alone would
   * move the indicator and leave the pager showing a different page than the one
   * the error is on.
   */
  function showErrors(next: FieldErrors, targetStep: number) {
    setErrors(next)
    setSubmitError(null)
    if (targetStep !== step) goTo(targetStep)
    scrollToField(Object.keys(next)[0])
  }

  async function handlePickPhoto() {
    // Web has no media-library permission model — the browser file picker handles it.
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        setErrors((prev) => ({
          ...prev,
          photoUrl: t('form.photoPermission'),
        }))
        return
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })
    if (result.canceled || !token) return

    setUploading(true)
    clearError('photoUrl')
    try {
      setPhotoUrl(await uploadPhoto(result.assets[0].uri, token))
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        photoUrl: err instanceof Error ? err.message : t('form.photoFailed'),
      }))
    } finally {
      setUploading(false)
    }
  }

  function updateIngredient(id: string, field: keyof FormIngredient, value: string) {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
    clearError(ingredientKey(id), 'ingredients')
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { id: genId(), name: '', quantity: '', unit: '' }])
    clearError('ingredients')
    scrollToBottom()
  }

  // The last row is removable too. A ✕ that silently does nothing reads as
  // broken; an empty list is a fine intermediate state, and `validate` is what
  // stops you saving one.
  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id))
    clearError(ingredientKey(id))
  }

  /**
   * Both lists are ordered, and both orders are saved: a step's index becomes
   * `stepNumber`, an ingredient's becomes `Ingredient.position`. So this is a
   * content edit like any other — it clears no errors, because moving a row
   * doesn't fix or break one.
   */
  function reorderIngredients(from: number, to: number) {
    setIngredients((prev) => move(prev, from, to))
  }

  function reorderSteps(from: number, to: number) {
    setSteps((prev) => move(prev, from, to))
  }

  /**
   * Picked from the pantry list. Fills the first empty row rather than always
   * appending, so tapping "Garlic" on a fresh form doesn't leave a blank row
   * hanging above it.
   */
  function addCommonIngredient(item: CommonIngredient) {
    const picked = { name: item.name, quantity: '', unit: item.unit }
    setIngredients((prev) => {
      const blank = prev.find((i) => !i.name.trim())
      if (blank) return prev.map((i) => (i.id === blank.id ? { ...i, ...picked } : i))
      return [...prev, { id: genId(), ...picked }]
    })
    clearError('ingredients')
  }

  function removeCommonIngredient(name: string) {
    const key = name.trim().toLowerCase()
    setIngredients((prev) => prev.filter((i) => i.name.trim().toLowerCase() !== key))
  }

  /**
   * Tools stay a comma-separated string rather than becoming an array: the field
   * below the picker is still the real input, `handleSubmit` still splits it,
   * and the validation rules don't move. These two just edit that string.
   *
   * Folded, not lowercased, on both sides — a Khmer tool name can carry an
   * invisible zero-width space, and an untick that doesn't match leaves the tool
   * on screen looking like a dead button.
   */
  function addTool(name: string) {
    setTools((prev) => {
      const list = prev.split(',').map((s) => s.trim()).filter(Boolean)
      if (list.some((tool) => foldForCompare(tool) === foldForCompare(name))) return prev
      return [...list, name].join(', ')
    })
    clearError('tools')
  }

  function removeTool(name: string) {
    setTools((prev) =>
      prev
        .split(',')
        .map((s) => s.trim())
        .filter((tool) => tool && foldForCompare(tool) !== foldForCompare(name))
        .join(', ')
    )
    clearError('tools')
  }

  function updateStep(id: string, instruction: string) {
    setSteps((prev) => prev.map((item) => (item.id === id ? { ...item, instruction } : item)))
    clearError(stepKey(id), 'steps')
  }

  function addStep() {
    setSteps((prev) => [...prev, { id: genId(), instruction: '', durationSeconds: null }])
    clearError('steps')
    scrollToBottom()
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id))
    clearError(stepKey(id))
  }

  /** Sets or clears one step's countdown. `null` clears it. */
  function setStepTimer(id: string, durationSeconds: number | null) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, durationSeconds } : s)))
    setTimerFor(null)
  }

  function currentValues() {
    return {
      photoUrl,
      title,
      description,
      totalMinutes,
      servings,
      cuisine,
      tools,
      ingredients,
      steps,
      calories,
      protein,
      carbs,
      fat,
      takenTitles,
    }
  }

  /**
   * Moves the pager. Each page keeps its own vertical position on purpose — with
   * order free you're returning to work in progress, not restarting a step. An
   * error jump repositions the page itself via `scrollToField`.
   */
  function goTo(index: number) {
    setSubmitError(null)
    setStep(index)
    Keyboard.dismiss()
    pagerRef.current?.scrollTo({ x: index * pageWidth, animated: true })
  }

  /**
   * Touching a `TextInput` focuses it even when the touch turns out to be the
   * start of a swipe, so the keyboard begins rising for a page turn that was
   * never going to type anything. Dismissing here — at the first pixel of drag,
   * rather than when the page lands — cuts that off while the animation is a
   * few frames old, instead of letting it play out and reverse.
   *
   * `keyboardDismissMode="on-drag"` below does the same thing natively and
   * therefore sooner; this is the backstop for platforms that ignore the prop.
   */
  function onPagerDragStart() {
    Keyboard.dismiss()
  }

  /**
   * The gesture landed on a page. Deliberately does *not* drive the pager back
   * — calling scrollTo here would fight the scroll that just finished. The
   * keyboard is already gone by now; see `onPagerDragStart`.
   */
  function onPagerSettled(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (pageWidth === 0) return
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth)
    if (next === step) return
    setStep(next)
    setSubmitError(null)
  }

  /**
   * Advancing is what enforces the rules while creating. Validating here rather
   * than only at Save is the point: an error about total minutes is useless on
   * the Steps screen, where the field isn't even visible.
   */
  function handleNext() {
    const stepErrors = validateStep(step, currentValues(), loc)
    if (Object.keys(stepErrors).length > 0) {
      showErrors(stepErrors, step)
      return
    }
    // Only this step's messages are resolved. Another step may still be flagged
    // from an earlier save attempt, and its indicator should stay red.
    setErrors((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([field]) => stepForField(field) !== step))
    )
    goTo(step + 1)
  }

  async function handleSubmit() {
    // Every step, not just the current one — in edit mode you can save from
    // anywhere, so the invalid step may not be the one on screen. Collect them
    // all so the other steps' indicators light up too.
    const all: FieldErrors = {}
    let firstBadStep = -1
    for (let i = 0; i < STEP_KEYS.length; i++) {
      const stepErrors = validateStep(i, currentValues(), loc)
      if (Object.keys(stepErrors).length > 0 && firstBadStep === -1) firstBadStep = i
      Object.assign(all, stepErrors)
    }
    if (firstBadStep !== -1) {
      showErrors(all, firstBadStep)
      return
    }

    const submittedIngredients = usedIngredients(ingredients).filter((i) => i.name.trim())
    const submittedSteps = usedSteps(steps)

    const data: RecipeInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      photoUrl: photoUrl as string,
      difficulty,
      mealtime,
      cuisine: cuisine.trim() || undefined,
      // `?? 0` is unreachable — `validateStep` has already rejected anything
      // these can't parse — but it keeps a NaN off the wire if that ever stops
      // being true, since `JSON.stringify(NaN)` is `null` and the server would
      // read a required field as absent rather than as wrong.
      totalMinutes: parseWholeNumber(totalMinutes) ?? 0,
      servings: parseWholeNumber(servings) ?? 0,
      // All four every time, null included — see `toNullableNumber`.
      calories: toNullableNumber(calories),
      protein: toNullableNumber(protein),
      carbs: toNullableNumber(carbs),
      fat: toNullableNumber(fat),
      tools: tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      ingredients: submittedIngredients.map((i) => ({
        name: i.name.trim(),
        quantity: parseNumeric(i.quantity) ?? 0,
        unit: i.unit.trim(),
      })),
      steps: submittedSteps.map((s, index) => ({
        stepNumber: index + 1,
        instruction: s.instruction.trim(),
        // Always sent, explicitly null when unset — the same rule the nutrition
        // fields follow, and for the same reason: an omitted key reads as "no
        // change" rather than as "clear it".
        durationSeconds: s.durationSeconds,
      })),
    }

    // Size is a property of the whole recipe, so there's no field to outline —
    // this one is the footer line's job.
    const tooLarge = recipeSizeError(data, loc)
    if (tooLarge) {
      setErrors({})
      setSubmitError(tooLarge)
      return
    }

    setSubmitting(true)
    setErrors({})
    setSubmitError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      handleSaveError(
        err,
        submittedIngredients.map((i) => i.id),
        submittedSteps.map((s) => s.id)
      )
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * Puts a rejected save back on the field that caused it. Anything the server
   * refuses that the client thought was fine — a title someone else's device
   * just took, a rule only the API knows — still lands next to an input rather
   * than as a lone sentence above the button.
   */
  function handleSaveError(err: unknown, ingredientIds: string[], stepIds: string[]) {
    if (err instanceof ApiError) {
      if (err.status === 409) {
        // The only 409 the API raises is a duplicate title.
        setTakenTitles((prev) => new Set(prev).add(title.trim().toLowerCase()))
        showErrors({ title: t('error.api.titleTaken') }, 0)
        return
      }

      const mapped: FieldErrors = {}
      for (const issue of err.details) {
        const field = fieldForServerIssue(issue.field, ingredientIds, stepIds)
        // The server's per-field text is English and not ours to translate, so
        // the field gets the outline and nothing else — which is the rule this
        // form already follows for everything an outline can explain. The
        // translated footer line carries the rest.
        if (field && !mapped[field]) mapped[field] = ''
      }
      if (Object.keys(mapped).length > 0) {
        showErrors(mapped, stepForField(Object.keys(mapped)[0]))
        return
      }
    }
    setSubmitError(err instanceof ApiError ? t(apiErrorKey(err)) : t('form.saveFailed'))
  }

  const onLastStep = step === STEP_KEYS.length - 1
  // Key presence, not truthiness: most entries are '' because the outline is
  // the whole message.
  const invalid = (field: string) => field in errors
  const stepsWithErrors = new Set(Object.keys(errors).map(stepForField))
  const footerMessage = submitError ?? summarise(errors, loc)

  // The bar has three states, brightest first: the page you're on, a step that
  // passes validation, a step that doesn't. Position has to be the loudest of
  // them — "how far you've walked" stopped describing anything once order went
  // free, but "where am I" never does. `validateStep` is pure and small, so
  // checking all four every render costs nothing.
  //
  // Nutrition is entirely optional, so it reads as complete on a blank form.
  // That's the rule working, not a bug: the bar says this step won't stop you
  // saving, and nutrition never can.
  const stepValues = currentValues()
  const completeSteps = new Set(
    STEP_KEYS.map((_, index) => index).filter(
      (index) => Object.keys(validateStep(index, stepValues, loc)).length === 0
    )
  )

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.indicator}>
        {STEP_KEYS.map((stepKeyName, index) => {
          return (
            <Pressable
              key={stepKeyName}
              // Every step is reachable from every other one, in both modes.
              onPress={() => goTo(index)}
              style={styles.indicatorItem}
            >
              <View
                style={[
                  styles.indicatorBar,
                  completeSteps.has(index) && styles.indicatorBarComplete,
                  // Where you are outranks whether it validates.
                  index === step && styles.indicatorBarCurrent,
                  // A step you're not looking at can still be the broken one,
                  // and on the one you are, red is the more useful colour.
                  stepsWithErrors.has(index) && styles.indicatorBarError,
                ]}
              />
              <View style={styles.indicatorLabelRow}>
                <Text
                  // Four slots share the width now, so "Ingredients" no longer
                  // fits on a small phone. One clean ellipsis beats a label
                  // wrapping to a second line and shunting the row taller.
                  numberOfLines={1}
                  // That ellipsis is a *designed* budget, so it must not absorb
                  // OS font scaling on top of the width squeeze — at the
                  // app-wide default an 11pt label takes the full 1.35× and
                  // Khmer's "សារធាតុចិញ្ចឹម" loses most of itself. Same 1.15 as
                  // the dock, for the same reason: fixed columns, no room.
                  maxFontSizeMultiplier={1.15}
                  style={[
                    styles.indicatorLabel,
                    index === step && styles.indicatorLabelActive,
                    stepsWithErrors.has(index) && styles.indicatorLabelError,
                  ]}
                >
                  {t(stepKeyName)}
                </Text>
                {stepsWithErrors.has(index) && (
                  <Ionicons name="alert-circle" size={13} color={c.danger} />
                )}
              </View>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.pagerWrap} onLayout={(e) => setPageWidth(e.nativeEvent.layout.width)}>
        {pageWidth > 0 && (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            // Without this, a swipe that starts on a focused input is spent
            // dismissing the keyboard instead of turning the page.
            keyboardShouldPersistTaps="handled"
            // Native, so it beats the JS handler to it. A tap that stays a tap
            // is untouched — only an actual drag closes the keyboard.
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={onPagerDragStart}
            onMomentumScrollEnd={onPagerSettled}
            scrollEventThrottle={16}
          >
            <Page ref={pageRefs[0]} width={pageWidth} contentStyle={styles.content}>
              <View onLayout={registerField('photoUrl')}>
                <Pressable
                  style={[styles.photoPicker, invalid('photoUrl') && styles.photoPickerInvalid]}
                  onPress={handlePickPhoto}
                  disabled={uploading}
                  accessibilityRole="button"
                  accessibilityLabel={photoUrl ? t('form.changePhoto') : t('form.addPhoto')}
                >
                  {uploading ? (
                    <ActivityIndicator color={c.primary} />
                  ) : photoUrl ? (
                    <>
                      <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      <View style={styles.photoChange}>
                        <Ionicons name="camera" size={14} color={c.onPrimary} />
                        <Text style={styles.photoChangeText}>{t('form.change')}</Text>
                      </View>
                    </>
                  ) : (
                    /* One line: a circled + and the label, per § 15. The
                       "Required" hint that used to sit under it is gone — the
                       box turns danger-red at the edge the moment you try to
                       leave without a photo, and the footer line names what is
                       missing, so the resting state doesn't have to nag. */
                    <View style={styles.photoPickerRow}>
                      <View
                        style={[styles.plus, invalid('photoUrl') && styles.plusInvalid]}
                      >
                        <Ionicons
                          name="add"
                          size={15}
                          color={invalid('photoUrl') ? c.danger : c.primary}
                        />
                      </View>
                      <Text style={styles.photoPickerText}>{t('form.addPhoto')}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              <View onLayout={registerField('title')}>
                <Field
                  label={t('form.title')}
                  value={title}
                  onChangeText={(v) => {
                    setTitle(v)
                    clearError('title')
                  }}
                  placeholder={t('form.titlePlaceholder')}
                  invalid={invalid('title')}
                />
              </View>
              <View onLayout={registerField('description')}>
                <Field
                  label={t('form.description')}
                  value={description}
                  onChangeText={(v) => {
                    setDescription(v)
                    clearError('description')
                  }}
                  placeholder={t('form.descriptionPlaceholder')}
                  multiline
                  invalid={invalid('description')}
                />
              </View>

              <View style={styles.group}>
                <Text style={styles.label}>{t('form.mealtime')}</Text>
                <View style={styles.chipRow}>
                  {MEALTIMES.map((option) => (
                    <Chip
                      key={option}
                      label={mealtimeLabel(option)}
                      active={mealtime === option}
                      // Tapping the active chip clears it — mealtime is optional.
                      onPress={() => setMealtime(mealtime === option ? undefined : option)}
                    />
                  ))}
                </View>
              </View>

              {/* Three equal chips (§ 15), sharing the mealtime row's control
                  rather than a second one that merely looks like it. Equal
                  thirds rather than content-sized: the mockup draws them that
                  way, and it stops "Intermediate" being visibly the widest
                  option on a row where width means nothing. */}
              <View style={styles.group}>
                <Text style={styles.label}>{t('form.difficulty')}</Text>
                <View style={styles.segmented}>
                  {DIFFICULTIES.map((option) => (
                    <Chip
                      key={option}
                      label={difficultyLabel(option)}
                      active={difficulty === option}
                      onPress={() => setDifficulty(option)}
                      style={styles.segment}
                    />
                  ))}
                </View>
              </View>

              {/* Registered as one block: the two fields sit side by side, so a
                  message about either scrolls to the same place. */}
              <View onLayout={registerField('totalMinutes', 'servings')} style={styles.row}>
                {/* Bare numbers as labels, because a Select stores the label it
                    shows — "30 min" would land in the column and fail to parse.
                    The unit is carried by the field label above the trigger. */}
                <Select
                  label={t('form.totalMinutes')}
                  value={totalMinutes || undefined}
                  onChange={(value) => {
                    setTotalMinutes(value ?? '')
                    clearError('totalMinutes')
                  }}
                  options={minuteOptions}
                  placeholder={t('form.totalMinutesPlaceholder')}
                  title={t('form.totalMinutes')}
                  emojiFor={() => '⏱'}
                  // Nine round numbers cover almost every recipe; the rest type
                  // their own, and an already-stored odd time stays editable.
                  allowCustom
                  // Blank fails validation, so "None" would offer an invalid state.
                  clearable={false}
                  containerStyle={styles.rowItem}
                  invalid={invalid('totalMinutes')}
                />
                <Field
                  label={t('form.servings')}
                  value={servings}
                  onChangeText={(v) => {
                    setServings(v)
                    clearError('servings')
                  }}
                  keyboardType="number-pad"
                  placeholder={t('form.servingsPlaceholder')}
                  containerStyle={styles.rowItem}
                  invalid={invalid('servings')}
                />
              </View>

              {/* CUISINE and TOOLS as one 50/50 row of triggers (§ 15). Tools
                  used to be a full-width block — a browse row plus a free-text
                  field — which is two controls and a whole extra screenful for
                  a value most recipes state in two words. The field's job was
                  to reach a tool the picker had never heard of; the picker now
                  offers whatever you type as its own option, so nothing has
                  become unreachable by dropping it. */}
              {/* Both halves register against the row, like MINUTES/SERVINGS
                  above: they share a wrapper, so measuring them separately
                  would record a `y` relative to the row rather than the page. */}
              <View onLayout={registerField('cuisine', 'tools')} style={styles.row}>
                <Select
                  label={t('form.cuisine')}
                  value={cuisine || undefined}
                  onChange={(value) => {
                    setCuisine(value ?? '')
                    clearError('cuisine')
                  }}
                  options={cuisineOptions}
                  placeholder={t('form.cuisinePlaceholder')}
                  title={t('form.cuisine')}
                  searchPlaceholder={t('form.cuisineSearch')}
                  emojiFor={emojiForCuisine}
                  // The column is free text, so the list is a shortcut, not a limit.
                  allowCustom
                  containerStyle={styles.rowItem}
                />
                {/* "Steamer +1": the first tool, then a count of the rest. The
                    column holds a list and the trigger holds one line, so the
                    first name plus how many more is the most of it that fits
                    without lying about what is stored. */}
                <FieldTrigger
                  label={t('form.tools')}
                  value={toolSummary}
                  placeholder={t('form.toolsPlaceholder')}
                  emoji="🍳"
                  invalid={invalid('tools')}
                  onPress={() => setToolPickerOpen(true)}
                  containerStyle={styles.rowItem}
                  accessibilityLabel={`${t('form.tools')}: ${selectedTools.join(', ') || t('form.toolsPlaceholder')}`}
                />
              </View>
            </Page>

            <Page
              ref={pageRefs[1]}
              width={pageWidth}
              contentStyle={styles.content}
              scrollEnabled={!dragging}
            >
              <Text style={styles.stepHeading}>{t('form.ingredientsHeading')}</Text>

              {/* § 16's pantry row: a bordered row with a swatch, a title and
                  its examples in mono caps. The examples are hand-written per
                  language rather than sampled from the list, because the Khmer
                  pantry is different content and not a translation — see
                  `data/usePantry.ts`. */}
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [styles.browse, pressed && styles.browsePressed]}
                accessibilityRole="button"
              >
                <View style={styles.swatch}>
                  <Text style={styles.browseEmoji}>🧄</Text>
                </View>
                <View style={styles.browseText}>
                  <Text style={styles.browseTitle}>{t('form.pickCommon')}</Text>
                  <Text style={styles.browseHint}>{t('form.pickCommonHint')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </Pressable>

              {/* `ADDED · 7`, with the count in the interface's own numerals.
                  Hidden at zero: a heading counting nothing, directly above the
                  line that says the list is empty, says it twice. */}
              {ingredients.length > 0 && (
                <View style={styles.listHeading}>
                  <Text style={styles.listHeadingText}>
                    {`${t('form.added')} · ${n(ingredients.length)}`}
                  </Text>
                  <View style={styles.listHeadingRule} />
                </View>
              )}

              <View
                onLayout={(event) => {
                  ingredientsTop.current = event.nativeEvent.layout.y
                }}
              >
                <Reorderable
                  ids={ingredients.map((i) => i.id)}
                  onReorder={reorderIngredients}
                  onDragChange={setDragging}
                  renderItem={(id, index, handle) => {
                    const ingredient = ingredients[index]
                    if (!ingredient) return null
                    return (
                      <View
                        onLayout={registerNested(ingredientsTop, ingredientKey(ingredient.id))}
                        style={[
                          styles.ingredientRow,
                          invalid(ingredientKey(ingredient.id)) && styles.rowInvalid,
                        ]}
                      >
                        {handle}
                        <Text style={styles.ingredientEmoji}>
                          {emojiForIngredient(ingredient.name)}
                        </Text>
                        <TextInput
                          style={styles.ingredientName}
                          value={ingredient.name}
                          onChangeText={(v) => updateIngredient(ingredient.id, 'name', v)}
                          placeholder={t('form.ingredientPlaceholder')}
                          placeholderTextColor={c.textPlaceholder}
                          keyboardAppearance="light"
                        />
                        {/* Amount and unit, on **two rules rather than one**.
                            § 16 draws them under a single rule so they read as
                            the one value they spell — "500 g" — and that is
                            true of the value and false of the controls: the
                            number is typed and the unit opens a picker, so one
                            rule invited a tap on the half that doesn't take
                            one. Two rules with an even gap say there are two
                            things here before you touch either. Both are fixed
                            widths, so every quantity in the list sits in one
                            column and every unit in the next. */}
                        <View style={styles.amount}>
                          <TextInput
                            style={styles.ingredientQuantity}
                            value={ingredient.quantity}
                            onChangeText={(v) => updateIngredient(ingredient.id, 'quantity', v)}
                            placeholder="0"
                            placeholderTextColor={c.textPlaceholder}
                            keyboardAppearance="light"
                            keyboardType="numeric"
                          />
                          <Pressable
                            onPress={() => setUnitPickerFor(ingredient.id)}
                            style={({ pressed }) => [
                              styles.ingredientUnit,
                              pressed && styles.pressedSoft,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={`${t('unitPicker.title')}: ${ingredient.unit || t('unitPicker.none')}`}
                          >
                            <Text
                              style={[
                                styles.ingredientUnitText,
                                !ingredient.unit && styles.ingredientUnitPlaceholder,
                              ]}
                              numberOfLines={1}
                            >
                              {ingredient.unit || t('form.unitPlaceholder')}
                            </Text>
                          </Pressable>
                        </View>
                        <Pressable
                          onPress={() => removeIngredient(ingredient.id)}
                          hitSlop={10}
                          style={styles.ingredientRemove}
                          accessibilityLabel={`${t('common.delete')} ${ingredient.name || t('form.ingredientPlaceholder')}`}
                        >
                          <Ionicons name="close" size={16} color={c.primary} />
                        </Pressable>
                      </View>
                    )
                  }}
                />
              </View>

              {/* With no rows there's no box to outline, so the hint that's
                  already here turns red rather than a second line appearing. */}
              {ingredients.length === 0 && (
                <Text
                  style={[styles.emptyHint, invalid('ingredients') && styles.emptyHintInvalid]}
                  onLayout={registerField('ingredients')}
                >
                  {t('form.noIngredients')}
                </Text>
              )}
              <Pressable
                onPress={addIngredient}
                style={({ pressed }) => [styles.addRow, pressed && styles.pressedSoft]}
              >
                <View style={styles.plus}>
                  <Ionicons name="add" size={15} color={c.primary} />
                </View>
                <Text style={styles.addRowText}>{t('form.addYourOwn')}</Text>
              </Pressable>
            </Page>

            <Page
              ref={pageRefs[2]}
              width={pageWidth}
              contentStyle={styles.content}
              scrollEnabled={!dragging}
            >
              <Text style={styles.stepHeading}>{t('form.stepsHeading')}</Text>

              <View
                onLayout={(event) => {
                  stepsTop.current = event.nativeEvent.layout.y
                }}
              >
                {/* § 17's card: a .8px border at radius 18, a bare tamarind
                    numeral, the instruction as prose, the timer chip under it,
                    ✕ top-right and the handle bottom-right. The instruction is
                    a borderless input rather than a `Field` — the card is
                    already its frame, and a rule inside one is a second box
                    around the same control. */}
                <Reorderable
                  ids={steps.map((step) => step.id)}
                  onReorder={reorderSteps}
                  onDragChange={setDragging}
                  gap={spacing.md}
                  renderItem={(id, index, handle) => {
                    const item = steps[index]
                    if (!item) return null
                    return (
                      <View
                        onLayout={registerNested(stepsTop, stepKey(item.id))}
                        style={[
                          styles.stepCard,
                          invalid(stepKey(item.id)) && styles.stepCardInvalid,
                        ]}
                      >
                        <View style={styles.stepTop}>
                          <Text style={styles.stepNumberText}>{n(index + 1)}</Text>
                          <TextInput
                            style={styles.stepInput}
                            value={item.instruction}
                            onChangeText={(v) => updateStep(item.id, v)}
                            placeholder={t('form.stepPlaceholder')}
                            placeholderTextColor={c.textPlaceholder}
                            keyboardAppearance="light"
                            multiline
                          />
                          <Pressable
                            onPress={() => removeStep(item.id)}
                            hitSlop={10}
                            style={styles.stepRemove}
                            accessibilityLabel={t('form.removeStep')}
                          >
                            <Ionicons name="close" size={16} color={c.primary} />
                          </Pressable>
                        </View>
                        <View style={styles.stepFoot}>
                          <Pressable
                            onPress={() => setTimerFor(item.id)}
                            accessibilityRole="button"
                            accessibilityLabel={t('form.stepTimer')}
                            style={({ pressed }) => [
                              styles.timerChip,
                              item.durationSeconds == null && styles.timerChipUnset,
                              pressed && styles.pressedSoft,
                            ]}
                          >
                            <Text
                              style={[
                                styles.timerChipText,
                                item.durationSeconds == null && styles.timerChipTextUnset,
                              ]}
                            >
                              {item.durationSeconds == null
                                ? `⏱ ${t('form.addTimer')}`
                                : `⏱ ${n(formatDuration(item.durationSeconds))}`}
                            </Text>
                          </Pressable>
                          {handle}
                        </View>
                      </View>
                    )
                  }}
                />
              </View>

              {steps.length === 0 && (
                <Text
                  style={[styles.emptyHint, invalid('steps') && styles.emptyHintInvalid]}
                  onLayout={registerField('steps')}
                >
                  {t('form.noSteps')}
                </Text>
              )}
              <Pressable
                onPress={addStep}
                style={({ pressed }) => [styles.addRow, pressed && styles.pressedSoft]}
              >
                <View style={styles.plus}>
                  <Ionicons name="add" size={15} color={c.primary} />
                </View>
                <Text style={styles.addRowText}>{t('form.addStep')}</Text>
              </Pressable>
            </Page>

            <Page ref={pageRefs[3]} width={pageWidth} contentStyle={styles.content}>
              {/* Every field here is optional, so this step never blocks Save.
                  The numbers are per serving, and the heading is the only place
                  that now says so — the line that used to sit under it is gone,
                  which is why the Khmer heading was reworded rather than left
                  saying "nutrition information". The columns are bare floats
                  and a reader has no way to tell whether 520 kcal is one plate
                  or the whole tray. */}
              <Text style={styles.stepHeading}>{t('form.nutritionHeading')}</Text>

              <View onLayout={registerField('calories', 'protein')} style={styles.row}>
                <Field
                  label={t('form.calories')}
                  value={calories}
                  onChangeText={(v) => {
                    setCalories(v)
                    clearError('calories')
                  }}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  suffix="kcal"
                  containerStyle={styles.rowItem}
                  invalid={invalid('calories')}
                />
                <Field
                  label={t('form.protein')}
                  value={protein}
                  onChangeText={(v) => {
                    setProtein(v)
                    clearError('protein')
                  }}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  suffix="g"
                  containerStyle={styles.rowItem}
                  invalid={invalid('protein')}
                />
              </View>

              <View onLayout={registerField('carbs', 'fat')} style={styles.row}>
                <Field
                  label={t('form.carbs')}
                  value={carbs}
                  onChangeText={(v) => {
                    setCarbs(v)
                    clearError('carbs')
                  }}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  suffix="g"
                  containerStyle={styles.rowItem}
                  invalid={invalid('carbs')}
                />
                <Field
                  label={t('form.fat')}
                  value={fat}
                  onChangeText={(v) => {
                    setFat(v)
                    clearError('fat')
                  }}
                  keyboardType="decimal-pad"
                  placeholder="—"
                  suffix="g"
                  containerStyle={styles.rowItem}
                  invalid={invalid('fat')}
                />
              </View>
            </Page>
          </ScrollView>
        )}
      </View>

      {/* A pointer, not the message itself: the wording that says what to change
          lives under the field. This only says how many, and that they're above. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {footerMessage && (
          <View style={styles.footerError}>
            <Ionicons name="alert-circle" size={15} color={c.danger} />
            <Text style={styles.error}>{footerMessage}</Text>
          </View>
        )}
        {/* One button, always. Back used to sit beside it from page 2 on, which
            was a control for a journey the pager already makes with a finger —
            you swipe right, or tap the step in the strip above, and both of
            those are reachable from every page rather than only from the ones
            after the first. Two buttons also halved the width of the one that
            names where it goes, which is the only thing the footer has to
            say. */}
        <View style={styles.footerButtons}>
          {onLastStep ? (
            <PrimaryButton
              label={t(submitLabel)}
              onPress={handleSubmit}
              loading={submitting}
              disabled={uploading}
              style={styles.footerButton}
            />
          ) : (
            /* "NEXT · INGREDIENTS" — the button names where it goes, in the
               same words the tab above uses for that page. Built from
               `STEP_KEYS` rather than from strings of its own, so the two can
               never disagree about what a page is called.

               Editing now gets the same footer as creating. It used to show
               Save on every page, which was the only way to save an edit from
               page 1; the header's SAVE covers that from anywhere in both
               modes, which leaves the footer free to do one job. */
            <PrimaryButton
              label={`${t('common.next')} · ${t(STEP_KEYS[step + 1])}`}
              onPress={handleNext}
              style={styles.footerButton}
            />
          )}
        </View>
      </View>

      <IngredientPicker
        visible={pickerOpen}
        selectedNames={ingredients.map((i) => i.name)}
        onAdd={addCommonIngredient}
        onRemove={removeCommonIngredient}
        onClose={() => setPickerOpen(false)}
      />

      <ToolPicker
        visible={toolPickerOpen}
        selectedNames={selectedTools}
        onAdd={addTool}
        onRemove={removeTool}
        onClose={() => setToolPickerOpen(false)}
      />

      {/* One instance for the whole form, like the unit picker — `timerFor`
          says which step it is editing, and reopening it shows that step's
          current value rather than the last one picked. */}
      <TimerPicker
        visible={timerFor !== null}
        value={steps.find((s) => s.id === timerFor)?.durationSeconds ?? null}
        onPick={(seconds) => timerFor && setStepTimer(timerFor, seconds)}
        onClose={() => setTimerFor(null)}
      />

      {/* One instance for the whole form; `unitPickerFor` says which row it's
          editing. `value` reads back out of state, so reopening it shows the
          unit currently on that row rather than the one last picked. */}
      <UnitPicker
        visible={unitPickerFor !== null}
        value={ingredients.find((i) => i.id === unitPickerFor)?.unit ?? ''}
        onSelect={(unit) => unitPickerFor && updateIngredient(unitPickerFor, 'unit', unit)}
        onClose={() => setUnitPickerFor(null)}
      />
    </KeyboardAvoidingView>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  // The header's SAVE (§ 14). Mono and tracked like the title beside it, and
  // tamarind because it is the screen's primary action — the only coloured
  // text in the chrome.
  headerAction: {
    ...type.sectionLabel,
    color: c.primary,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  indicator: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
  },
  indicatorItem: { flex: 1, gap: spacing.sm },
  indicatorBar: { height: 3, borderRadius: radius.pill, backgroundColor: c.border },
  // Passes validation, but you're somewhere else — a step further down the
  // contrast scale than the one you're on, so it never competes with it.
  indicatorBarComplete: { backgroundColor: c.borderStrong },
  // The page you are actually looking at. Applied last of the three so it wins.
  indicatorBarCurrent: { backgroundColor: c.primary },
  indicatorBarError: { backgroundColor: c.danger },
  indicatorLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  indicatorLabel: { ...type.metadataSmall, color: c.textPlaceholder, textTransform: 'uppercase' },
  // Weight, not just colour: on the current step the bar goes red when that
  // step has errors, so position has to stay readable without it.
  //
  // The weight comes from a **face**, not from `fontWeight: '700'`. A synthetic
  // weight stacked on a family that already names one double-bolds on Android
  // and web. `sectionLabel` is the medium member of whichever scale is active —
  // `IBMPlexMono_500Medium` in Latin, `KantumruyPro_500Medium` in Khmer — so
  // naming a family literally here would put a Khmer-less mono on Khmer text.
  indicatorLabelActive: { color: c.text, fontFamily: type.sectionLabel.fontFamily },
  indicatorLabelError: { color: c.danger },
  // Holds the pager and supplies the width each page measures itself against.
  pagerWrap: { flex: 1 },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
    // `sectionSpacing`, not `xl`. One group to the next is the same beat as one
    // section to the next everywhere else in the product, and the design states
    // that as 16–22 — `xl` (24) sat outside its own range, which is most of why
    // a page of four short groups read as mostly air.
    gap: spacing.sectionSpacing,
    paddingBottom: spacing.xxl,
  },
  stepHeading: { ...type.screenTitle, color: c.text, marginBottom: spacing.xs },
  /**
   * A dashed edge and no fill, per SCREENS.md § 15 — but tall enough to be a
   * preview slot as well as a drop target.
   *
   * § 15 draws it at 76, and 76 was right while it was only ever a place to
   * *drop* a photo: the old 180pt oat panel took a third of the first page for
   * something most people fill in seconds. It is also where the chosen
   * photograph is shown, though, and a 76pt letterbox of a plate is not a
   * preview of anything — on a photo-first app whose every card layout leads
   * with the picture, the one screen that makes the picture can't be the screen
   * that hides it. 160 gives a landscape shot roughly 5:2 at gutter width,
   * which is a photograph rather than a strip, and still less than half of what
   * the panel it replaced was costing.
   */
  photoPicker: {
    height: 160,
    borderRadius: radius.notice,
    borderWidth: 1,
    borderColor: c.borderFaint,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  // No `dangerSoft` fill: there is no alert red in this palette, so an invalid
  // photo box is marked by its edge alone, like an invalid `Field`'s rule.
  photoPickerInvalid: { borderColor: c.danger },
  photoPickerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoPickerText: { ...type.metadataSmall, color: c.textMuted, textTransform: 'uppercase' },
  /**
   * The circled `+` the mockup puts on all three dashed affordances — the photo
   * drop, ADD YOUR OWN, ADD STEP. A ring rather than a filled disc: these are
   * offers, and a filled tamarind circle would outrank the page's actual
   * primary action at the bottom of the screen.
   */
  plus: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusInvalid: { borderColor: c.danger },
  photoChange: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: c.scrim,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  // `textOnPhoto`, not `onPrimary`. This sits on a scrim over the photograph,
  // not on a primary fill — it only ever looked right because `onPrimary` was
  // white too. It stopped being white when `primary` became the bright green,
  // and ink on a 55%-black scrim is unreadable.
  photoChangeText: { ...type.caption, color: c.textOnPhoto },
  group: { gap: spacing.sm },
  label: { ...type.sectionLabel, color: c.textMuted, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  segmented: { flexDirection: 'row', gap: spacing.sm },
  // Equal thirds. `Chip` is content-sized by default, which is right in the
  // mealtime row (four options of very different lengths) and wrong here,
  // where the three are one choice and the mockup draws them as one bar.
  segment: { flex: 1, alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  browse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1.2,
    borderColor: c.text,
  },
  browsePressed: { opacity: 0.6 },
  // § 16's 26px swatch. The mockup draws a plain disc — a placeholder for
  // "something identifying the pantry" — and the app already has the honest
  // version of that: the emoji it puts beside every ingredient.
  swatch: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseEmoji: { fontSize: 15 },
  browseText: { flex: 1, minWidth: 0, gap: 2 },
  browseTitle: { ...type.rowTitle, color: c.text },
  browseHint: { ...type.metadataSmall, color: c.textMuted, textTransform: 'uppercase' },
  // `ADDED · 7`, with a rule running off to the right — the same ruled
  // section head the rest of the product uses.
  listHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  listHeadingText: { ...type.sectionLabel, color: c.textMuted, textTransform: 'uppercase' },
  listHeadingRule: { flex: 1, height: 0.8, backgroundColor: c.border },
  // Everything but the name is a fixed width, and the name flexes into what's
  // left — so the row can never wrap, however narrow the phone.
  /**
   * A ruled row, not a card (§ 16). The bordered, filled container this used
   * to be turned seven ingredients into seven outlined boxes, which is the
   * shape the *method* cards are supposed to be the exception to — and every
   * other list in this product is a ledger.
   *
   * The hairline is on the bottom, so the last row's line closes the list
   * against ADD YOUR OWN below it.
   */
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: minHeights.row,
    paddingVertical: 10,
    borderBottomWidth: 0.8,
    borderBottomColor: c.border,
  },
  ingredientEmoji: { fontSize: 16, width: 20, textAlign: 'center' },
  /**
   * Amount and unit, each on its own rule.
   *
   * The wrapper carried the rule when there was one, spanning both controls.
   * Now it only holds them apart: `spacing.sm` between the two, which is wide
   * enough to read as a gap rather than as a break in one line, and
   * `flex-end` so the two rules land on the same baseline however tall either
   * control grows.
   */
  amount: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  ingredientName: {
    flex: 1,
    minWidth: 0,
    // `inputType`, not the bare token: a pinned line box on a one-line input
    // clips its descenders, and `paddingVertical: 0` leaves nowhere to overshoot.
    ...inputType(type.bodyLarge),
    color: c.text,
    paddingVertical: 0,
  },
  // Centred under its own rule rather than right-aligned against a shared one:
  // the rule is the column now, and a number hugging its right-hand end reads
  // as leaning towards the unit it was just separated from. The width is fixed,
  // which is what puts every quantity in the list on one column.
  ingredientQuantity: {
    width: 40,
    minHeight: 30,
    textAlign: 'center',
    ...inputType(type.bodyLarge),
    color: c.text,
    paddingVertical: 0,
    paddingBottom: 2,
    borderBottomWidth: 0.8,
    borderBottomColor: c.borderStrong,
  },
  // A tap target rather than an input, but the same 46pt as when it was one.
  // The three fixed widths are what stop this row wrapping onto a second line,
  // so nothing here is free to grow — which is also why the unit is a step
  // below the name and quantity, and why it carries no chevron.
  // `minHeight`, never a fixed `height`: the Khmer scale pins no `lineHeight`,
  // so a cluster carrying a subscript reports a taller line box than 34 and a
  // hard height either clips it or shoves the ink off the row's centre line.
  // Same rule the rest of the app follows for Khmer in fixed-height containers.
  ingredientUnit: {
    width: 50,
    minHeight: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 2,
    borderBottomWidth: 0.8,
    borderBottomColor: c.borderStrong,
  },
  // Text now, not the input itself, so `numberOfLines` can truncate a long
  // custom unit instead of the row growing to fit it.
  // Mono, like the quantity beside it: this half of the value is a unit, and
  // § 16 sets the pair in one face.
  ingredientUnitText: { ...type.metadata, color: c.textMuted, textAlign: 'center' },
  ingredientUnitPlaceholder: { color: c.textPlaceholder },
  ingredientRemove: { width: 22, alignItems: 'center', justifyContent: 'center' },
  /**
   * § 17's step card: a .8px border at radius 18, holding the numeral, the
   * instruction, the timer chip and the two controls.
   *
   * A box, on a screen whose other page is deliberately box-free — and that
   * contrast is the point. An ingredient is one line and belongs in a ledger;
   * a step is a paragraph, and three of them running together with only a
   * hairline between would be a wall of prose with numbers in it.
   */
  stepCard: {
    borderWidth: 0.8,
    borderColor: c.border,
    borderRadius: 18,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  // The card's own edge carries the error, like the photo drop's does.
  stepCardInvalid: { borderColor: c.danger },
  stepTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  // The timer chip and the drag handle share the card's bottom line, at
  // opposite ends — the chip is the thing you might want, the handle the thing
  // you occasionally need.
  stepFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepRemove: { width: 22, alignItems: 'center', justifyContent: 'center' },
  // § 17's set state: a filled tamarind pill at .1, tamarind mono label.
  timerChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: c.accentSoft,
  },
  // And its unset state: a dashed outline at half strength. Dashed is the app's
  // "not filled in yet" idiom — the same edge `AddRow` uses for an empty slot —
  // so an untimed step reads as an offer rather than as a blank field.
  timerChipUnset: {
    backgroundColor: 'transparent',
    borderWidth: 0.8,
    borderStyle: 'dashed',
    borderColor: c.borderFaint,
  },
  timerChipText: { ...type.metadataSmall, color: c.primary },
  timerChipTextUnset: { color: c.textMuted },
  pressedSoft: { opacity: 0.6 },
  stepNumber: {
    width: sizes.stepNumber,
    height: sizes.stepNumber,
    borderRadius: radius.pill,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  /**
   * A bare tamarind numeral, not a filled disc. The disc was a hangover from
   * the old palette; § 17 sets the number itself in tamarind and lets the card
   * do the containing. Mono, so 1 and 10 occupy the same column and the
   * instructions beside them start on one line.
   *
   * A fixed width rather than a margin, for that alignment — and `n()` at the
   * call site, so a Khmer reader counts in Khmer numerals.
   */
  stepNumberText: { ...type.metadata, color: c.primary, width: 18 },
  // Borderless: the card is the frame. `textAlignVertical` keeps the first
  // line level with the numeral on Android, where a multiline input otherwise
  // centres its text in whatever height it has grown to.
  stepInput: {
    flex: 1,
    minWidth: 0,
    ...inputType(type.bodyLarge),
    color: c.text,
    paddingVertical: 0,
    textAlignVertical: 'top',
  },
  // Edge only, no fill — the rule this product follows everywhere an input is
  // wrong (the photo drop, a `Field`, a step card). The tinted band this used
  // to draw belonged to the boxed row it was written for; on a ledger row it
  // would paint a stripe across the page.
  rowInvalid: { borderBottomWidth: 1.2, borderBottomColor: c.danger },
  emptyHint: { ...type.body, color: c.textMuted, paddingVertical: spacing.sm },
  emptyHintInvalid: { color: c.danger },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.borderFaint,
    borderRadius: radius.notice,
  },
  addRowText: { ...type.sectionLabel, color: c.primary, textTransform: 'uppercase' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.bg,
  },
  footerError: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  error: { ...type.body, color: c.danger, flex: 1 },
  footerButtons: { flexDirection: 'row', gap: spacing.sm },
  footerButton: { flex: 1 },
})
