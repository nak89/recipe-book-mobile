/**
 * The dropdown's suggestions, not a closed set — `Recipe.cuisine` is a free
 * string on the backend and the picker lets you type anything. Anything not
 * listed here still saves and displays fine, just with the fallback emoji.
 */
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

const BY_NAME = new Map(CUISINES.map((c) => [c.name.toLowerCase(), c.emoji]))

export function emojiForCuisine(name?: string): string {
  if (!name) return DEFAULT_CUISINE_EMOJI
  return BY_NAME.get(name.trim().toLowerCase()) ?? DEFAULT_CUISINE_EMOJI
}
