/**
 * A hand-curated list of kitchen equipment, on exactly the same terms as
 * `ingredients.ts`: a shortcut, never a limit. `Recipe.tools` is a free-text
 * array end to end, and the form keeps its text field, so anything not here is
 * still perfectly valid.
 *
 * It exists because tools were the last list in the form you had to type from
 * memory, and typing produced the drift already visible in the backend seeds —
 * `mixing bowl` and `mixing bowls`, `frying pan` and `deep frying pan`, all
 * lowercase where the pantry is Title Case. The vocabulary below is those seeds
 * normalised: **Title Case, singular**, matching `COMMON_INGREDIENTS`.
 *
 * The Khmer list lives in `tools.km.ts` and is a *different list*, not a
 * translation — see `usePantry.ts` for why a picker follows the language toggle.
 */

/**
 * Generic over its category for the same reason `CommonIngredient` is: each
 * language's list keeps its own sections and its own compile-time check that
 * every entry names a real one.
 */
export interface CommonTool<C extends string = string> {
  name: string
  emoji: string
  category: C
}

export const TOOL_CATEGORIES = [
  'Pots & pans',
  'Prep & measuring',
  'Bakeware',
  'Appliances',
] as const

export type ToolCategory = (typeof TOOL_CATEGORIES)[number]

/**
 * Emoji coverage is thin here — Unicode has a frying pan and a knife but no
 * sieve, rolling pin or steamer. Rather than reach for something vaguely
 * related, anything without a real match falls back to 🍳, the same way the
 * pantry has a `DEFAULT_INGREDIENT_EMOJI`.
 */
export const DEFAULT_TOOL_EMOJI = '🍳'

export const COMMON_TOOLS: CommonTool<ToolCategory>[] = [
  // Pots & pans
  { name: 'Frying pan', emoji: '🍳', category: 'Pots & pans' },
  { name: 'Saucepan', emoji: '🥘', category: 'Pots & pans' },
  { name: 'Large pot', emoji: '🍲', category: 'Pots & pans' },
  { name: 'Stock pot', emoji: '🍲', category: 'Pots & pans' },
  { name: 'Wok', emoji: '🥘', category: 'Pots & pans' },
  { name: 'Dutch oven', emoji: '🍲', category: 'Pots & pans' },
  { name: 'Grill pan', emoji: '🔥', category: 'Pots & pans' },
  { name: 'Steamer', emoji: '♨️', category: 'Pots & pans' },
  { name: 'Lid', emoji: '🍳', category: 'Pots & pans' },

  // Prep & measuring
  { name: 'Knife', emoji: '🔪', category: 'Prep & measuring' },
  { name: 'Chopping board', emoji: '🪵', category: 'Prep & measuring' },
  { name: 'Mixing bowl', emoji: '🥣', category: 'Prep & measuring' },
  { name: 'Colander', emoji: '🧺', category: 'Prep & measuring' },
  { name: 'Sieve', emoji: '🧺', category: 'Prep & measuring' },
  { name: 'Grater', emoji: '🧀', category: 'Prep & measuring' },
  { name: 'Peeler', emoji: '🥔', category: 'Prep & measuring' },
  { name: 'Whisk', emoji: '🥄', category: 'Prep & measuring' },
  { name: 'Wooden spoon', emoji: '🥄', category: 'Prep & measuring' },
  { name: 'Spatula', emoji: '🥄', category: 'Prep & measuring' },
  { name: 'Tongs', emoji: '🍴', category: 'Prep & measuring' },
  { name: 'Ladle', emoji: '🥄', category: 'Prep & measuring' },
  { name: 'Potato masher', emoji: '🥔', category: 'Prep & measuring' },
  { name: 'Mortar and pestle', emoji: '🧉', category: 'Prep & measuring' },
  { name: 'Rolling pin', emoji: '🥖', category: 'Prep & measuring' },
  { name: 'Measuring jug', emoji: '🥛', category: 'Prep & measuring' },
  { name: 'Kitchen scale', emoji: '⚖️', category: 'Prep & measuring' },
  { name: 'Skewer', emoji: '🍢', category: 'Prep & measuring' },

  // Bakeware
  { name: 'Baking tray', emoji: '🍪', category: 'Bakeware' },
  { name: 'Baking dish', emoji: '🥧', category: 'Bakeware' },
  { name: 'Roasting tray', emoji: '🍗', category: 'Bakeware' },
  { name: 'Cake tin', emoji: '🎂', category: 'Bakeware' },
  { name: 'Muffin tin', emoji: '🧁', category: 'Bakeware' },
  { name: 'Pizza stone', emoji: '🍕', category: 'Bakeware' },
  { name: 'Baking paper', emoji: '📄', category: 'Bakeware' },

  // Appliances
  { name: 'Oven', emoji: '🔥', category: 'Appliances' },
  { name: 'Blender', emoji: '🍹', category: 'Appliances' },
  { name: 'Food processor', emoji: '🌀', category: 'Appliances' },
  { name: 'Hand mixer', emoji: '🌀', category: 'Appliances' },
  { name: 'Microwave', emoji: '📻', category: 'Appliances' },
  { name: 'Toaster', emoji: '🍞', category: 'Appliances' },
  { name: 'Rice cooker', emoji: '🍚', category: 'Appliances' },
  { name: 'Air fryer', emoji: '🍟', category: 'Appliances' },
  { name: 'Kettle', emoji: '🫖', category: 'Appliances' },
]
