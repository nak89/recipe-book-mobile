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
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  ingredients: Ingredient[]
  tools: string[]
  steps: Step[]
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
