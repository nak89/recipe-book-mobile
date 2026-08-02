import type { CommonIngredient } from './ingredients'

/**
 * The Khmer pantry — a **curated Cambodian list, not a translation** of
 * `ingredients.ts`.
 *
 * (The `.km.` in the filename is a language tag, not a Metro platform suffix.
 * Metro only resolves platforms it's configured with — ios, android, web, native
 * — so this is an ordinary module.)
 *
 * Translating the English list one-for-one would have shipped oregano,
 * mayonnaise and rosemary to a Cambodian cook while omitting prahok: an English
 * pantry wearing Khmer labels. So the two lists share a shape and nothing else.
 * They differ in length, in categories, and in what they think a kitchen
 * contains. Nothing pairs an entry here with an entry there, and nothing should.
 *
 * ## Why the picker may swap lists but the emoji lookup may not
 *
 * Tapping a row here writes its `name` into the user's recipe, so the list has
 * to be in the language they're working in — that's the whole point. But
 * `emojiForIngredient` runs on the **stored** name at render time, long after
 * the fact. If *its* map followed the current language, flipping the toggle
 * would strip the emoji off recipes the user already wrote. So the lookup is
 * built from both lists at once and never consults the toggle. See
 * `ingredients.ts`.
 *
 * ## Units
 *
 * Count-words are Khmer (កំពិស for cloves, ដើម for stalks, សន្លឹក for leaves);
 * measurement abbreviations stay Latin (`g`, `ml`, `kg`, `tbsp`, `tsp`). That's
 * how measurements are actually written in Cambodian recipes, it keeps them
 * legible to anyone, and it matters practically: the ingredient row's unit
 * column is a fixed width that must never wrap to a second line, and the Khmer
 * for "teaspoon" is four times the length of "tsp".
 */

export const KHMER_INGREDIENT_CATEGORIES = [
  'បន្លែ',
  'ផ្លែឈើ',
  'សាច់ និងត្រី',
  'គ្រឿងទេស',
  'ទឹកជ្រលក់ និងប្រេង',
  'អង្ករ និងមី',
  'ស៊ុត និងទឹកដោះ',
  'គ្រឿងផ្អែម',
] as const

export type KhmerIngredientCategory = (typeof KHMER_INGREDIENT_CATEGORIES)[number]

export const KHMER_INGREDIENTS: CommonIngredient<KhmerIngredientCategory>[] = [
  // ---------------------------------------------------------------- បន្លែ
  { name: 'ខ្ទឹមស', emoji: '🧄', unit: 'កំពិស', category: 'បន្លែ' },
  { name: 'ខ្ទឹមបារាំង', emoji: '🧅', unit: '', category: 'បន្លែ' },
  { name: 'ខ្ទឹមក្រហម', emoji: '🧅', unit: '', category: 'បន្លែ' },
  { name: 'ស្លឹកខ្ទឹម', emoji: '🌿', unit: 'ដើម', category: 'បន្លែ' },
  { name: 'ប៉េងប៉ោះ', emoji: '🍅', unit: '', category: 'បន្លែ' },
  { name: 'ដំឡូងបារាំង', emoji: '🥔', unit: 'g', category: 'បន្លែ' },
  { name: 'ដំឡូងជ្វា', emoji: '🍠', unit: 'g', category: 'បន្លែ' },
  { name: 'ការ៉ុត', emoji: '🥕', unit: '', category: 'បន្លែ' },
  { name: 'ស្ពៃក្តោប', emoji: '🥬', unit: 'g', category: 'បន្លែ' },
  { name: 'ស្ពៃចង្រុំ', emoji: '🥬', unit: 'g', category: 'បន្លែ' },
  // Morning glory — on more Cambodian tables than any leaf on the English list.
  { name: 'ត្រកួន', emoji: '🥬', unit: 'ក្រណាត់', category: 'បន្លែ' },
  { name: 'ត្រសក់', emoji: '🥒', unit: '', category: 'បន្លែ' },
  { name: 'ម្ទេសផ្លោក', emoji: '🫑', unit: '', category: 'បន្លែ' },
  { name: 'ម្ទេស', emoji: '🌶️', unit: 'គ្រាប់', category: 'បន្លែ' },
  { name: 'ផ្សិត', emoji: '🍄', unit: 'g', category: 'បន្លែ' },
  { name: 'ពោត', emoji: '🌽', unit: '', category: 'បន្លែ' },
  { name: 'ត្រប់', emoji: '🍆', unit: '', category: 'បន្លែ' },
  { name: 'ល្ពៅ', emoji: '🎃', unit: 'g', category: 'បន្លែ' },
  { name: 'ត្រឡាច', emoji: '🥒', unit: 'g', category: 'បន្លែ' },
  { name: 'ម្រះព្រៅ', emoji: '🥒', unit: 'g', category: 'បន្លែ' },
  { name: 'សណ្តែកបណ្តុះ', emoji: '🌱', unit: 'g', category: 'បន្លែ' },
  { name: 'សណ្តែកកួរ', emoji: '🫛', unit: 'g', category: 'បន្លែ' },
  { name: 'សណ្តែកដី', emoji: '🥜', unit: 'g', category: 'បន្លែ' },
  { name: 'ផ្កាចេក', emoji: '🌸', unit: '', category: 'បន្លែ' },
  { name: 'ត្រាវ', emoji: '🥔', unit: 'g', category: 'បន្លែ' },
  { name: 'ឆៃថាវ', emoji: '🥕', unit: 'g', category: 'បន្លែ' },

  // -------------------------------------------------------------- ផ្លែឈើ
  { name: 'ចេក', emoji: '🍌', unit: '', category: 'ផ្លែឈើ' },
  { name: 'ស្វាយ', emoji: '🥭', unit: '', category: 'ផ្លែឈើ' },
  { name: 'ល្ហុង', emoji: '🥭', unit: '', category: 'ផ្លែឈើ' },
  { name: 'ម្នាស់', emoji: '🍍', unit: '', category: 'ផ្លែឈើ' },
  { name: 'ឪឡឹក', emoji: '🍉', unit: '', category: 'ផ្លែឈើ' },
  { name: 'ក្រូចឆ្មារ', emoji: '🍋', unit: '', category: 'ផ្លែឈើ' },
  { name: 'ក្រូច', emoji: '🍊', unit: '', category: 'ផ្លែឈើ' },
  { name: 'ដូង', emoji: '🥥', unit: '', category: 'ផ្លែឈើ' },
  { name: 'ត្នោត', emoji: '🌴', unit: '', category: 'ផ្លែឈើ' },
  { name: 'អំពិល', emoji: '🟤', unit: 'g', category: 'ផ្លែឈើ' },
  { name: 'ធូរេន', emoji: '🍈', unit: '', category: 'ផ្លែឈើ' },
  { name: 'មៀន', emoji: '🍈', unit: '', category: 'ផ្លែឈើ' },

  // --------------------------------------------------------- សាច់ និងត្រី
  { name: 'សាច់មាន់', emoji: '🍗', unit: 'g', category: 'សាច់ និងត្រី' },
  // 🥓 rather than 🥩, matching what the English list picked for Pork — beef
  // already owns 🥩 and two identical emoji in one section reads as a mistake.
  { name: 'សាច់ជ្រូក', emoji: '🥓', unit: 'g', category: 'សាច់ និងត្រី' },
  { name: 'សាច់គោ', emoji: '🥩', unit: 'g', category: 'សាច់ និងត្រី' },
  { name: 'សាច់ទា', emoji: '🦆', unit: 'g', category: 'សាច់ និងត្រី' },
  { name: 'សាច់ក្រក', emoji: '🌭', unit: 'g', category: 'សាច់ និងត្រី' },
  { name: 'ត្រី', emoji: '🐟', unit: 'g', category: 'សាច់ និងត្រី' },
  { name: 'ត្រីងៀត', emoji: '🐟', unit: 'g', category: 'សាច់ និងត្រី' },
  { name: 'បង្គា', emoji: '🍤', unit: 'g', category: 'សាច់ និងត្រី' },
  { name: 'ក្តាម', emoji: '🦀', unit: '', category: 'សាច់ និងត្រី' },
  { name: 'ខ្យង', emoji: '🐚', unit: 'g', category: 'សាច់ និងត្រី' },
  { name: 'មឹក', emoji: '🦑', unit: 'g', category: 'សាច់ និងត្រី' },

  // ------------------------------------------------------------ គ្រឿងទេស
  // Kroeung is the paste half of most Cambodian savoury cooking, so it leads.
  { name: 'គ្រឿង', emoji: '🌿', unit: 'tbsp', category: 'គ្រឿងទេស' },
  { name: 'ស្លឹកគ្រៃ', emoji: '🌿', unit: 'ដើម', category: 'គ្រឿងទេស' },
  { name: 'ខ្ញី', emoji: '🫚', unit: 'g', category: 'គ្រឿងទេស' },
  { name: 'រំដេង', emoji: '🫚', unit: 'g', category: 'គ្រឿងទេស' },
  { name: 'រមៀត', emoji: '🟡', unit: 'tsp', category: 'គ្រឿងទេស' },
  { name: 'ស្លឹកក្រូចសើច', emoji: '🍃', unit: 'សន្លឹក', category: 'គ្រឿងទេស' },
  { name: 'ក្រូចសើច', emoji: '🍋', unit: '', category: 'គ្រឿងទេស' },
  { name: 'ជីវ៉ាន់ស៊ុយ', emoji: '🌿', unit: 'g', category: 'គ្រឿងទេស' },
  { name: 'ជីអង្កាម', emoji: '🌿', unit: 'g', category: 'គ្រឿងទេស' },
  { name: 'ស្លឹកម្រះ', emoji: '🌿', unit: 'g', category: 'គ្រឿងទេស' },
  // Kampot pepper is the one Cambodian ingredient with a protected origin.
  { name: 'ម្រេច', emoji: '⚫', unit: 'tsp', category: 'គ្រឿងទេស' },
  { name: 'ម្រេចខ្ចី', emoji: '🟢', unit: 'ដើម', category: 'គ្រឿងទេស' },
  { name: 'អំបិល', emoji: '🧂', unit: 'tsp', category: 'គ្រឿងទេស' },
  { name: 'ស្ករគ្រាប់', emoji: '⚪', unit: 'tsp', category: 'គ្រឿងទេស' },
  { name: 'ម្សៅការី', emoji: '🍛', unit: 'tbsp', category: 'គ្រឿងទេស' },
  { name: 'ល្ង', emoji: '🌰', unit: 'tbsp', category: 'គ្រឿងទេស' },

  // ------------------------------------------------- ទឹកជ្រលក់ និងប្រេង
  { name: 'ទឹកត្រី', emoji: '🐟', unit: 'tbsp', category: 'ទឹកជ្រលក់ និងប្រេង' },
  // Prahok — fermented fish paste. Nothing on the English list stands in for it.
  { name: 'ប្រហុក', emoji: '🐟', unit: 'tbsp', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ទឹកស៊ីអ៊ីវ', emoji: '🍶', unit: 'tbsp', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ទឹកខ្យង', emoji: '🦪', unit: 'tbsp', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ប្រេងឆា', emoji: '🛢️', unit: 'tbsp', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ប្រេងល្ង', emoji: '🥜', unit: 'tsp', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ទឹកខ្មេះ', emoji: '🍾', unit: 'tbsp', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ទឹកដូង', emoji: '🥥', unit: 'ml', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ទឹកអំពិល', emoji: '🟤', unit: 'tbsp', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ទឹកស៊ុប', emoji: '🍲', unit: 'ml', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ទឹក', emoji: '💧', unit: 'ml', category: 'ទឹកជ្រលក់ និងប្រេង' },
  { name: 'ទឹកម្ទេស', emoji: '🌶️', unit: 'tbsp', category: 'ទឹកជ្រលក់ និងប្រេង' },

  // --------------------------------------------------------- អង្ករ និងមី
  { name: 'អង្ករ', emoji: '🌾', unit: 'g', category: 'អង្ករ និងមី' },
  { name: 'បាយ', emoji: '🍚', unit: 'g', category: 'អង្ករ និងមី' },
  { name: 'អង្ករដំណើប', emoji: '🌾', unit: 'g', category: 'អង្ករ និងមី' },
  { name: 'គុយទាវ', emoji: '🍜', unit: 'g', category: 'អង្ករ និងមី' },
  { name: 'នំបញ្ចុក', emoji: '🍜', unit: 'g', category: 'អង្ករ និងមី' },
  { name: 'មី', emoji: '🍜', unit: 'g', category: 'អង្ករ និងមី' },
  { name: 'ប៉ាស្តា', emoji: '🍝', unit: 'g', category: 'អង្ករ និងមី' },
  { name: 'នំបុ័ង', emoji: '🥖', unit: '', category: 'អង្ករ និងមី' },
  { name: 'ម្សៅអង្ករ', emoji: '🌾', unit: 'g', category: 'អង្ករ និងមី' },
  { name: 'ស្បែកនំប៉ាវ', emoji: '🥟', unit: 'សន្លឹក', category: 'អង្ករ និងមី' },

  // ---------------------------------------------------- ស៊ុត និងទឹកដោះ
  { name: 'ស៊ុតមាន់', emoji: '🥚', unit: '', category: 'ស៊ុត និងទឹកដោះ' },
  { name: 'ស៊ុតទា', emoji: '🥚', unit: '', category: 'ស៊ុត និងទឹកដោះ' },
  { name: 'ទឹកដោះគោ', emoji: '🥛', unit: 'ml', category: 'ស៊ុត និងទឹកដោះ' },
  { name: 'ទឹកដោះគោខាប់', emoji: '🥛', unit: 'ml', category: 'ស៊ុត និងទឹកដោះ' },
  { name: 'ប៊ឺ', emoji: '🧈', unit: 'g', category: 'ស៊ុត និងទឹកដោះ' },
  { name: 'ឈីស', emoji: '🧀', unit: 'g', category: 'ស៊ុត និងទឹកដោះ' },
  { name: 'ទឹកដោះជូរ', emoji: '🥣', unit: 'g', category: 'ស៊ុត និងទឹកដោះ' },
  { name: 'តៅហ៊ូ', emoji: '⬜', unit: 'g', category: 'ស៊ុត និងទឹកដោះ' },

  // ------------------------------------------------------------ គ្រឿងផ្អែម
  // Palm sugar, not cane — it's the default sweetener in Cambodian cooking.
  { name: 'ស្ករត្នោត', emoji: '🟤', unit: 'g', category: 'គ្រឿងផ្អែម' },
  { name: 'ស្ករស', emoji: '🍬', unit: 'g', category: 'គ្រឿងផ្អែម' },
  { name: 'ទឹកឃ្មុំ', emoji: '🍯', unit: 'tbsp', category: 'គ្រឿងផ្អែម' },
  { name: 'ម្សៅ', emoji: '🌾', unit: 'g', category: 'គ្រឿងផ្អែម' },
  { name: 'ម្សៅដំណើប', emoji: '🌾', unit: 'g', category: 'គ្រឿងផ្អែម' },
  { name: 'សូកូឡា', emoji: '🍫', unit: 'g', category: 'គ្រឿងផ្អែម' },
  { name: 'ការ៉េម', emoji: '🍨', unit: 'g', category: 'គ្រឿងផ្អែម' },
  { name: 'នំកែក', emoji: '🍪', unit: '', category: 'គ្រឿងផ្អែម' },
]
