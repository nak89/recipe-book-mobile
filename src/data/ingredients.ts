/**
 * A hand-curated pantry, not an exhaustive food database. It exists so the
 * common 80% of ingredients can be tapped instead of typed, and so every
 * ingredient the app displays can carry an emoji.
 *
 * Anything not in here is still perfectly valid — the picker is a shortcut, the
 * free-text row is the real input. Adding an entry here also teaches
 * `emojiForIngredient` a new word, so prefer extending this list over
 * hardcoding an emoji anywhere else.
 */
export interface CommonIngredient {
  name: string
  emoji: string
  /** Prefilled when picked, so the usual case is one number away from done. */
  unit: string
  category: IngredientCategory
}

export const INGREDIENT_CATEGORIES = [
  'Vegetables',
  'Fruit',
  'Meat & Fish',
  'Dairy & Eggs',
  'Grains & Pasta',
  'Herbs & Spices',
  'Sauces & Oils',
  'Baking & Sweet',
] as const

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number]

export const COMMON_INGREDIENTS: CommonIngredient[] = [
  // Vegetables
  { name: 'Garlic', emoji: '🧄', unit: 'cloves', category: 'Vegetables' },
  { name: 'Onion', emoji: '🧅', unit: '', category: 'Vegetables' },
  { name: 'Spring onion', emoji: '🌿', unit: 'stalks', category: 'Vegetables' },
  { name: 'Tomato', emoji: '🍅', unit: '', category: 'Vegetables' },
  { name: 'Potato', emoji: '🥔', unit: 'g', category: 'Vegetables' },
  { name: 'Sweet potato', emoji: '🍠', unit: 'g', category: 'Vegetables' },
  { name: 'Carrot', emoji: '🥕', unit: '', category: 'Vegetables' },
  { name: 'Broccoli', emoji: '🥦', unit: 'g', category: 'Vegetables' },
  { name: 'Cabbage', emoji: '🥬', unit: 'g', category: 'Vegetables' },
  { name: 'Lettuce', emoji: '🥬', unit: 'g', category: 'Vegetables' },
  { name: 'Spinach', emoji: '🥬', unit: 'g', category: 'Vegetables' },
  { name: 'Cucumber', emoji: '🥒', unit: '', category: 'Vegetables' },
  { name: 'Bell pepper', emoji: '🫑', unit: '', category: 'Vegetables' },
  { name: 'Chilli', emoji: '🌶️', unit: '', category: 'Vegetables' },
  { name: 'Mushroom', emoji: '🍄', unit: 'g', category: 'Vegetables' },
  { name: 'Corn', emoji: '🌽', unit: '', category: 'Vegetables' },
  { name: 'Eggplant', emoji: '🍆', unit: '', category: 'Vegetables' },
  { name: 'Avocado', emoji: '🥑', unit: '', category: 'Vegetables' },
  { name: 'Peas', emoji: '🫛', unit: 'g', category: 'Vegetables' },
  { name: 'Beansprouts', emoji: '🌱', unit: 'g', category: 'Vegetables' },
  { name: 'Ginger', emoji: '🫚', unit: 'g', category: 'Vegetables' },
  { name: 'Lemongrass', emoji: '🌾', unit: 'stalks', category: 'Vegetables' },

  // Fruit
  { name: 'Lemon', emoji: '🍋', unit: '', category: 'Fruit' },
  { name: 'Lime', emoji: '🍈', unit: '', category: 'Fruit' },
  { name: 'Orange', emoji: '🍊', unit: '', category: 'Fruit' },
  { name: 'Apple', emoji: '🍎', unit: '', category: 'Fruit' },
  { name: 'Banana', emoji: '🍌', unit: '', category: 'Fruit' },
  { name: 'Mango', emoji: '🥭', unit: '', category: 'Fruit' },
  { name: 'Pineapple', emoji: '🍍', unit: 'g', category: 'Fruit' },
  { name: 'Strawberry', emoji: '🍓', unit: 'g', category: 'Fruit' },
  { name: 'Blueberry', emoji: '🫐', unit: 'g', category: 'Fruit' },
  { name: 'Coconut milk', emoji: '🥥', unit: 'ml', category: 'Fruit' },

  // Meat & Fish
  { name: 'Chicken breast', emoji: '🍗', unit: 'g', category: 'Meat & Fish' },
  { name: 'Chicken thigh', emoji: '🍗', unit: 'g', category: 'Meat & Fish' },
  { name: 'Chicken', emoji: '🐔', unit: 'g', category: 'Meat & Fish' },
  { name: 'Beef', emoji: '🥩', unit: 'g', category: 'Meat & Fish' },
  { name: 'Minced beef', emoji: '🥩', unit: 'g', category: 'Meat & Fish' },
  { name: 'Pork', emoji: '🥓', unit: 'g', category: 'Meat & Fish' },
  { name: 'Pork belly', emoji: '🥓', unit: 'g', category: 'Meat & Fish' },
  { name: 'Bacon', emoji: '🥓', unit: 'strips', category: 'Meat & Fish' },
  { name: 'Sausage', emoji: '🌭', unit: '', category: 'Meat & Fish' },
  { name: 'Fish', emoji: '🐟', unit: 'g', category: 'Meat & Fish' },
  { name: 'Salmon', emoji: '🐟', unit: 'g', category: 'Meat & Fish' },
  { name: 'Prawns', emoji: '🍤', unit: 'g', category: 'Meat & Fish' },
  { name: 'Squid', emoji: '🦑', unit: 'g', category: 'Meat & Fish' },
  { name: 'Crab', emoji: '🦀', unit: 'g', category: 'Meat & Fish' },
  { name: 'Tofu', emoji: '🧊', unit: 'g', category: 'Meat & Fish' },

  // Dairy & Eggs
  { name: 'Egg', emoji: '🥚', unit: '', category: 'Dairy & Eggs' },
  { name: 'Milk', emoji: '🥛', unit: 'ml', category: 'Dairy & Eggs' },
  { name: 'Butter', emoji: '🧈', unit: 'g', category: 'Dairy & Eggs' },
  { name: 'Cheese', emoji: '🧀', unit: 'g', category: 'Dairy & Eggs' },
  { name: 'Parmesan', emoji: '🧀', unit: 'g', category: 'Dairy & Eggs' },
  { name: 'Cream', emoji: '🥛', unit: 'ml', category: 'Dairy & Eggs' },
  { name: 'Yoghurt', emoji: '🥣', unit: 'g', category: 'Dairy & Eggs' },

  // Grains & Pasta
  { name: 'Rice', emoji: '🍚', unit: 'g', category: 'Grains & Pasta' },
  { name: 'Sticky rice', emoji: '🍙', unit: 'g', category: 'Grains & Pasta' },
  { name: 'Spaghetti', emoji: '🍝', unit: 'g', category: 'Grains & Pasta' },
  { name: 'Pasta', emoji: '🍝', unit: 'g', category: 'Grains & Pasta' },
  { name: 'Noodles', emoji: '🍜', unit: 'g', category: 'Grains & Pasta' },
  { name: 'Rice noodles', emoji: '🍜', unit: 'g', category: 'Grains & Pasta' },
  { name: 'Bread', emoji: '🍞', unit: 'slices', category: 'Grains & Pasta' },
  { name: 'Baguette', emoji: '🥖', unit: '', category: 'Grains & Pasta' },
  { name: 'Tortilla', emoji: '🫓', unit: '', category: 'Grains & Pasta' },
  { name: 'Oats', emoji: '🌾', unit: 'g', category: 'Grains & Pasta' },

  // Herbs & Spices
  { name: 'Salt', emoji: '🧂', unit: 'tsp', category: 'Herbs & Spices' },
  { name: 'Black pepper', emoji: '⚫', unit: 'tsp', category: 'Herbs & Spices' },
  { name: 'Sugar', emoji: '🍬', unit: 'tbsp', category: 'Herbs & Spices' },
  { name: 'Chilli flakes', emoji: '🌶️', unit: 'tsp', category: 'Herbs & Spices' },
  { name: 'Paprika', emoji: '🌶️', unit: 'tsp', category: 'Herbs & Spices' },
  { name: 'Cumin', emoji: '🥄', unit: 'tsp', category: 'Herbs & Spices' },
  { name: 'Turmeric', emoji: '🟡', unit: 'tsp', category: 'Herbs & Spices' },
  { name: 'Cinnamon', emoji: '🟤', unit: 'tsp', category: 'Herbs & Spices' },
  { name: 'Curry powder', emoji: '🍛', unit: 'tbsp', category: 'Herbs & Spices' },
  { name: 'Basil', emoji: '🌿', unit: 'g', category: 'Herbs & Spices' },
  { name: 'Coriander', emoji: '🌿', unit: 'g', category: 'Herbs & Spices' },
  { name: 'Parsley', emoji: '🌿', unit: 'g', category: 'Herbs & Spices' },
  { name: 'Mint', emoji: '🌿', unit: 'g', category: 'Herbs & Spices' },
  { name: 'Thyme', emoji: '🌿', unit: 'sprigs', category: 'Herbs & Spices' },
  { name: 'Rosemary', emoji: '🌿', unit: 'sprigs', category: 'Herbs & Spices' },
  { name: 'Bay leaf', emoji: '🍃', unit: '', category: 'Herbs & Spices' },

  // Sauces & Oils
  { name: 'Soy sauce', emoji: '🍶', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Fish sauce', emoji: '🐟', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Oyster sauce', emoji: '🦪', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Olive oil', emoji: '🫒', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Vegetable oil', emoji: '🛢️', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Sesame oil', emoji: '🥜', unit: 'tsp', category: 'Sauces & Oils' },
  { name: 'Vinegar', emoji: '🍾', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Ketchup', emoji: '🍅', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Mayonnaise', emoji: '🥚', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Mustard', emoji: '🟨', unit: 'tsp', category: 'Sauces & Oils' },
  { name: 'Chilli sauce', emoji: '🌶️', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Stock', emoji: '🍲', unit: 'ml', category: 'Sauces & Oils' },
  { name: 'Water', emoji: '💧', unit: 'ml', category: 'Sauces & Oils' },
  { name: 'Wine', emoji: '🍷', unit: 'ml', category: 'Sauces & Oils' },

  // Baking & Sweet
  { name: 'Flour', emoji: '🌾', unit: 'g', category: 'Baking & Sweet' },
  { name: 'Baking powder', emoji: '🥄', unit: 'tsp', category: 'Baking & Sweet' },
  { name: 'Yeast', emoji: '🫧', unit: 'g', category: 'Baking & Sweet' },
  { name: 'Honey', emoji: '🍯', unit: 'tbsp', category: 'Baking & Sweet' },
  { name: 'Chocolate', emoji: '🍫', unit: 'g', category: 'Baking & Sweet' },
  { name: 'Cocoa powder', emoji: '🍫', unit: 'tbsp', category: 'Baking & Sweet' },
  { name: 'Vanilla extract', emoji: '🌼', unit: 'tsp', category: 'Baking & Sweet' },
  { name: 'Peanuts', emoji: '🥜', unit: 'g', category: 'Baking & Sweet' },
  { name: 'Almonds', emoji: '🌰', unit: 'g', category: 'Baking & Sweet' },
  { name: 'Ice cream', emoji: '🍨', unit: 'g', category: 'Baking & Sweet' },
]

/** Fallback for anything the list doesn't recognise. */
export const DEFAULT_INGREDIENT_EMOJI = '🥄'

const BY_NAME = new Map(COMMON_INGREDIENTS.map((i) => [i.name.toLowerCase(), i.emoji]))

// Longest first so "chicken breast" wins over "chicken", and "coconut milk"
// over "milk".
const BY_LENGTH = [...COMMON_INGREDIENTS].sort((a, b) => b.name.length - a.name.length)

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Crude singularisation — enough for "eggs", "tomatoes", "berries". */
function singular(value: string) {
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`
  if (value.endsWith('oes')) return value.slice(0, -2)
  if (value.endsWith('s') && !value.endsWith('ss')) return value.slice(0, -1)
  return value
}

/**
 * Best-effort emoji for a free-text ingredient name. Exact match first, then a
 * whole-word search so "2 cloves of garlic" and "garlic paste" both land on 🧄
 * without "oil" matching inside "boiling".
 */
export function emojiForIngredient(name: string): string {
  const key = name.trim().toLowerCase()
  if (!key) return DEFAULT_INGREDIENT_EMOJI

  const exact = BY_NAME.get(key) ?? BY_NAME.get(singular(key))
  if (exact) return exact

  const match = BY_LENGTH.find((i) =>
    new RegExp(`\\b${escapeRegExp(i.name.toLowerCase())}s?\\b`).test(key)
  )
  return match?.emoji ?? DEFAULT_INGREDIENT_EMOJI
}
