import { dinnerPool } from './dinnerDraft'
import type { DinnerOptions, GeneratedMealtime } from './dinnerDraft'
import { foldForCompare } from './text'

export const WIZARD_MEALS = ['Breakfast', 'Lunch', 'Dinner'] as const
export type WizardSlot = {
  date: string
  mealtime: GeneratedMealtime
  recipeId: string | null
  expectedRecipeId: string | null
}
type SavedSlot = { date: string; mealtime: string; recipeId: string }
type Choice = { id: string; mealtime?: string | null; ingredients: readonly { name: string }[] }
type Options = Pick<DinnerOptions, 'includeUntagged' | 'allowRepeats'>

export const foldIngredientName = (name: string) => foldForCompare(name).replace(/\s+/g, ' ')

export const slotKey = ({ date, mealtime }: Pick<SavedSlot, 'date' | 'mealtime'>) => `${date}:${mealtime}`

export function ingredientNames(recipes: readonly Choice[], builtIn: readonly string[]) {
  const names = new Map<string, string>()
  for (const name of [...recipes.flatMap(recipe => recipe.ingredients.map(ingredient => ingredient.name)), ...builtIn]) {
    const key = foldIngredientName(name)
    if (key && !names.has(key)) names.set(key, name)
  }
  return [...names.values()]
}

export function fridgeMatches(recipe: Choice, fridge: readonly string[]) {
  const names = new Set(recipe.ingredients.map(({ name }) => foldIngredientName(name)))
  return fridge.filter(name => names.has(foldIngredientName(name)))
}

function rankRecipes<T extends Choice>(recipes: readonly T[], fridge: readonly string[]) {
  return recipes.map(recipe => ({ recipe, score: fridgeMatches(recipe, fridge).length }))
    .sort((a, b) => b.score - a.score)
    .map(({ recipe }) => recipe)
}

export function makeWeekDraft(
  dates: readonly string[], meals: readonly GeneratedMealtime[], recipes: readonly Choice[],
  plan: readonly SavedSlot[], options: Options, fridge: readonly string[],
): WizardSlot[] {
  const existing = new Map(plan.map(slot => [slotKey(slot), slot.recipeId]))
  const used = new Set(existing.values())
  const ranked = rankRecipes(recipes, fridge)
  const pools = new Map(meals.map(mealtime => [mealtime, dinnerPool(ranked, { ...options, mealtime })]))
  return dates.flatMap(date => meals.map(mealtime => {
    const expectedRecipeId = existing.get(slotKey({ date, mealtime })) ?? null
    const pool = pools.get(mealtime) ?? []
    const choice = pool.find(recipe => !used.has(recipe.id)) ?? (options.allowRepeats ? pool[0] : undefined)
    const recipeId = expectedRecipeId ?? choice?.id ?? null
    if (recipeId) used.add(recipeId)
    return { date, mealtime, recipeId, expectedRecipeId }
  }))
}

export function replacementRecipes<T extends Choice>(
  entry: WizardSlot, draft: readonly WizardSlot[], recipes: readonly T[],
  plan: readonly SavedSlot[], options: Options, fridge: readonly string[],
) {
  const draftKeys = new Set(draft.map(slotKey))
  const used = new Set([
    ...plan.filter(slot => !draftKeys.has(slotKey(slot))).map(slot => slot.recipeId),
    ...draft.filter(slot => slotKey(slot) !== slotKey(entry)).map(slot => slot.recipeId),
  ])
  const eligible = dinnerPool(recipes, { ...options, mealtime: entry.mealtime })
  const ids = new Set(eligible.map(recipe => recipe.id))
  return rankRecipes(recipes.filter(recipe => ids.has(recipe.id) && recipe.id !== entry.recipeId &&
    (options.allowRepeats || !used.has(recipe.id))), fridge)
}

export function moveWeekMeal(draft: readonly WizardSlot[], source: WizardSlot, date: string) {
  const destination = draft.find(slot => slot.date === date && slot.mealtime === source.mealtime)
  if (!destination || !source.recipeId || date === source.date) return [...draft]
  return draft.map(slot => {
    if (slotKey(slot) === slotKey(source)) return { ...slot, recipeId: destination.recipeId }
    if (slotKey(slot) === slotKey(destination)) return { ...slot, recipeId: source.recipeId }
    return slot
  })
}
