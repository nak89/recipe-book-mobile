import { useEffect, useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { useHeaderHeight } from '@react-navigation/elements'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { LayoutChangeEvent } from 'react-native'
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
import Chip from '@/components/ui/Chip'
import Field from '@/components/ui/Field'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Select from '@/components/ui/Select'
import IngredientPicker from '@/components/IngredientPicker'
import { emojiForIngredient } from '@/data/ingredients'
import type { CommonIngredient } from '@/data/ingredients'
import { CUISINES, emojiForCuisine } from '@/data/cuisines'
import { radius, spacing, type, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'
import { DIFFICULTIES, MEALTIMES } from '@/types/recipe'
import type {
  Difficulty,
  FormIngredient,
  FormStep,
  Mealtime,
  Recipe,
  RecipeInput,
} from '@/types/recipe'

const STEPS = ['Basics', 'Ingredients', 'Steps', 'Nutrition'] as const

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

// Hoisted so the reference is stable — Select memoises on it.
const CUISINE_OPTIONS = CUISINES.map((c) => ({ label: c.name, emoji: c.emoji }))

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
 * Three steps, one component. All the form state lives here rather than across
 * three routes, so a back gesture can't lose a half-filled recipe and there's a
 * single submit at the end.
 *
 * Creating is linear — you advance as each step validates. Editing makes the
 * step indicator tappable and keeps Save available everywhere, because fixing a
 * typo shouldn't cost two taps of "Next".
 */
export default function RecipeForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial?: Recipe
  onSubmit: (data: RecipeInput) => Promise<void>
  submitLabel: string
}) {
  const { colors: c, isDark } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const { token } = useAuth()
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const scrollRef = useRef<ScrollView>(null)
  const isEditing = initial !== undefined

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
  const [takenTitles, setTakenTitles] = useState<Set<string>>(new Set())

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
          new Set(
            list.filter((r) => r.id !== initial?.id).map((r) => r.title.trim().toLowerCase())
          )
        )
      })
      .catch(() => {
        // Non-fatal: the 409 from the server is the backstop.
      })
    return () => {
      cancelled = true
    }
  }, [token, initial?.id])

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
    // Deferred: after a step change the target hasn't been laid out yet, so its
    // offset isn't recorded until the next frame.
    setTimeout(() => {
      const y = name ? fieldOffsets.current[name] : undefined
      scrollRef.current?.scrollTo({ y: Math.max((y ?? 0) - spacing.xl, 0), animated: true })
    }, 60)
  }

  // Keeps a newly added row above the keyboard instead of behind it.
  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
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

  /** Shows a set of errors, moving to the step that owns the first one. */
  function showErrors(next: FieldErrors, targetStep: number) {
    setErrors(next)
    setSubmitError(null)
    if (targetStep !== step) setStep(targetStep)
    scrollToField(Object.keys(next)[0])
  }

  async function handlePickPhoto() {
    // Web has no media-library permission model — the browser file picker handles it.
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        setErrors((prev) => ({
          ...prev,
          photoUrl: 'Allow photo library access to add a photo.',
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
        photoUrl: err instanceof Error ? err.message : 'That photo could not be uploaded.',
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

  function goTo(index: number) {
    setSubmitError(null)
    setStep(index)
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }

  /**
   * Advancing is what enforces the rules while creating. Validating here rather
   * than only at Save is the point: an error about total minutes is useless on
   * the Steps screen, where the field isn't even visible.
   */
  function handleNext() {
    const stepErrors = validateStep(step, currentValues())
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
    for (let i = 0; i < STEPS.length; i++) {
      const stepErrors = validateStep(i, currentValues())
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
    const tooLarge = recipeSizeError(data)
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
        showErrors({ title: 'You already have a recipe with this title.' }, 0)
        return
      }

      const mapped: FieldErrors = {}
      for (const issue of err.details) {
        const field = fieldForServerIssue(issue.field, ingredientIds, stepIds)
        if (field && !mapped[field]) mapped[field] = issue.message
      }
      if (Object.keys(mapped).length > 0) {
        showErrors(mapped, stepForField(Object.keys(mapped)[0]))
        return
      }
    }
    setSubmitError(err instanceof Error ? err.message : 'Could not save this recipe. Please try again.')
  }

  const onLastStep = step === STEPS.length - 1
  // Key presence, not truthiness: most entries are '' because the outline is
  // the whole message.
  const invalid = (field: string) => field in errors
  const stepsWithErrors = new Set(Object.keys(errors).map(stepForField))
  const footerMessage = submitError ?? summarise(errors)

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <View style={styles.indicator}>
        {STEPS.map((label, index) => {
          const reachable = isEditing || index <= step
          return (
            <Pressable
              key={label}
              // Linear while creating: jumping ahead would skip validation.
              disabled={!reachable}
              onPress={() => goTo(index)}
              style={styles.indicatorItem}
            >
              <View
                style={[
                  styles.indicatorBar,
                  index <= step && styles.indicatorBarActive,
                  // A step you're not looking at can still be the broken one.
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
                  {label}
                </Text>
                {stepsWithErrors.has(index) && (
                  <Ionicons name="alert-circle" size={13} color={c.danger} />
                )}
              </View>
            </Pressable>
          )
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <>
            <View onLayout={registerField('photoUrl')}>
              <Pressable
                style={[styles.photoPicker, invalid('photoUrl') && styles.photoPickerInvalid]}
                onPress={handlePickPhoto}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel={photoUrl ? 'Change photo' : 'Add a photo'}
              >
                {uploading ? (
                  <ActivityIndicator color={c.primary} />
                ) : photoUrl ? (
                  <>
                    <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    <View style={styles.photoChange}>
                      <Ionicons name="camera" size={14} color={c.onPrimary} />
                      <Text style={styles.photoChangeText}>Change</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="camera-outline"
                      size={26}
                      color={invalid('photoUrl') ? c.danger : c.textPlaceholder}
                    />
                    <Text style={styles.photoPickerText}>Add a photo</Text>
                    <Text style={styles.photoPickerHint}>Required</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View onLayout={registerField('title')}>
              <Field
                label="Title"
                value={title}
                onChangeText={(v) => {
                  setTitle(v)
                  clearError('title')
                }}
                placeholder="e.g. Spaghetti Carbonara"
                invalid={invalid('title')}
              />
            </View>
            <View onLayout={registerField('description')}>
              <Field
                label="Description"
                value={description}
                onChangeText={(v) => {
                  setDescription(v)
                  clearError('description')
                }}
                placeholder="e.g. Classic Italian pasta with egg and pancetta"
                multiline
                invalid={invalid('description')}
              />
            </View>

            <View style={styles.group}>
              <Text style={styles.label}>Mealtime</Text>
              <View style={styles.chipRow}>
                {MEALTIMES.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    active={mealtime === option}
                    // Tapping the active chip clears it — mealtime is optional.
                    onPress={() => setMealtime(mealtime === option ? undefined : option)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.group}>
              <Text style={styles.label}>Difficulty</Text>
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
                      {option}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Registered as one block: the two fields sit side by side, so a
                message about either scrolls to the same place. */}
            <View onLayout={registerField('totalMinutes', 'servings')} style={styles.row}>
              <Field
                label="Total minutes"
                value={totalMinutes}
                onChangeText={(v) => {
                  setTotalMinutes(v)
                  clearError('totalMinutes')
                }}
                keyboardType="number-pad"
                placeholder="e.g. 30"
                containerStyle={styles.rowItem}
                invalid={invalid('totalMinutes')}
              />
              <Field
                label="Servings"
                value={servings}
                onChangeText={(v) => {
                  setServings(v)
                  clearError('servings')
                }}
                keyboardType="number-pad"
                placeholder="e.g. 4"
                containerStyle={styles.rowItem}
                invalid={invalid('servings')}
              />
            </View>

            <Select
              label="Cuisine"
              value={cuisine || undefined}
              onChange={(value) => {
                setCuisine(value ?? '')
                clearError('cuisine')
              }}
              options={CUISINE_OPTIONS}
              placeholder="Select a cuisine"
              title="Cuisine"
              searchPlaceholder="Search cuisines"
              emojiFor={emojiForCuisine}
              // The column is free text, so the list is a shortcut, not a limit.
              allowCustom
            />
            <View onLayout={registerField('tools')}>
              <Field
                label="Tools"
                value={tools}
                onChangeText={(v) => {
                  setTools(v)
                  clearError('tools')
                }}
                placeholder="e.g. large pot, frying pan"
                hint="Separate with commas"
                invalid={invalid('tools')}
              />
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.stepHeading}>What goes in?</Text>

            <Pressable
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.browse, pressed && styles.browsePressed]}
              accessibilityRole="button"
            >
              <Text style={styles.browseEmoji}>🧄</Text>
              <View style={styles.browseText}>
                <Text style={styles.browseTitle}>Pick from common ingredients</Text>
                <Text style={styles.browseHint}>Garlic, soy sauce, rice…</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </Pressable>

            {/* One bordered row holding three borderless inputs, rather than
                three separate Fields — fixed widths and a single container are
                what keep the unit on the same line as the name on a phone. */}
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
                  placeholder="Ingredient"
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
                <TextInput
                  style={styles.ingredientUnit}
                  value={ingredient.unit}
                  onChangeText={(v) => updateIngredient(ingredient.id, 'unit', v)}
                  placeholder="unit"
                  placeholderTextColor={c.textPlaceholder}
                  keyboardAppearance={isDark ? 'dark' : 'light'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => removeIngredient(ingredient.id)}
                  hitSlop={10}
                  style={styles.ingredientRemove}
                  accessibilityLabel={`Remove ${ingredient.name || 'ingredient'}`}
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
                No ingredients yet — pick some above, or add your own below.
              </Text>
            )}
            <Pressable onPress={addIngredient} style={styles.addRow}>
              <Ionicons name="add-circle-outline" size={18} color={c.text} />
              <Text style={styles.addRowText}>Add your own</Text>
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepHeading}>How is it made?</Text>

            {steps.map((s, index) => (
              <View key={s.id} onLayout={registerField(stepKey(s.id))} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Field
                  value={s.instruction}
                  onChangeText={(v) => updateStep(s.id, v)}
                  placeholder="e.g. Boil the pasta until al dente"
                  multiline
                  containerStyle={styles.stepInput}
                  invalid={invalid(stepKey(s.id))}
                />
                <Pressable
                  onPress={() => removeStep(s.id)}
                  hitSlop={8}
                  style={[styles.remove, styles.removeStep]}
                  accessibilityLabel="Remove step"
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
                No steps yet — add the first one below.
              </Text>
            )}
            <Pressable onPress={addStep} style={styles.addRow}>
              <Ionicons name="add-circle-outline" size={18} color={c.text} />
              <Text style={styles.addRowText}>Add step</Text>
            </Pressable>
          </>
        )}

        {/* Every field here is optional, so this step never blocks Save. The
            numbers are per serving — say so, because nothing else can: the
            columns are bare floats and a reader has no way to tell whether 520
            kcal is one plate or the whole tray. */}
        {step === 3 && (
          <>
            <Text style={styles.stepHeading}>What&apos;s in a serving?</Text>
            <Text style={styles.stepIntro}>
              All optional, and all per serving. Leave anything you don&apos;t know blank.
            </Text>

            <View onLayout={registerField('calories', 'protein')} style={styles.row}>
              <Field
                label="Calories (kcal)"
                value={calories}
                onChangeText={(v) => {
                  setCalories(v)
                  clearError('calories')
                }}
                keyboardType="decimal-pad"
                placeholder="e.g. 520"
                containerStyle={styles.rowItem}
                invalid={invalid('calories')}
              />
              <Field
                label="Protein (g)"
                value={protein}
                onChangeText={(v) => {
                  setProtein(v)
                  clearError('protein')
                }}
                keyboardType="decimal-pad"
                placeholder="e.g. 31"
                containerStyle={styles.rowItem}
                invalid={invalid('protein')}
              />
            </View>

            <View onLayout={registerField('carbs', 'fat')} style={styles.row}>
              <Field
                label="Carbs (g)"
                value={carbs}
                onChangeText={(v) => {
                  setCarbs(v)
                  clearError('carbs')
                }}
                keyboardType="decimal-pad"
                placeholder="e.g. 48"
                containerStyle={styles.rowItem}
                invalid={invalid('carbs')}
              />
              <Field
                label="Fat (g)"
                value={fat}
                onChangeText={(v) => {
                  setFat(v)
                  clearError('fat')
                }}
                keyboardType="decimal-pad"
                placeholder="e.g. 22"
                containerStyle={styles.rowItem}
                invalid={invalid('fat')}
              />
            </View>
          </>
        )}
      </ScrollView>

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
              label="Back"
              variant="outline"
              onPress={() => goTo(step - 1)}
              style={styles.footerButton}
            />
          )}
          {isEditing || onLastStep ? (
            <PrimaryButton
              label={submitLabel}
              onPress={handleSubmit}
              loading={submitting}
              disabled={uploading}
              style={styles.footerButton}
            />
          ) : (
            <PrimaryButton label="Next" onPress={handleNext} style={styles.footerButton} />
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
    </KeyboardAvoidingView>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
  indicator: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  indicatorItem: { flex: 1, gap: spacing.sm },
  indicatorBar: { height: 3, borderRadius: radius.pill, backgroundColor: c.border },
  indicatorBarActive: { backgroundColor: c.primary },
  indicatorBarError: { backgroundColor: c.danger },
  indicatorLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  indicatorLabel: { ...type.caption, color: c.textPlaceholder },
  indicatorLabelActive: { color: c.text },
  indicatorLabelError: { color: c.danger },
  scroll: { flex: 1 },
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  photoChangeText: { ...type.caption, color: c.onPrimary },
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
    ...type.body,
    fontSize: 16,
    color: c.text,
    paddingVertical: 0,
  },
  ingredientDivider: { width: 1, height: 20, backgroundColor: c.borderStrong },
  ingredientQuantity: {
    width: 40,
    textAlign: 'right',
    ...type.body,
    fontSize: 16,
    color: c.text,
    paddingVertical: 0,
  },
  ingredientUnit: {
    width: 46,
    ...type.body,
    fontSize: 15,
    color: c.textMuted,
    paddingVertical: 0,
  },
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
