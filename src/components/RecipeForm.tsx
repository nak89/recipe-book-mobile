import { createRef, forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useHeaderHeight } from '@react-navigation/elements'
import { useNavigation } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
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
import type { FieldErrors } from '@/lib/recipeValidation'
import { foldForCompare } from '@/lib/text'
import { useT } from '@/i18n'
import type { StringKey } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useDifficultyLabel, useMealtimeLabel } from '@/i18n/labels'
import Chip from '@/components/ui/Chip'
import Field from '@/components/ui/Field'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Select from '@/components/ui/Select'
import IngredientPicker from '@/components/IngredientPicker'
import ToolPicker from '@/components/ToolPicker'
import UnitPicker from '@/components/UnitPicker'
import { emojiForIngredient } from '@/data/ingredients'
import type { CommonIngredient } from '@/data/ingredients'
import { emojiForCuisine } from '@/data/cuisines'
import { useCuisines } from '@/data/usePantry'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
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
  { width: number; contentStyle: StyleProp<ViewStyle>; children: ReactNode }
>(function Page({ width, contentStyle, children }, ref) {
  return (
    <ScrollView
      ref={ref}
      style={{ width }}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
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
function toNullableNumber(raw: string): number | null {
  const value = raw.trim()
  if (!value) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
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
    return [{ id: genId(), instruction: '' }]
  }
  return [...recipe.steps]
    .sort((a, b) => a.stepNumber - b.stepNumber)
    .map((s) => ({ id: s.id ?? genId(), instruction: s.instruction }))
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
  const { colors: c, isDark } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const mealtimeLabel = useMealtimeLabel()
  const difficultyLabel = useDifficultyLabel()
  const { token } = useAuth()
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const navigation = useNavigation()
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
  // The id of the ingredient row whose unit is being picked, or null. One picker
  // instance serves every row — mounting one per row would put a Modal behind
  // each of up to a hundred ingredients.
  const [unitPickerFor, setUnitPickerFor] = useState<string | null>(null)
  const [takenTitles, setTakenTitles] = useState<Set<string>>(new Set())

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

  // Variadic because side-by-side fields share one wrapper: measuring them
  // separately would record a y relative to the row rather than to the scroll
  // content, so both names point at the row they're actually in.
  function registerField(...names: string[]) {
    return (event: LayoutChangeEvent) => {
      for (const name of names) fieldOffsets.current[name] = event.nativeEvent.layout.y
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
    setSteps((prev) => [...prev, { id: genId(), instruction: '' }])
    clearError('steps')
    scrollToBottom()
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id))
    clearError(stepKey(id))
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
    const stepErrors = validateStep(step, currentValues(), t)
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
      const stepErrors = validateStep(i, currentValues(), t)
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
      totalMinutes: Number(totalMinutes.trim()),
      servings: Number(servings.trim()),
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
        quantity: Number(i.quantity.trim().replace(',', '.')) || 0,
        unit: i.unit.trim(),
      })),
      steps: submittedSteps.map((s, index) => ({
        stepNumber: index + 1,
        instruction: s.instruction.trim(),
      })),
    }

    // Size is a property of the whole recipe, so there's no field to outline —
    // this one is the footer line's job.
    const tooLarge = recipeSizeError(data, t)
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
  const footerMessage = submitError ?? summarise(errors, t)

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
      (index) => Object.keys(validateStep(index, stepValues, t)).length === 0
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
                    <>
                      <Ionicons
                        name="camera-outline"
                        size={26}
                        color={invalid('photoUrl') ? c.danger : c.textPlaceholder}
                      />
                      <Text style={styles.photoPickerText}>{t('form.addPhoto')}</Text>
                      <Text style={styles.photoPickerHint}>{t('form.required')}</Text>
                    </>
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

              <View style={styles.group}>
                <Text style={styles.label}>{t('form.difficulty')}</Text>
                <View style={styles.segmented}>
                  {DIFFICULTIES.map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.segment, difficulty === option && styles.segmentActive]}
                      onPress={() => setDifficulty(option)}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          difficulty === option && styles.segmentTextActive,
                        ]}
                      >
                        {difficultyLabel(option)}
                      </Text>
                    </Pressable>
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
              />
              {/* The label heads the whole block rather than the input, because
                  the browse row belongs to it too — same bargain as the
                  ingredients step: tap the common ones, type the rest below.
                  `Recipe.tools` is free text, so the list can't be a closed set
                  and the field has to stay. */}
              <View onLayout={registerField('tools')} style={styles.group}>
                <Text style={styles.label}>{t('form.tools')}</Text>
                <Pressable
                  onPress={() => setToolPickerOpen(true)}
                  style={({ pressed }) => [styles.browse, pressed && styles.browsePressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.browseEmoji}>🍳</Text>
                  <View style={styles.browseText}>
                    <Text style={styles.browseTitle}>{t('form.pickTools')}</Text>
                    <Text style={styles.browseHint}>{t('form.pickToolsHint')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                </Pressable>
                <Field
                  value={tools}
                  onChangeText={(v) => {
                    setTools(v)
                    clearError('tools')
                  }}
                  placeholder={t('form.toolsPlaceholder')}
                  hint={t('form.toolsHint')}
                  invalid={invalid('tools')}
                />
              </View>
            </Page>

            <Page ref={pageRefs[1]} width={pageWidth} contentStyle={styles.content}>
              <Text style={styles.stepHeading}>{t('form.ingredientsHeading')}</Text>

              <Pressable
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => [styles.browse, pressed && styles.browsePressed]}
                accessibilityRole="button"
              >
                <Text style={styles.browseEmoji}>🧄</Text>
                <View style={styles.browseText}>
                  <Text style={styles.browseTitle}>{t('form.pickCommon')}</Text>
                  <Text style={styles.browseHint}>{t('form.pickCommonHint')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </Pressable>

              {/* One bordered row holding two borderless inputs and the unit's
                  tap target, rather than three separate Fields — fixed widths
                  and a single container are what keep the unit on the same line
                  as the name on a phone. */}
              {ingredients.map((ingredient) => (
                <View
                  key={ingredient.id}
                  onLayout={registerField(ingredientKey(ingredient.id))}
                  style={[
                    styles.ingredientRow,
                    invalid(ingredientKey(ingredient.id)) && styles.rowInvalid,
                  ]}
                >
                  <Text style={styles.ingredientEmoji}>{emojiForIngredient(ingredient.name)}</Text>
                  <TextInput
                    style={styles.ingredientName}
                    value={ingredient.name}
                    onChangeText={(v) => updateIngredient(ingredient.id, 'name', v)}
                    placeholder={t('form.ingredientPlaceholder')}
                    placeholderTextColor={c.textPlaceholder}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                  />
                  <View style={styles.ingredientDivider} />
                  <TextInput
                    style={styles.ingredientQuantity}
                    value={ingredient.quantity}
                    onChangeText={(v) => updateIngredient(ingredient.id, 'quantity', v)}
                    placeholder="0"
                    placeholderTextColor={c.textPlaceholder}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    keyboardType="numeric"
                  />
                  {/* Tap to pick, rather than type. No chevron and no border:
                      the 46pt is the row's whole remaining budget, and spending
                      any of it on an affordance is what makes the row wrap. The
                      picker keeps a free-text row, so nothing is unreachable. */}
                  <Pressable
                    onPress={() => setUnitPickerFor(ingredient.id)}
                    style={({ pressed }) => [
                      styles.ingredientUnit,
                      pressed && styles.ingredientUnitPressed,
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
                  <Pressable
                    onPress={() => removeIngredient(ingredient.id)}
                    hitSlop={10}
                    style={styles.ingredientRemove}
                    accessibilityLabel={`${t('common.delete')} ${ingredient.name || t('form.ingredientPlaceholder')}`}
                  >
                    <Ionicons name="close" size={16} color={c.textMuted} />
                  </Pressable>
                </View>
              ))}
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
              <Pressable onPress={addIngredient} style={styles.addRow}>
                <Ionicons name="add-circle-outline" size={18} color={c.text} />
                <Text style={styles.addRowText}>{t('form.addYourOwn')}</Text>
              </Pressable>
            </Page>

            <Page ref={pageRefs[2]} width={pageWidth} contentStyle={styles.content}>
              <Text style={styles.stepHeading}>{t('form.stepsHeading')}</Text>

              {steps.map((s, index) => (
                <View key={s.id} onLayout={registerField(stepKey(s.id))} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Field
                    value={s.instruction}
                    onChangeText={(v) => updateStep(s.id, v)}
                    placeholder={t('form.stepPlaceholder')}
                    multiline
                    containerStyle={styles.stepInput}
                    invalid={invalid(stepKey(s.id))}
                  />
                  <Pressable
                    onPress={() => removeStep(s.id)}
                    hitSlop={8}
                    style={[styles.remove, styles.removeStep]}
                    accessibilityLabel={t('form.removeStep')}
                  >
                    <Ionicons name="close" size={18} color={c.danger} />
                  </Pressable>
                </View>
              ))}
              {steps.length === 0 && (
                <Text
                  style={[styles.emptyHint, invalid('steps') && styles.emptyHintInvalid]}
                  onLayout={registerField('steps')}
                >
                  {t('form.noSteps')}
                </Text>
              )}
              <Pressable onPress={addStep} style={styles.addRow}>
                <Ionicons name="add-circle-outline" size={18} color={c.text} />
                <Text style={styles.addRowText}>{t('form.addStep')}</Text>
              </Pressable>
            </Page>

            <Page ref={pageRefs[3]} width={pageWidth} contentStyle={styles.content}>
              {/* Every field here is optional, so this step never blocks Save. The
                  numbers are per serving — say so, because nothing else can: the
                  columns are bare floats and a reader has no way to tell whether
                  520 kcal is one plate or the whole tray. */}
              <Text style={styles.stepHeading}>{t('form.nutritionHeading')}</Text>
              <Text style={styles.stepIntro}>
                {t('form.nutritionIntro')}
              </Text>

              <View onLayout={registerField('calories', 'protein')} style={styles.row}>
                <Field
                  label={t('form.calories')}
                  value={calories}
                  onChangeText={(v) => {
                    setCalories(v)
                    clearError('calories')
                  }}
                  keyboardType="decimal-pad"
                  placeholder={t('form.caloriesPlaceholder')}
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
                  placeholder={t('form.proteinPlaceholder')}
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
                  placeholder={t('form.carbsPlaceholder')}
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
                  placeholder={t('form.fatPlaceholder')}
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
        <View style={styles.footerButtons}>
          {step > 0 && !isEditing && (
            <PrimaryButton
              label={t('common.back')}
              variant="outline"
              onPress={() => goTo(step - 1)}
              style={styles.footerButton}
            />
          )}
          {isEditing || onLastStep ? (
            <PrimaryButton
              label={t(submitLabel)}
              onPress={handleSubmit}
              loading={submitting}
              disabled={uploading}
              style={styles.footerButton}
            />
          ) : (
            <PrimaryButton label={t('common.next')} onPress={handleNext} style={styles.footerButton} />
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
  indicator: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  indicatorItem: { flex: 1, gap: spacing.sm },
  indicatorBar: { height: 3, borderRadius: radius.pill, backgroundColor: c.border },
  // Passes validation, but you're somewhere else — a step further down the
  // contrast scale than the one you're on, so it never competes with it.
  indicatorBarComplete: { backgroundColor: c.borderStrong },
  // The page you are actually looking at. Applied last of the three so it wins.
  indicatorBarCurrent: { backgroundColor: c.primary },
  indicatorBarError: { backgroundColor: c.danger },
  indicatorLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  indicatorLabel: { ...type.caption, color: c.textPlaceholder },
  // Weight, not just colour: on the current step the bar goes red when that
  // step has errors, so position has to stay readable without it.
  indicatorLabelActive: { color: c.text, fontWeight: '700' },
  indicatorLabelError: { color: c.danger },
  // Holds the pager and supplies the width each page measures itself against.
  pagerWrap: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  stepHeading: { ...type.title, color: c.text, marginBottom: spacing.xs },
  // Pulled up against the heading: the content gap is `lg`, which reads as two
  // unrelated lines rather than a heading and its subtitle.
  stepIntro: { ...type.body, color: c.textMuted, marginTop: -spacing.md },
  photoPicker: {
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  photoPickerInvalid: { borderColor: c.danger, backgroundColor: c.dangerSoft },
  photoPickerText: { ...type.bodyStrong, color: c.textMuted },
  photoPickerHint: { ...type.caption, color: c.textPlaceholder },
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
  label: { ...type.label, color: c.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  segmented: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: c.primary, borderColor: c.primary },
  segmentText: { ...type.caption, color: c.textMuted },
  segmentTextActive: { color: c.onPrimary },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  browse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSubtle,
  },
  browsePressed: { backgroundColor: c.surfaceAlt },
  browseEmoji: { fontSize: 22 },
  browseText: { flex: 1, minWidth: 0, gap: 2 },
  browseTitle: { ...type.bodyStrong, color: c.text },
  browseHint: { ...type.caption, color: c.textMuted },
  // Everything but the name is a fixed width, and the name flexes into what's
  // left — so the row can never wrap, however narrow the phone.
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.md,
  },
  ingredientEmoji: { fontSize: 18, width: 22, textAlign: 'center' },
  ingredientName: {
    flex: 1,
    minWidth: 0,
    ...type.bodyLarge,
    color: c.text,
    paddingVertical: 0,
  },
  ingredientDivider: { width: 1, height: 20, backgroundColor: c.borderStrong },
  ingredientQuantity: {
    width: 40,
    textAlign: 'right',
    ...type.bodyLarge,
    color: c.text,
    paddingVertical: 0,
  },
  // A tap target rather than an input, but the same 46pt as when it was one.
  // The three fixed widths are what stop this row wrapping onto a second line,
  // so nothing here is free to grow — which is also why the unit is a step
  // below the name and quantity, and why it carries no chevron.
  ingredientUnit: {
    width: 46,
    height: 34,
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  ingredientUnitPressed: { backgroundColor: c.surfaceSunken },
  // Text now, not the input itself, so `numberOfLines` can truncate a long
  // custom unit instead of the row growing to fit it.
  ingredientUnitText: { ...type.body, color: c.textMuted },
  ingredientUnitPlaceholder: { color: c.textPlaceholder },
  ingredientRemove: { width: 20, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  stepNumberText: { ...type.caption, color: c.onPrimary },
  stepInput: { flex: 1, minWidth: 0 },
  remove: { width: 30, height: 50, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Steps use a multiline input, so nudge the ✕ to line up with its first row.
  removeStep: { marginTop: spacing.xs },
  rowInvalid: { borderColor: c.danger, backgroundColor: c.dangerSoft },
  emptyHint: { ...type.body, color: c.textMuted, paddingVertical: spacing.sm },
  emptyHintInvalid: { color: c.danger },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  addRowText: { ...type.bodyStrong, color: c.text },
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
