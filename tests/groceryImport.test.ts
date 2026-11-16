import assert from 'node:assert/strict'
import test from 'node:test'
import {
  groceryImportKey, manualGroceryVisible, parseGroceryImport, reviewedGroceryItem,
} from '../src/lib/groceryImport'

test('parses a mixed English and Khmer paste, retaining the ingredient spellings', () => {
  const draft = parseGroceryImport('2 onions, 1 bag of rice\r\nទឹកដោះគោ ១ លីត្រ\nខ្ទឹមបារាំង៣\nmilk')
  assert.deepEqual(draft.map(reviewedGroceryItem), [
    { name: 'onions', amount: 2, unit: '' },
    { name: 'rice', amount: 1, unit: 'bag' },
    { name: 'ទឹកដោះគោ', amount: 1, unit: 'លីត្រ' },
    { name: 'ខ្ទឹមបារាំង', amount: 3, unit: '' },
    { name: 'milk', amount: 1, unit: '' },
  ])
})

test('takes the larger end of a range and sums matching ingredient and unit pairs', () => {
  const draft = parseGroceryImport('• 1–2 bags of Rice\n- ១ bag of rice, 500 g rice, 1 1/2 cups beans')
  assert.deepEqual(draft.map(reviewedGroceryItem), [
    { name: 'Rice', amount: 3, unit: 'bags' },
    { name: 'rice', amount: 500, unit: 'g' },
    { name: 'beans', amount: 1.5, unit: 'cups' },
  ])
  assert.equal(groceryImportKey('  RICE', 'bag'), groceryImportKey('rice', 'bags'))
  assert.notEqual(groceryImportKey('onions', ''), groceryImportKey('ខ្ទឹមបារាំង', ''))
})

test('lets the user correct incomplete or invalid parsed rows before submitting', () => {
  assert.deepEqual(parseGroceryImport(', \n • \n\t'), [])
  const [row] = parseGroceryImport('1/0 kg rice')
  assert.equal(reviewedGroceryItem(row), null)
  assert.deepEqual(reviewedGroceryItem({ ...row, amount: '២.៥' }), {
    name: 'rice', amount: 2.5, unit: 'kg',
  })
  assert.equal(reviewedGroceryItem({ ...row, name: '', amount: '2' }), null)
})

test('day and week imports follow their destination while old manual items stay visible', () => {
  const tuesday = '2026-11-17'
  const wednesday = '2026-11-18'
  const dayItem = { destination: 'day', shoppingDate: tuesday, ticked: false } as const
  const weekItem = { destination: 'week', shoppingDate: null, ticked: false } as const
  assert.equal(manualGroceryVisible(dayItem, 'day', tuesday), true)
  assert.equal(manualGroceryVisible(dayItem, 'day', wednesday), false)
  assert.equal(manualGroceryVisible(dayItem, 'week', wednesday), true)
  assert.equal(manualGroceryVisible(dayItem, 'missing', wednesday), true)
  assert.equal(manualGroceryVisible({ ...dayItem, ticked: true }, 'missing', wednesday), false)
  assert.equal(manualGroceryVisible(weekItem, 'day', tuesday), false)
  assert.equal(manualGroceryVisible(weekItem, 'week', tuesday), true)
  assert.equal(manualGroceryVisible(weekItem, 'missing', tuesday), true)
  assert.equal(manualGroceryVisible({ ticked: false }, 'day', tuesday), true)
})
