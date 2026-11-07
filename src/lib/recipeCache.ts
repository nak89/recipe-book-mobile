import type { Recipe } from '@/types/recipe'
import type { LibrarySummary } from './api'
import { createSessionResource } from './sessionResource'

export const recipesResource = createSessionResource<Recipe[]>()
export const libraryResource = createSessionResource<{ recipes: LibrarySummary[]; savedIds: string[] }>()

export const getCachedRecipes = (token: string | null) => recipesResource.peek(token)
export const getCachedLibrary = (token: string | null) => libraryResource.peek(token)
export const getCachedRecipe = (id: string, token: string | null) => getCachedRecipes(token)?.find(recipe => recipe.id === id)

export function clearRecipeCache() {
  recipesResource.clear()
  libraryResource.clear()
}
