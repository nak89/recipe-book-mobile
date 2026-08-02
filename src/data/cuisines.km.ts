import type { Cuisine } from './cuisines'

/**
 * The Khmer cuisine suggestions.
 *
 * Unlike the pantry, this one *is* a translation — cuisines are proper nouns for
 * the same set of countries either way, so a "curated Cambodian list" would just
 * be the same list reordered. Cambodian leads in both, as it already did.
 *
 * **The flags are identical on purpose.** A flag is not language-dependent, so
 * there is nothing to translate about 🇰🇭, and duplicating them keeps the two
 * lists visually the same control in both languages.
 *
 * Still only suggestions: `Recipe.cuisine` is a free string end to end and the
 * `Select` keeps `allowCustom` on, so anything typed here saves fine.
 */
export const KHMER_CUISINES: Cuisine[] = [
  { name: 'ខ្មែរ', emoji: '🇰🇭' },
  { name: 'វៀតណាម', emoji: '🇻🇳' },
  { name: 'ថៃ', emoji: '🇹🇭' },
  { name: 'ចិន', emoji: '🇨🇳' },
  { name: 'ជប៉ុន', emoji: '🇯🇵' },
  { name: 'កូរ៉េ', emoji: '🇰🇷' },
  { name: 'ហ្វីលីពីន', emoji: '🇵🇭' },
  { name: 'ឥណ្ឌូនេស៊ី', emoji: '🇮🇩' },
  { name: 'ម៉ាឡេស៊ី', emoji: '🇲🇾' },
  { name: 'ឥណ្ឌា', emoji: '🇮🇳' },
  { name: 'អ៊ីតាលី', emoji: '🇮🇹' },
  { name: 'បារាំង', emoji: '🇫🇷' },
  { name: 'អេស្ប៉ាញ', emoji: '🇪🇸' },
  { name: 'ក្រិក', emoji: '🇬🇷' },
  { name: 'អាល្លឺម៉ង់', emoji: '🇩🇪' },
  { name: 'អង់គ្លេស', emoji: '🇬🇧' },
  { name: 'អាមេរិក', emoji: '🇺🇸' },
  { name: 'ម៉ិកស៊ិក', emoji: '🇲🇽' },
  { name: 'ប្រេស៊ីល', emoji: '🇧🇷' },
  { name: 'ប៉េរូ', emoji: '🇵🇪' },
  { name: 'ការ៉ាប៊ីន', emoji: '🏝️' },
  { name: 'ទួរគី', emoji: '🇹🇷' },
  { name: 'លីបង់', emoji: '🇱🇧' },
  { name: 'ម៉ារ៉ុក', emoji: '🇲🇦' },
  { name: 'អេត្យូពី', emoji: '🇪🇹' },
  { name: 'ចម្រុះ', emoji: '🍽️' },
]
