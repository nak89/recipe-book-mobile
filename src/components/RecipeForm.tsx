import { useRef, useState } from 'react'
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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/context/AuthContext'
import { uploadPhoto } from '@/lib/api'
import Chip from '@/components/ui/Chip'
import Field from '@/components/ui/Field'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Select from '@/components/ui/Select'
import IngredientPicker from '@/components/IngredientPicker'
import { emojiForIngredient } from '@/data/ingredients'
import type { CommonIngredient } from '@/data/ingredients'
import { CUISINES, emojiForCuisine } from '@/data/cuisines'
import { colors, radius, spacing, type } from '@/theme'
import { DIFFICULTIES, MEALTIMES } from '@/types/recipe'
import type {
  Difficulty,
  FormIngredient,
  FormStep,
  Mealtime,
  Recipe,
  RecipeInput,
} from '@/types/recipe'

const STEPS = ['Basics', 'Ingredients', 'Steps'] as const

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
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  // Keeps a newly added row above the keyboard instead of behind it.
  function scrollToBottom() {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50)
  }

  async function handlePickPhoto() {
    // Web has no media-library permission model — the browser file picker handles it.
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        setError('Photo library permission is required to add a photo')
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
    setError(null)
    try {
      setPhotoUrl(await uploadPhoto(result.assets[0].uri, token))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  function updateIngredient(id: string, field: keyof FormIngredient, value: string) {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { id: genId(), name: '', quantity: '', unit: '' }])
    scrollToBottom()
  }

  // The last row is removable too. A ✕ that silently does nothing reads as
  // broken; an empty list is a fine intermediate state, and `validate` is what
  // stops you saving one.
  function removeIngredient(id: string) {
    setIngredients((prev) => prev.filter((i) => i.id !== id))
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
    setError(null)
  }

  function removeCommonIngredient(name: string) {
    const key = name.trim().toLowerCase()
    setIngredients((prev) => prev.filter((i) => i.name.trim().toLowerCase() !== key))
  }

  function addStep() {
    setSteps((prev) => [...prev, { id: genId(), instruction: '' }])
    scrollToBottom()
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  /** Returns an error message for the given step, or null when it's valid. */
  function validate(index: number): string | null {
    if (index === 0) {
      if (!photoUrl) return 'A photo is required'
      if (!title.trim()) return 'Title is required'
      if (!totalMinutes || Number.isNaN(Number(totalMinutes))) {
        return 'Enter a valid total time in minutes'
      }
      if (!servings || Number.isNaN(Number(servings))) return 'Enter a valid number of servings'
    }
    if (index === 1 && !ingredients.some((i) => i.name.trim())) {
      return 'Add at least one ingredient'
    }
    if (index === 2 && !steps.some((s) => s.instruction.trim())) {
      return 'Add at least one step'
    }
    return null
  }

  function goTo(index: number) {
    setError(null)
    setStep(index)
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }

  function handleNext() {
    const message = validate(step)
    if (message) {
      setError(message)
      return
    }
    goTo(step + 1)
  }

  async function handleSubmit() {
    // Validate every step, not just the current one — in edit mode you can save
    // from anywhere, so the invalid step may not be the one on screen.
    for (let i = 0; i < STEPS.length; i++) {
      const message = validate(i)
      if (message) {
        setError(message)
        setStep(i)
        return
      }
    }

    const data: RecipeInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      photoUrl: photoUrl as string,
      difficulty,
      mealtime,
      cuisine: cuisine.trim() || undefined,
      totalMinutes: Number(totalMinutes),
      servings: Number(servings),
      tools: tools
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          quantity: Number(i.quantity) || 0,
          unit: i.unit.trim(),
        })),
      steps: steps
        .filter((s) => s.instruction.trim())
        .map((s, index) => ({ stepNumber: index + 1, instruction: s.instruction.trim() })),
    }

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save recipe')
    } finally {
      setSubmitting(false)
    }
  }

  const onLastStep = step === STEPS.length - 1

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
              <View style={[styles.indicatorBar, index <= step && styles.indicatorBarActive]} />
              <Text style={[styles.indicatorLabel, index === step && styles.indicatorLabelActive]}>
                {label}
              </Text>
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
            <Pressable
              style={styles.photoPicker}
              onPress={handlePickPhoto}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel={photoUrl ? 'Change photo' : 'Add a photo'}
            >
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : photoUrl ? (
                <>
                  <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  <View style={styles.photoChange}>
                    <Ionicons name="camera" size={14} color={colors.onPrimary} />
                    <Text style={styles.photoChangeText}>Change</Text>
                  </View>
                </>
              ) : (
                <>
                  <Ionicons name="camera-outline" size={26} color={colors.textPlaceholder} />
                  <Text style={styles.photoPickerText}>Add a photo</Text>
                  <Text style={styles.photoPickerHint}>Required</Text>
                </>
              )}
            </Pressable>

            <Field
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Spaghetti Carbonara"
            />
            <Field
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Classic Italian pasta with egg and pancetta"
              multiline
            />

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

            <View style={styles.row}>
              <Field
                label="Total minutes"
                value={totalMinutes}
                onChangeText={setTotalMinutes}
                keyboardType="number-pad"
                placeholder="e.g. 30"
                containerStyle={styles.rowItem}
              />
              <Field
                label="Servings"
                value={servings}
                onChangeText={setServings}
                keyboardType="number-pad"
                placeholder="e.g. 4"
                containerStyle={styles.rowItem}
              />
            </View>

            <Select
              label="Cuisine"
              value={cuisine || undefined}
              onChange={(value) => setCuisine(value ?? '')}
              options={CUISINE_OPTIONS}
              placeholder="Select a cuisine"
              title="Cuisine"
              searchPlaceholder="Search cuisines"
              emojiFor={emojiForCuisine}
              // The column is free text, so the list is a shortcut, not a limit.
              allowCustom
            />
            <Field
              label="Tools"
              value={tools}
              onChangeText={setTools}
              placeholder="e.g. large pot, frying pan"
              hint="Separate with commas"
            />
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
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            {/* One bordered row holding three borderless inputs, rather than
                three separate Fields — fixed widths and a single container are
                what keep the unit on the same line as the name on a phone. */}
            {ingredients.map((ingredient) => (
              <View key={ingredient.id} style={styles.ingredientRow}>
                <Text style={styles.ingredientEmoji}>{emojiForIngredient(ingredient.name)}</Text>
                <TextInput
                  style={styles.ingredientName}
                  value={ingredient.name}
                  onChangeText={(v) => updateIngredient(ingredient.id, 'name', v)}
                  placeholder="Ingredient"
                  placeholderTextColor={colors.textPlaceholder}
                />
                <View style={styles.ingredientDivider} />
                <TextInput
                  style={styles.ingredientQuantity}
                  value={ingredient.quantity}
                  onChangeText={(v) => updateIngredient(ingredient.id, 'quantity', v)}
                  placeholder="0"
                  placeholderTextColor={colors.textPlaceholder}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.ingredientUnit}
                  value={ingredient.unit}
                  onChangeText={(v) => updateIngredient(ingredient.id, 'unit', v)}
                  placeholder="unit"
                  placeholderTextColor={colors.textPlaceholder}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={() => removeIngredient(ingredient.id)}
                  hitSlop={10}
                  style={styles.ingredientRemove}
                  accessibilityLabel={`Remove ${ingredient.name || 'ingredient'}`}
                >
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
            {ingredients.length === 0 && (
              <Text style={styles.emptyHint}>
                No ingredients yet — pick some above, or add your own below.
              </Text>
            )}
            <Pressable onPress={addIngredient} style={styles.addRow}>
              <Ionicons name="add-circle-outline" size={18} color={colors.text} />
              <Text style={styles.addRowText}>Add your own</Text>
            </Pressable>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepHeading}>How is it made?</Text>
            {steps.map((s, index) => (
              <View key={s.id} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Field
                  value={s.instruction}
                  onChangeText={(v) =>
                    setSteps((prev) =>
                      prev.map((item) => (item.id === s.id ? { ...item, instruction: v } : item))
                    )
                  }
                  placeholder="e.g. Boil the pasta until al dente"
                  multiline
                  containerStyle={styles.stepInput}
                />
                <Pressable
                  onPress={() => removeStep(s.id)}
                  hitSlop={8}
                  style={[styles.remove, styles.removeStep]}
                  accessibilityLabel="Remove step"
                >
                  <Ionicons name="close" size={18} color={colors.danger} />
                </Pressable>
              </View>
            ))}
            {steps.length === 0 && (
              <Text style={styles.emptyHint}>No steps yet — add the first one below.</Text>
            )}
            <Pressable onPress={addStep} style={styles.addRow}>
              <Ionicons name="add-circle-outline" size={18} color={colors.text} />
              <Text style={styles.addRowText}>Add step</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Errors sit next to the action button — that's where you're looking on save. */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {error && <Text style={styles.error}>{error}</Text>}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  indicator: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  indicatorItem: { flex: 1, gap: spacing.sm },
  indicatorBar: { height: 3, borderRadius: radius.pill, backgroundColor: colors.border },
  indicatorBarActive: { backgroundColor: colors.primary },
  indicatorLabel: { ...type.caption, color: colors.textPlaceholder },
  indicatorLabelActive: { color: colors.text },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  stepHeading: { ...type.title, color: colors.text, marginBottom: spacing.xs },
  photoPicker: {
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  photoPickerText: { ...type.bodyStrong, color: colors.textMuted },
  photoPickerHint: { ...type.caption, color: colors.textPlaceholder },
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
  photoChangeText: { ...type.caption, color: colors.onPrimary },
  group: { gap: spacing.sm },
  label: { ...type.label, color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  segmented: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { ...type.caption, color: colors.textMuted },
  segmentTextActive: { color: colors.onPrimary },
  row: { flexDirection: 'row', gap: spacing.md },
  rowItem: { flex: 1 },
  browse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSubtle,
  },
  browsePressed: { backgroundColor: colors.surfaceAlt },
  browseEmoji: { fontSize: 22 },
  browseText: { flex: 1, minWidth: 0, gap: 2 },
  browseTitle: { ...type.bodyStrong, color: colors.text },
  browseHint: { ...type.caption, color: colors.textMuted },
  // Everything but the name is a fixed width, and the name flexes into what's
  // left — so the row can never wrap, however narrow the phone.
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  ingredientEmoji: { fontSize: 18, width: 22, textAlign: 'center' },
  ingredientName: {
    flex: 1,
    minWidth: 0,
    ...type.body,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  ingredientDivider: { width: 1, height: 20, backgroundColor: colors.borderStrong },
  ingredientQuantity: {
    width: 40,
    textAlign: 'right',
    ...type.body,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  ingredientUnit: {
    width: 46,
    ...type.body,
    fontSize: 15,
    color: colors.textMuted,
    paddingVertical: 0,
  },
  ingredientRemove: { width: 20, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  stepNumberText: { ...type.caption, color: colors.onPrimary },
  stepInput: { flex: 1, minWidth: 0 },
  remove: { width: 30, height: 50, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  // Steps use a multiline input, so nudge the ✕ to line up with its first row.
  removeStep: { marginTop: spacing.xs },
  emptyHint: { ...type.body, color: colors.textMuted, paddingVertical: spacing.sm },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  addRowText: { ...type.bodyStrong, color: colors.text },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  error: { ...type.body, color: colors.danger },
  footerButtons: { flexDirection: 'row', gap: spacing.sm },
  footerButton: { flex: 1 },
})
