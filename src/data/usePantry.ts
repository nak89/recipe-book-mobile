import { useMemo } from 'react'
import { useLanguage } from '@/i18n'
import { COMMON_INGREDIENTS, INGREDIENT_CATEGORIES } from './ingredients'
import { KHMER_INGREDIENT_CATEGORIES, KHMER_INGREDIENTS } from './ingredients.km'
import type { CommonIngredient } from './ingredients'
import { CUISINES } from './cuisines'
import { KHMER_CUISINES } from './cuisines.km'
import type { Cuisine } from './cuisines'

/**
 * The language-dependent half of the pantry.
 *
 * These two hooks are the **only** place the toggle is allowed to change an
 * ingredient or cuisine list, and the reason is narrow: the picker writes what
 * you tap straight into your recipe, so it has to offer the language you're
 * working in. Tapping "សាច់មាន់" and getting "Chicken" in your own recipe would
 * be the toggle silently editing content.
 *
 * The mirror image is `emojiForIngredient` / `emojiForCuisine`, which read the
 * *stored* name at render time and therefore must **never** consult the
 * language — they're built from both lists at once. If you find yourself
 * reaching for `useLanguage()` in a lookup rather than a picker, that's the
 * distinction to check first.
 */
export function useIngredients(): {
  ingredients: CommonIngredient[]
  categories: readonly string[]
} {
  const { language } = useLanguage()
  return useMemo(
    () =>
      language === 'km'
        ? { ingredients: KHMER_INGREDIENTS, categories: KHMER_INGREDIENT_CATEGORIES }
        : { ingredients: COMMON_INGREDIENTS, categories: INGREDIENT_CATEGORIES },
    [language]
  )
}

export function useCuisines(): Cuisine[] {
  const { language } = useLanguage()
  return useMemo(() => (language === 'km' ? KHMER_CUISINES : CUISINES), [language])
}
