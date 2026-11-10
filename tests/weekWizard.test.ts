import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ingredientNames, makeWeekDraft, moveWeekMeal, replacementRecipes } from '@/lib/weekWizard'

const options = { allowRepeats: false, includeUntagged: false }
const dates = ['2026-11-09', '2026-11-10']
const recipes = [
  { id: 'toast', mealtime: 'Breakfast', ingredients: [{ name: 'Bread' }] },
  { id: 'eggs', mealtime: 'Breakfast', ingredients: [{ name: 'Eggs' }] },
  { id: 'omelette', mealtime: 'Breakfast', ingredients: [{ name: 'Eggs' }, { name: 'Baby spinach' }] },
  { id: 'rice', mealtime: 'Lunch', ingredients: [{ name: 'Eggs' }] },
]

test('fridge search prefers the spelling from saved recipes and deduplicates the built-in list', () => {
  assert.deepEqual(ingredientNames(recipes, [' eggs ', 'Tofu']), ['Bread', 'Eggs', 'Baby spinach', 'Tofu'])
})

test('breakfast ranks exact folded matches, falls back and preserves existing slots', () => {
  const draft = makeWeekDraft(dates, ['Breakfast'], recipes, [], options, ['eggs', ' Baby   Spinach '])
  assert.deepEqual(draft.map(slot => slot.recipeId), ['omelette', 'eggs'])
  const existing = [{ date: dates[0], mealtime: 'Breakfast', recipeId: 'toast' }]
  const kept = makeWeekDraft(dates, ['Breakfast'], recipes, existing, options, ['eggs'])
  assert.equal(kept[0].recipeId, 'toast')
  assert.equal(kept[0].expectedRecipeId, 'toast')
  assert.equal(kept[1].recipeId, 'eggs')
})

test('moving into an empty slot retains the baseline needed to remove the original atomically', () => {
  const plan = [{ date: dates[0], mealtime: 'Breakfast', recipeId: 'toast' }]
  const draft = makeWeekDraft(dates, ['Breakfast'], recipes.slice(0, 1), plan, options, [])
  assert.equal(draft[1].recipeId, null)
  const moved = moveWeekMeal(draft, draft[0], dates[1])
  assert.deepEqual(moved.map(slot => [slot.recipeId, slot.expectedRecipeId]), [[null, 'toast'], ['toast', null]])
  assert.deepEqual(replacementRecipes(moved[0], moved, recipes, plan, options, ['eggs']).map(recipe => recipe.id), ['eggs', 'omelette'])
})
