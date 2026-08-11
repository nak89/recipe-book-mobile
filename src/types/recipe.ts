export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

/**
 * Replaces the old `Starter | Main | Dessert` course vocabulary. You pick what
 * to cook by time of day far more often than by course position, and these are
 * the dashboard's filter chips.
 */
export type Mealtime = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'

export const MEALTIMES: Mealtime[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']

export const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced']

export interface Ingredient {
  id?: string
  name: string
  quantity: number
  unit: string
}

export interface Step {
  id?: string
  stepNumber: number
  instruction: string
}

export interface Recipe {
  id: string
  title: string
  description?: string
  photoUrl?: string
  difficulty: Difficulty
  totalMinutes: number
  servings: number
  cuisine?: string
  mealtime?: Mealtime
  isFavourite: boolean
  // Per serving, and null when the user hasn't said. The API really does return
  // JSON null here, so `number | undefined` alone would be a lie the detail
  // screen then has to guess around.
  calories?: number | null
  protein?: number | null
  carbs?: number | null
  fat?: number | null
  ingredients: Ingredient[]
  tools: string[]
  steps: Step[]
}

/**
 * One planned meal. `date` is a plain `YYYY-MM-DD` calendar day, never a
 * timestamp — a plan is "Tuesday's dinner", not an instant, and parsing it into
 * a `Date` anywhere but at the point of formatting is how it starts sliding by
 * a day across timezones.
 *
 * `recipe` is the trimmed shape the planner row renders, not a full `Recipe`:
 * the endpoint deliberately doesn't send ingredients or steps to a screen that
 * shows neither.
 */
export interface PlanSlot {
  id: string
  date: string
  mealtime: Mealtime
  recipeId: string
  recipe: PlannedRecipe
}

export interface PlannedRecipe {
  id: string
  title: string
  photoUrl?: string | null
  totalMinutes: number
  servings: number
  mealtime?: Mealtime | null
}

export interface RecipeInput {
  title: string
  description?: string
  // Required, not optional: every card layout in the app is photo-first, and the
  // backend rejects a create/update without one.
  photoUrl: string
  difficulty: Difficulty
  totalMinutes: number
  servings: number
  cuisine?: string
  mealtime?: Mealtime
  // Always sent, explicitly null when blank. Omitting a cleared field would
  // leave the old value in the database — Prisma treats a missing key in an
  // update as "no change", so only a null actually removes it.
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  tools: string[]
  ingredients: Ingredient[]
  steps: Step[]
}

// Form-local shapes: string-typed and always-present so they bind directly
// to controlled TextInputs, converted to RecipeInput on submit.
export interface FormIngredient {
  id: string
  name: string
  quantity: string
  unit: string
}

export interface FormStep {
  id: string
  instruction: string
}
