// Client-side rules for the add/edit recipe wizard.
//
// These mirror the zod schemas in the backend's `validation.ts` — same limits,
// same fields. Anything tightened there has to be tightened here too, or the
// wizard lets you through and the server rejects the whole recipe at the end.
//
// **The red outline is the message.** A field's entry maps to a *short* string
// only when the outline alone can't explain the problem — a title that's filled
// in but already taken, or a number that looks fine but isn't whole. Everything
// ordinary maps to `''`: the box is highlighted, and that's enough. So presence
// of a key means "this field is wrong", never the truthiness of its value.

import type { FormIngredient, FormStep } from '@/types/recipe'

/** Field key → short explanation, or `''` when the highlight speaks for itself. */
export type FieldErrors = Record<string, string>

/** Row-level keys are `ingredient:<row id>` / `step:<row id>`. */
export const ingredientKey = (id: string) => `ingredient:${id}`
export const stepKey = (id: string) => `step:${id}`

export interface RecipeFormValues {
  photoUrl?: string
  title: string
  description: string
  totalMinutes: string
  servings: string
  cuisine: string
  tools: string
  ingredients: FormIngredient[]
  steps: FormStep[]
  /** All four per serving, and all four allowed to be blank. */
  calories: string
  protein: string
  carbs: string
  fat: string
  /** Lowercased titles of the user's other recipes, for the duplicate check. */
  takenTitles: Set<string>
}

/** The nutrition step's fields, in the order they appear on screen. */
export const NUTRITION_FIELDS = ['calories', 'protein', 'carbs', 'fat'] as const

export const LIMITS = {
  title: 200,
  /** Words is the rule people understand; characters is the backstop, since
   *  1000 "words" with no spaces in them is still one enormous string. */
  descriptionWords: 1000,
  description: 8000,
  cuisine: 100,
  tool: 100,
  tools: 50,
  totalMinutes: 100_000,
  servings: 1000,
  ingredients: 100,
  ingredientName: 200,
  quantity: 100_000,
  unit: 50,
  steps: 100,
  instruction: 2000,
  /** Nutrition is per serving, so these bound one plate, not a whole tray. */
  calories: 10_000,
  protein: 1_000,
  carbs: 1_000,
  fat: 1_000,
} as const

/** Mirrors MAX_RECIPE_BYTES in the backend's validation.ts. */
export const MAX_RECIPE_BYTES = 60 * 1024

/** Marks a field wrong with nothing to add beyond the highlight. */
const HIGHLIGHT_ONLY = ''

function countWords(value: string): number {
  const trimmed = value.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/**
 * UTF-8 byte length, counted by hand.
 *
 * `Buffer` doesn't exist in the app and `TextEncoder` isn't guaranteed on every
 * runtime this ships to, but the number has to agree with the server's
 * `Buffer.byteLength` or the two size limits disagree at the boundary.
 */
export function utf8ByteLength(value: string): number {
  let bytes = 0
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff) {
      // Surrogate pair: one 4-byte character, so consume the low half too.
      bytes += 4
      i++
    } else bytes += 3
  }
  return bytes
}

/**
 * Whether the assembled recipe fits the per-recipe ceiling. Checked on the
 * serialised body rather than field by field, because it's the total that's
 * capped — 100 steps of 2000 characters each is every field within its own
 * limit and still a quarter of a megabyte.
 */
export function recipeSizeError(body: unknown): string | null {
  const bytes = utf8ByteLength(JSON.stringify(body))
  if (bytes <= MAX_RECIPE_BYTES) return null
  return `This recipe is ${Math.round(bytes / 1024)}KB — the limit is ${MAX_RECIPE_BYTES / 1024}KB. Shorten the description or remove some steps.`
}

/**
 * Whole numbers only, checked as text rather than with `Number()`.
 *
 * `Number('30.5')` is a perfectly good number, so the old `Number.isNaN` test
 * passed it to a backend column that wants an integer — a 400 at the end of the
 * wizard. `30.5` is also the one case worth a sentence: the box looks filled in,
 * so a bare highlight would leave you staring at it.
 */
function wholeNumber(raw: string, label: string, max: number): string | null {
  const value = raw.trim()
  if (!value) return HIGHLIGHT_ONLY
  if (/^\d*[.,]\d+$/.test(value)) return `${label} must be a whole number.`
  if (!/^\d+$/.test(value)) return HIGHLIGHT_ONLY
  const parsed = Number(value)
  if (parsed < 1 || parsed > max) return HIGHLIGHT_ONLY
  return null
}

/**
 * An optional decimal: blank is fine, a comma is as good as a dot.
 *
 * `message` is the whole sentence rather than a label, because the one case
 * worth explaining — letters where a number belongs — reads differently for a
 * list of amounts than it does for a single field. Being over the maximum needs
 * no words: the number is right there in the outlined box.
 */
function decimalNumber(raw: string, message: string, max: number): string | null {
  const value = raw.trim()
  if (!value) return null
  if (!/^\d+([.,]\d+)?$/.test(value)) return message
  if (Number(value.replace(',', '.')) > max) return HIGHLIGHT_ONLY
  return null
}

/** Quantities may be fractional and may be left blank (saved as 0). */
function quantityError(raw: string): string | null {
  return decimalNumber(raw, 'Amounts must be numbers.', LIMITS.quantity)
}

/** Rows the user has actually started filling in; wholly blank rows are dropped. */
export function usedIngredients(rows: FormIngredient[]) {
  return rows.filter((i) => i.name.trim() || i.quantity.trim() || i.unit.trim())
}

export function usedSteps(rows: FormStep[]) {
  return rows.filter((s) => s.instruction.trim())
}

/**
 * Errors for one wizard step. Keys are inserted in the order the fields appear
 * on screen, so the first key is the field to scroll to.
 */
export function validateStep(index: number, values: RecipeFormValues): FieldErrors {
  const errors: FieldErrors = {}

  if (index === 0) {
    if (!values.photoUrl) errors.photoUrl = HIGHLIGHT_ONLY

    const title = values.title.trim()
    if (!title) {
      errors.title = HIGHLIGHT_ONLY
    } else if (title.length > LIMITS.title) {
      errors.title = `Title is too long (${LIMITS.title} characters max).`
    } else if (values.takenTitles.has(title.toLowerCase())) {
      // The one error where the field looks perfectly fine.
      errors.title = 'You already have a recipe with this title.'
    }

    // Optional fields still need a ceiling — "optional" means you may leave it
    // out, not that anything goes once you fill it in.
    if (countWords(values.description) > LIMITS.descriptionWords) {
      errors.description = `Description is too long (${LIMITS.descriptionWords.toLocaleString()} words max).`
    } else if (values.description.trim().length > LIMITS.description) {
      errors.description = `Description is too long (${LIMITS.description.toLocaleString()} characters max).`
    }

    const minutes = wholeNumber(values.totalMinutes, 'Total minutes', LIMITS.totalMinutes)
    if (minutes !== null) errors.totalMinutes = minutes

    const servings = wholeNumber(values.servings, 'Servings', LIMITS.servings)
    if (servings !== null) errors.servings = servings

    if (values.cuisine.trim().length > LIMITS.cuisine) errors.cuisine = HIGHLIGHT_ONLY

    const tools = values.tools
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    if (tools.length > LIMITS.tools) {
      errors.tools = `Too many tools (${LIMITS.tools} max).`
    } else if (tools.some((t) => t.length > LIMITS.tool)) {
      errors.tools = 'Separate tools with commas — one of them is too long.'
    }
  }

  if (index === 1) {
    const used = usedIngredients(values.ingredients)
    const named = used.filter((i) => i.name.trim())

    if (named.length === 0) {
      // Nothing to outline when the list is empty, so the list itself is marked
      // and every nameless row with it.
      errors.ingredients = HIGHLIGHT_ONLY
      for (const row of used) errors[ingredientKey(row.id)] = HIGHLIGHT_ONLY
    } else if (used.length > LIMITS.ingredients) {
      errors.ingredients = `Too many ingredients (${LIMITS.ingredients} max).`
    }

    for (const row of used) {
      if (errors[ingredientKey(row.id)] !== undefined) continue
      if (!row.name.trim() || row.name.trim().length > LIMITS.ingredientName) {
        errors[ingredientKey(row.id)] = HIGHLIGHT_ONLY
        continue
      }
      const quantity = quantityError(row.quantity)
      if (quantity !== null) {
        errors[ingredientKey(row.id)] = quantity
        continue
      }
      if (row.unit.trim().length > LIMITS.unit) errors[ingredientKey(row.id)] = HIGHLIGHT_ONLY
    }
  }

  if (index === 2) {
    const used = usedSteps(values.steps)
    if (used.length === 0) {
      errors.steps = HIGHLIGHT_ONLY
      for (const row of values.steps) errors[stepKey(row.id)] = HIGHLIGHT_ONLY
    } else if (used.length > LIMITS.steps) {
      errors.steps = `Too many steps (${LIMITS.steps} max).`
    }

    for (const row of used) {
      if (row.instruction.trim().length > LIMITS.instruction) {
        errors[stepKey(row.id)] = `A step can't be longer than ${LIMITS.instruction.toLocaleString()} characters.`
      }
    }
  }

  if (index === 3) {
    // Every field here is optional: blank is a real answer meaning "I don't
    // know", so this step can never block Next or Save on emptiness. It only
    // bounds what you did type.
    const nutrition: [string, string, string][] = [
      ['calories', values.calories, 'Calories'],
      ['protein', values.protein, 'Protein'],
      ['carbs', values.carbs, 'Carbs'],
      ['fat', values.fat, 'Fat'],
    ]
    for (const [key, raw, label] of nutrition) {
      const error = decimalNumber(raw, `${label} must be a number.`, LIMITS[key as keyof typeof LIMITS])
      if (error !== null) errors[key] = error
    }
  }

  return errors
}

/**
 * The single line shown above the button. One sentence at most: the highlights
 * already say *which* fields, so this only exists to cover what a red outline
 * can't say — and stays generic when there's more than one thing wrong rather
 * than stacking messages.
 */
export function summarise(errors: FieldErrors): string | null {
  const keys = Object.keys(errors)
  if (keys.length === 0) return null
  const explained = keys.map((k) => errors[k]).filter(Boolean)
  if (explained.length === 0) return 'Fill in the highlighted fields.'
  if (explained.length === 1 && keys.length === 1) return explained[0]
  return 'Check the highlighted fields.'
}

/** Which wizard step owns a field key — used to jump to the step with the error. */
export function stepForField(field: string): number {
  if ((NUTRITION_FIELDS as readonly string[]).includes(field)) return 3
  if (field.startsWith('ingredient') || field === 'ingredients') return 1
  if (field.startsWith('step') || field === 'steps') return 2
  return 0
}

/**
 * Turns a server-side issue (`ingredients.0.name`) into a form field key.
 *
 * The indices refer to the arrays we submitted, not to the rows on screen —
 * blank rows are dropped on the way out — so the caller passes the row ids in
 * submission order. Returns null for anything the form has no input for, which
 * then falls back to the message under the button.
 */
export function fieldForServerIssue(
  path: string,
  submittedIngredientIds: string[],
  submittedStepIds: string[]
): string | null {
  const [head, index] = path.split('.')

  if (head === 'ingredients') {
    if (index === undefined) return 'ingredients'
    const id = submittedIngredientIds[Number(index)]
    return id ? ingredientKey(id) : 'ingredients'
  }
  if (head === 'steps') {
    if (index === undefined) return 'steps'
    const id = submittedStepIds[Number(index)]
    return id ? stepKey(id) : 'steps'
  }

  const known = [
    'title',
    'description',
    'photoUrl',
    'totalMinutes',
    'servings',
    'cuisine',
    'tools',
    ...NUTRITION_FIELDS,
  ]
  return known.includes(head) ? head : null
}
