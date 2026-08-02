/**
 * The dropdown's suggestions, not a closed set — `Recipe.cuisine` is a free
 * string on the backend and the picker lets you type anything. Anything not
 * listed here still saves and displays fine, just with the fallback emoji.
 *
 * The Khmer suggestions live in `cuisines.km.ts` with identical flags.
 * `emojiForCuisine` below knows about both lists.
 */
import { foldForCompare } from '@/lib/text'
// Value import; `cuisines.km.ts` imports only a *type* back, which is erased at
// compile time, so there is no runtime cycle.
import { KHMER_CUISINES } from './cuisines.km'

export interface Cuisine {
  name: string
  emoji: string
}

export const CUISINES: Cuisine[] = [
  { name: 'Cambodian', emoji: '🇰🇭' },
  { name: 'Vietnamese', emoji: '🇻🇳' },
  { name: 'Thai', emoji: '🇹🇭' },
  { name: 'Chinese', emoji: '🇨🇳' },
  { name: 'Japanese', emoji: '🇯🇵' },
  { name: 'Korean', emoji: '🇰🇷' },
  { name: 'Filipino', emoji: '🇵🇭' },
  { name: 'Indonesian', emoji: '🇮🇩' },
  { name: 'Malaysian', emoji: '🇲🇾' },
  { name: 'Indian', emoji: '🇮🇳' },
  { name: 'Italian', emoji: '🇮🇹' },
  { name: 'French', emoji: '🇫🇷' },
  { name: 'Spanish', emoji: '🇪🇸' },
  { name: 'Greek', emoji: '🇬🇷' },
  { name: 'German', emoji: '🇩🇪' },
  { name: 'British', emoji: '🇬🇧' },
  { name: 'American', emoji: '🇺🇸' },
  { name: 'Mexican', emoji: '🇲🇽' },
  { name: 'Brazilian', emoji: '🇧🇷' },
  { name: 'Peruvian', emoji: '🇵🇪' },
  { name: 'Caribbean', emoji: '🏝️' },
  { name: 'Turkish', emoji: '🇹🇷' },
  { name: 'Lebanese', emoji: '🇱🇧' },
  { name: 'Moroccan', emoji: '🇲🇦' },
  { name: 'Ethiopian', emoji: '🇪🇹' },
  { name: 'Fusion', emoji: '🍽️' },
]

export const DEFAULT_CUISINE_EMOJI = '🌍'

/**
 * **Both lists, unconditionally — never language-dependent.**
 *
 * Same reasoning as `emojiForIngredient`: this runs on the *stored* cuisine at
 * render time. If it followed the toggle, a recipe saved with a Khmer cuisine
 * would lose its flag the moment the user switched to English. Knowing both
 * lists costs one concatenation and removes the question.
 *
 * Folded rather than lowercased so a Khmer name carrying an invisible zero-width
 * space still resolves — see `lib/text.ts`.
 */
const BY_NAME = new Map(
  [...CUISINES, ...KHMER_CUISINES].map((c) => [foldForCompare(c.name), c.emoji])
)

export function emojiForCuisine(name?: string): string {
  if (!name) return DEFAULT_CUISINE_EMOJI
  return BY_NAME.get(foldForCompare(name)) ?? DEFAULT_CUISINE_EMOJI
}
