/**
 * The units offered by the ingredient row's unit picker.
 *
 * `Ingredient.unit` is free text (max 50, `''` explicitly allowed) and stays
 * that way — this list is a shortcut, exactly like the pantry and the cuisine
 * list. The picker keeps a "use what I typed" row for anything not here.
 *
 * The Count group is drawn from what `COMMON_INGREDIENTS` actually ships as a
 * default unit (`cloves`, `stalks`, `sprigs`, `strips`, `slices`), so picking a
 * pantry ingredient never lands on a unit its own picker can't show as chosen.
 *
 * The Khmer list is in `units.km.ts`, and — unlike the tool and ingredient
 * lists — it is only *partly* different. See the note there.
 */

export interface UnitGroup {
  /** Section heading in the picker. Chrome, so it's translated per language. */
  category: string
  units: string[]
}

export const UNIT_GROUPS: UnitGroup[] = [
  { category: 'Weight', units: ['g', 'kg', 'oz', 'lb'] },
  { category: 'Volume', units: ['ml', 'l', 'tsp', 'tbsp', 'cup'] },
  {
    category: 'Count',
    units: ['pcs', 'cloves', 'slices', 'stalks', 'sprigs', 'strips', 'leaves', 'pinch', 'handful'],
  },
]
