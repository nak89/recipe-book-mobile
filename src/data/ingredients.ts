/**
 * A hand-curated pantry, not an exhaustive food database. It exists so the
 * common 80% of ingredients can be tapped instead of typed, and so every
 * ingredient the app displays can carry an emoji.
 *
 * Anything not in here is still perfectly valid — the picker is a shortcut, the
 * free-text row is the real input. Adding an entry here also teaches
 * `emojiForIngredient` a new word, so prefer extending this list over
 * hardcoding an emoji anywhere else.
 *
 * The Khmer pantry lives in `ingredients.km.ts` and is a *different list*, not a
 * translation of this one. `emojiForIngredient` below knows about both.
 */
import { foldForCompare } from '@/lib/text'
// A value import, and `ingredients.km.ts` imports only a *type* back — that's
// erased at compile time, so there is no runtime cycle between the two.
import { KHMER_INGREDIENTS } from './ingredients.km'

/**
 * Generic over its category so each language's pantry can keep its own sections
 * *and* its own compile-time check that every entry names a real one. The two
 * lists differ in length, sections and contents; nothing pairs them.
 *
 * The bare `CommonIngredient` (category widened to `string`) is what the picker
 * and the form consume, since they handle either list.
 */
export interface CommonIngredient<C extends string = string> {
  name: string
  emoji: string
  /** Prefilled when picked, so the usual case is one number away from done. */
  unit: string
  category: C
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

export const COMMON_INGREDIENTS: CommonIngredient<IngredientCategory>[] = [
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
  // Pulses, added for the starter packs, which lean on them. Note the ordering
  // these rely on: `emojiForIngredient` matches whole words longest-first, so
  // 'Kidney beans' and 'White beans' win over a bare 'beans' appearing inside
  // another name.
  { name: 'Chickpeas', emoji: '🫘', unit: 'g', category: 'Vegetables' },
  { name: 'Kidney beans', emoji: '🫘', unit: 'g', category: 'Vegetables' },
  { name: 'White beans', emoji: '🫘', unit: 'g', category: 'Vegetables' },
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
  { name: 'Oregano', emoji: '🌿', unit: 'tsp', category: 'Herbs & Spices' },
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

  // ── The Explore library's pantry ────────────────────────────────────────────
  //
  // Every ingredient named by the eight recipes in the backend's
  // `data/library.ts`, which this list had no word for. Until these existed, a
  // Khmer dish browsed in the *English* UI rendered most of its rows on the
  // default 🥄 — the Khmer pantry (`ingredients.km.ts`) has known គ្រឿង, រំដេង
  // and ស្លឹកគ្រៃ from the start, and only the Latin side was missing them.
  //
  // Grouped by category like everything above, but appended as a block rather
  // than filed into the sections: the picker groups on the `category` field, not
  // on position, so this stays legible as "what Explore needed" without changing
  // a single row of what the picker shows.
  //
  // **These names are load-bearing.** `data/library.ts` spells its ingredients
  // against this list exactly; renaming an entry here silently drops the emoji
  // from every library recipe using it, and from every copy a user has already
  // taken. The backend test group 13 will not catch it — nothing crosses that
  // boundary but the string itself.

  // Vegetables
  { name: 'Galangal', emoji: '🫚', unit: 'g', category: 'Vegetables' },
  { name: 'Shallots', emoji: '🧅', unit: 'g', category: 'Vegetables' },
  { name: 'Snow peas', emoji: '🫛', unit: 'g', category: 'Vegetables' },
  { name: 'Pumpkin', emoji: '🎃', unit: 'g', category: 'Vegetables' },
  { name: 'Taro', emoji: '🟣', unit: 'g', category: 'Vegetables' },
  { name: 'Beetroot', emoji: '🟥', unit: '', category: 'Vegetables' },
  { name: 'Green cubanelle peppers', emoji: '🫑', unit: 'g', category: 'Vegetables' },
  { name: 'Long red pepper', emoji: '🌶️', unit: '', category: 'Vegetables' },
  { name: 'Pickled scallion heads', emoji: '🫙', unit: 'g', category: 'Vegetables' },

  // Fruit
  { name: 'Longan', emoji: '🟤', unit: 'g', category: 'Fruit' },
  { name: 'Coconut cream', emoji: '🥥', unit: 'ml', category: 'Fruit' },
  { name: 'Shredded coconut', emoji: '🥥', unit: 'g', category: 'Fruit' },
  { name: 'Lime juice', emoji: '🍈', unit: 'ml', category: 'Fruit' },
  { name: 'Bitter orange juice', emoji: '🍊', unit: 'ml', category: 'Fruit' },
  { name: 'Bitter orange zest', emoji: '🍊', unit: 'g', category: 'Fruit' },

  // Meat & Fish
  { name: 'Snakehead fish', emoji: '🐟', unit: 'g', category: 'Meat & Fish' },
  { name: 'Beef tenderloin', emoji: '🥩', unit: 'g', category: 'Meat & Fish' },
  { name: 'Minced pork belly', emoji: '🥓', unit: 'g', category: 'Meat & Fish' },
  { name: 'Dried shrimp', emoji: '🦐', unit: 'g', category: 'Meat & Fish' },

  // Herbs & Spices
  { name: 'Kroeung', emoji: '🌿', unit: 'g', category: 'Herbs & Spices' },
  { name: 'Kaffir lime leaves', emoji: '🍃', unit: 'leaves', category: 'Herbs & Spices' },
  { name: 'Kaffir lime zest', emoji: '🍋', unit: 'g', category: 'Herbs & Spices' },
  { name: 'Fresh turmeric', emoji: '🟡', unit: 'g', category: 'Herbs & Spices' },
  { name: 'Khmer basil', emoji: '🌿', unit: 'bunch', category: 'Herbs & Spices' },
  { name: 'Mixed basil', emoji: '🌿', unit: 'g', category: 'Herbs & Spices' },
  { name: 'Coriander root', emoji: '🌿', unit: 'g', category: 'Herbs & Spices' },
  { name: 'Pandan leaves', emoji: '🍃', unit: 'leaves', category: 'Herbs & Spices' },
  { name: 'Kampot pepper', emoji: '⚫', unit: 'tsp', category: 'Herbs & Spices' },
  // Distinct from 'Salt' rather than a synonym for it: they are different things
  // on a shelf, and `emojiForIngredient` resolves longest-first, so "sea salt"
  // lands here while "salt" still lands on 🧂.
  { name: 'Sea salt', emoji: '🧂', unit: 'tsp', category: 'Herbs & Spices' },
  // 🍲, the same mark `Stock` carries, rather than the generic spoon — chicken
  // powder *is* stock, and an entry whose emoji happens to equal
  // `DEFAULT_INGREDIENT_EMOJI` is indistinguishable on screen from one the
  // lookup never found.
  { name: 'Chicken powder', emoji: '🍲', unit: 'g', category: 'Herbs & Spices' },

  // Sauces & Oils
  { name: 'Shrimp paste', emoji: '🦐', unit: 'g', category: 'Sauces & Oils' },
  { name: 'Kapi phao', emoji: '🦐', unit: 'g', category: 'Sauces & Oils' },
  { name: 'Cooking oil', emoji: '🛢️', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Chinese cooking wine', emoji: '🍶', unit: 'tbsp', category: 'Sauces & Oils' },
  { name: 'Pickled scallion brine', emoji: '🫙', unit: 'ml', category: 'Sauces & Oils' },
  // Fresh and dried are separate products and separate shopping lines, which is
  // why both are here rather than one standing in for the other.
  { name: 'Red cubanelle pepper paste', emoji: '🌶️', unit: 'g', category: 'Sauces & Oils' },
  { name: 'Dried red cubanelle pepper paste', emoji: '🌶️', unit: 'g', category: 'Sauces & Oils' },

  // Grains & Pasta
  { name: 'Sticky rice flour', emoji: '🌾', unit: 'g', category: 'Grains & Pasta' },

  // Baking & Sweet
  { name: 'Palm sugar', emoji: '🍯', unit: 'g', category: 'Baking & Sweet' },
  { name: 'Brown sugar', emoji: '🟤', unit: 'g', category: 'Baking & Sweet' },
  { name: 'Roasted peanuts', emoji: '🥜', unit: 'g', category: 'Baking & Sweet' },
]

/** Fallback for anything the list doesn't recognise. */
export const DEFAULT_INGREDIENT_EMOJI = '🥄'

/**
 * **Both pantries, unconditionally — this must never consult the language.**
 *
 * The picker swaps lists when the toggle moves, because what it writes has to be
 * in the language you're working in. This lookup is the opposite case: it runs on
 * the *stored* name at render time, on recipes written who-knows-when. If it
 * followed the current language, flipping to English would strip the emoji off
 * every recipe the user had written in Khmer, and flipping back would restore
 * them. That's the toggle reaching into content, which is the one thing the
 * language feature promises not to do.
 *
 * Knowing both lists costs one concatenation and makes the question moot.
 */
const BY_NAME = new Map(
  [...COMMON_INGREDIENTS, ...KHMER_INGREDIENTS].map((i) => [foldForCompare(i.name), i.emoji])
)

// Longest first so "chicken breast" wins over "chicken", and "coconut milk"
// over "milk". Kept per-script: the fallback scan below picks the list matching
// the query, so a Latin regex never walks a hundred Khmer names it cannot match.
const LATIN_BY_LENGTH = [...COMMON_INGREDIENTS].sort((a, b) => b.name.length - a.name.length)
const KHMER_BY_LENGTH = [...KHMER_INGREDIENTS].sort((a, b) => b.name.length - a.name.length)

/** The Khmer block. Enough to route a name to the right fallback strategy. */
const HAS_KHMER = /[ក-៿]/

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
 * Best-effort emoji for a free-text ingredient name, in either language. Exact
 * match first, then a fallback scan whose strategy depends on the script.
 *
 * Folded rather than lowercased throughout, so a Khmer name carrying an
 * invisible zero-width space still finds its entry — see `lib/text.ts`.
 */
export function emojiForIngredient(name: string): string {
  const key = foldForCompare(name)
  if (!key) return DEFAULT_INGREDIENT_EMOJI

  const exact = BY_NAME.get(key) ?? BY_NAME.get(singular(key))
  if (exact) return exact

  if (HAS_KHMER.test(key)) {
    // Khmer is written without spaces between words, so there are no boundaries
    // to anchor on — `\b` is defined over [A-Za-z0-9_] and can never match here.
    // A longest-first substring scan is what the absence of spaces actually
    // calls for, and with no pluralisation to undo it's simpler than the Latin
    // path rather than harder.
    const match = KHMER_BY_LENGTH.find((i) => key.includes(foldForCompare(i.name)))
    return match?.emoji ?? DEFAULT_INGREDIENT_EMOJI
  }

  // Whole words, so "2 cloves of garlic" and "garlic paste" both land on 🧄
  // without "oil" matching inside "boiling".
  const match = LATIN_BY_LENGTH.find((i) =>
    new RegExp(`\\b${escapeRegExp(foldForCompare(i.name))}s?\\b`).test(key)
  )
  return match?.emoji ?? DEFAULT_INGREDIENT_EMOJI
}
