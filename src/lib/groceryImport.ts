import { UNIT_GROUPS } from '@/data/units'
import { KHMER_UNITS } from '@/data/units.km'
import { parseNumeric, toLatinDigits } from '@/lib/numerals'
import { foldForCompare } from '@/lib/text'

export const MAX_GROCERY_ITEMS_PER_WEEK = 200

export interface GroceryImportItem {
  name: string
  amount: number
  unit: string
}

export interface GroceryImportRow {
  id: number
  name: string
  amount: string
  unit: string
}

type ManualGrocery = {
  destination?: 'manual' | 'day' | 'week'
  shoppingDate?: string | null
  ticked: boolean
}

export function manualGroceryVisible(
  item: ManualGrocery,
  scope: 'day' | 'week' | 'missing',
  focusDate: string,
) {
  if (scope === 'missing') return !item.ticked
  if (scope === 'week' || item.destination === 'manual' || !item.destination) return true
  return item.destination === 'day' && item.shoppingDate === focusDate
}

const unitAliases = new Map<string, string>()
for (const { units } of UNIT_GROUPS) {
  for (const unit of units) unitAliases.set(unit, unit)
}
for (const aliases of [
  ['g', 'gram', 'grams'], ['kg', 'kilogram', 'kilograms', 'គីឡូ', 'គីឡូក្រាម'],
  ['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters', 'មីលីលីត្រ'],
  ['l', 'litre', 'litres', 'liter', 'liters', 'លីត្រ'],
  ['oz', 'ounce', 'ounces'], ['lb', 'pound', 'pounds', 'lbs'],
  ['tsp', 'teaspoon', 'teaspoons', 'ស្លាបព្រាកាហ្វេ'],
  ['tbsp', 'tablespoon', 'tablespoons', 'ស្លាបព្រាបាយ'],
  ['bag', 'bags'], ['bottle', 'bottles'], ['box', 'boxes'], ['can', 'cans'],
  ['carton', 'cartons'], ['jar', 'jars'], ['pack', 'packs', 'packet', 'packets'],
  ['piece', 'pieces', 'pcs'], ['leaf', 'leaves'], ['bunch', 'bunches'],
  ['pinch', 'pinches'], ['handful', 'handfuls'],
  ['clove', 'cloves'], ['slice', 'slices'], ['stalk', 'stalks'], ['sprig', 'sprigs'],
  ['strip', 'strips'], ['seed', 'seeds'], ['sheet', 'sheets'], ['whole', 'wholes'], ['cup', 'cups'],
]) {
  for (const unit of aliases) unitAliases.set(unit, aliases[0])
}
for (const unit of Object.values(KHMER_UNITS)) unitAliases.set(foldForCompare(unit), unit)
for (const unit of ['ថង់', 'ដប', 'ប្រអប់', 'កញ្ចប់', 'កំប៉ុង']) unitAliases.set(unit, unit)

function unitKey(unit: string) {
  const folded = foldForCompare(unit)
  return unitAliases.get(folded) ?? folded
}

export function groceryImportKey(name: string, unit: string) {
  return JSON.stringify([foldForCompare(name).replace(/\s+/g, ' '), unitKey(unit)])
}

const digit = '[0-9០-៩]'
const amount = `(?:(?:${digit}+[ \\t]+)?${digit}+\\/${digit}+|${digit}+(?:\\.${digit}+)?|\\.${digit}+)`
const quantity = `${amount}(?:\\s*[-–—−]\\s*${amount})?`
const leadingQuantity = new RegExp(`^(${quantity})(?=$|[\\s\\p{L}])\\s*(.*)$`, 'u')
const trailingQuantity = new RegExp(`^(.+?[\\s\\u1780-\\u17DD])\\s*(${quantity})\\s*(.*)$`, 'u')

function readQuantity(value: string): number {
  return Math.max(...value.split(/[-–—−]/).map((part) => {
    const numeric = toLatinDigits(part).trim()
    const fraction = /^(?:(\d+)\s+)?(\d+)\/(\d+)$/.exec(numeric)
    if (!fraction) return Number(numeric)
    const denominator = Number(fraction[3])
    return denominator > 0 ? Number(fraction[1] ?? 0) + Number(fraction[2]) / denominator : NaN
  }))
}

function parseLine(line: string): GroceryImportItem {
  const leading = leadingQuantity.exec(line)
  if (leading) {
    const [, quantity, rest] = leading
    const [unit] = rest.split(/\s+/)
    if (unitAliases.has(foldForCompare(unit))) {
      const name = rest.slice(unit.length).trim().replace(/^of(?:\s+|$)/i, '')
      return { name, amount: readQuantity(quantity), unit }
    }
    return { name: rest.trim(), amount: readQuantity(quantity), unit: '' }
  }

  const trailing = trailingQuantity.exec(line)
  if (trailing) {
    const [, name, quantity, unit] = trailing
    const cleanUnit = unit.trim()
    if (!cleanUnit || unitAliases.has(foldForCompare(cleanUnit))) {
      return { name: name.trim(), amount: readQuantity(quantity), unit: cleanUnit }
    }
  }
  return { name: line, amount: 1, unit: '' }
}

/** Build an editable draft. Preserve the first spelling and order of each item. */
export function parseGroceryImport(text: string): GroceryImportRow[] {
  const rows = new Map<string, GroceryImportItem>()
  for (const entry of text.split(/[,\r\n\u2028\u2029]/)) {
    const line = entry.trim().replace(/^(?:[•*▪●]\s*|[-–]\s+|[0-9០-៩]+[.)]\s+)/, '').trim()
    if (!foldForCompare(line)) continue
    const item = parseLine(line)
    const key = groceryImportKey(item.name, item.unit)
    const existing = rows.get(key)
    if (existing) existing.amount = Number((existing.amount + item.amount).toPrecision(12))
    else rows.set(key, item)
  }
  return [...rows.values()].map(({ amount, ...item }, id) => ({
    ...item,
    id,
    amount: Number.isFinite(amount) ? String(amount) : '',
  }))
}

export function reviewedGroceryItem(row: GroceryImportRow): GroceryImportItem | null {
  const { name, amount, unit } = row
  const quantity = parseNumeric(amount)
  if (!foldForCompare(name) || name.trim().length > 200 || unit.trim().length > 50) return null
  if (quantity === null || quantity < 0 || quantity > 100_000) return null
  return { name: name.trim(), unit: unit.trim(), amount: quantity }
}
