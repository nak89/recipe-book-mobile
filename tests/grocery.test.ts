import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  atFloor,
  contributes,
  decrement,
  formatAmount,
  groceryKey,
  increment,
  isNarrowed,
  shareOf,
  stepFor,
  unitFor,
} from '@/lib/grocery'
import type { LinePart } from '@/lib/grocery'
import { toKhmerDigits } from '@/lib/numerals'

/**
 * The client half of the grocery list.
 *
 * The rules being pinned are mostly about **not doing** something: not
 * pluralising Khmer, not pluralising symbols, not letting − reach zero, and not
 * converting numerals in a module that has no language.
 */

describe('groceryKey', () => {
  it('is case- and whitespace-insensitive', () => {
    assert.equal(groceryKey('Coconut Milk', 'ML'), groceryKey(' coconut milk ', 'ml'))
  })

  it('strips zero-width spaces on both halves', () => {
    // A Khmer keyboard emits U+200B at word boundaries, so an unfolded key would
    // file a tick against an address the server never derived — the row redraws
    // un-ticked and nothing on screen explains it.
    assert.equal(groceryKey('ត្រី​', 'ក្រាម'), groceryKey('ត្រី', 'ក្រាម'))
  })

  it('keeps the same name in a different unit as a separate line', () => {
    // Units are free text, so there is no conversion table and inventing one is
    // a food-database project. Two rows is the honest answer.
    assert.notEqual(groceryKey('garlic', 'cloves'), groceryKey('garlic', ''))
  })
})

describe('stepFor', () => {
  it('steps per unit', () => {
    assert.equal(stepFor('g'), 50)
    assert.equal(stepFor('ml'), 100)
    assert.equal(stepFor('cloves'), 1)
    assert.equal(stepFor(''), 1)
  })

  it('folds before looking up', () => {
    assert.equal(stepFor('G'), 50)
    assert.equal(stepFor(' ml '), 100)
  })
})

describe('unitFor', () => {
  it('pluralises English words', () => {
    assert.equal(unitFor(2, 'stalk'), 'stalks')
    assert.equal(unitFor(2, 'bunch'), 'bunches')
    assert.equal(unitFor(2, 'body'), 'bodies')
  })

  it('singularises at exactly one', () => {
    assert.equal(unitFor(1, 'stalks'), 'stalk')
    assert.equal(unitFor(1, 'bunches'), 'bunch')
  })

  it('leaves symbols invariable', () => {
    // "400 gs" is not a thing.
    for (const unit of ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'oz', 'lb']) {
      assert.equal(unitFor(400, unit), unit)
    }
  })

  it('never pluralises Khmer', () => {
    // Khmer does not mark plurals, so appending an `s` would be inventing
    // morphology the language does not have — on a string the user typed.
    assert.equal(unitFor(5, 'ក្រាម'), 'ក្រាម')
    assert.equal(unitFor(1, 'កណ្ដាប់'), 'កណ្ដាប់')
  })

  it('tests the string, not the active language', () => {
    // A Khmer unit inside an English UI still must not take an `s`.
    assert.equal(unitFor(3, 'ស្លាបព្រា'), 'ស្លាបព្រា')
  })

  it('does not double-pluralise a unit that is already plural', () => {
    // The pantry's own defaults ship plural, so going straight to `pluralise`
    // assumed something that was not true of the most common units in the app:
    // the market read "៣ cloveses" and "៤ leaveses".
    assert.equal(unitFor(3, 'cloves'), 'cloves')
    assert.equal(unitFor(4, 'leaves'), 'leaves')
    assert.equal(unitFor(2, 'slices'), 'slices')
    assert.equal(unitFor(2, 'stalks'), 'stalks')
    // And the singular form still works from either direction.
    assert.equal(unitFor(1, 'cloves'), 'clove')
    assert.equal(unitFor(3, 'clove'), 'cloves')
  })

  it('returns nothing for a blank unit', () => {
    assert.equal(unitFor(3, ''), '')
  })
})

describe('unitFor in Khmer', () => {
  it('translates English count-words', () => {
    // Display only — nothing is written back. See `data/units.km.ts`.
    assert.equal(unitFor(2, 'cloves', 'km'), 'កំពិស')
    assert.equal(unitFor(1, 'clove', 'km'), 'កំពិស')
    assert.equal(unitFor(4, 'leaves', 'km'), 'សន្លឹក')
    assert.equal(unitFor(2, 'whole', 'km'), 'ផ្លែ')
  })

  it('never pluralises, at any amount', () => {
    // Khmer does not mark number, so both amounts give the same word.
    assert.equal(unitFor(1, 'stalks', 'km'), unitFor(9, 'stalks', 'km'))
  })

  it('leaves measurement symbols Latin', () => {
    // The convention `KHMER_UNIT_GROUPS` and `ingredients.km.ts` already follow:
    // these are symbols, not words, and the Khmer for "teaspoon" is four times
    // the width of `tsp` in a column that must not wrap.
    for (const unit of ['g', 'kg', 'ml', 'l', 'tbsp', 'tsp']) {
      assert.equal(unitFor(400, unit, 'km'), unit)
    }
  })

  it('passes an unknown word through rather than guessing', () => {
    // A gap in the table is visible and fixable; a guess would not be.
    assert.equal(unitFor(2, 'schmeckles', 'km'), 'schmeckles')
  })

  it('leaves English alone when the language is English', () => {
    // The stored string is untouched — switching back shows what was typed.
    assert.equal(unitFor(2, 'cloves', 'en'), 'cloves')
  })
})

describe('formatAmount', () => {
  it('drops trailing zeros but keeps a real half', () => {
    assert.equal(formatAmount(2, 'g'), '2 g')
    assert.equal(formatAmount(1.5, 'kg'), '1.5 kg')
    assert.equal(formatAmount(2.0, 'g'), '2 g')
  })

  it('rounds to two places', () => {
    assert.equal(formatAmount(0.333333, 'l'), '0.33 l')
  })

  it('omits the unit when there is none', () => {
    assert.equal(formatAmount(3, ''), '3')
  })

  it('agrees with the singular at exactly one', () => {
    assert.equal(formatAmount(1, 'stalks'), '1 stalk')
  })

  it('emits Latin digits for the screen to convert', () => {
    // The numeral script belongs to the screen — `useNum()` wraps this and
    // converts the digits while leaving the unit alone.
    assert.equal(toKhmerDigits(formatAmount(250, 'g')), '២៥០ g')
    assert.equal(toKhmerDigits(formatAmount(1.5, 'ស្លាបព្រា')), '១.៥ ស្លាបព្រា')
  })
})

describe('the stepper', () => {
  it('increments by the unit step', () => {
    assert.equal(increment(400, 'g'), 450)
    assert.equal(increment(6, 'cloves'), 7)
  })

  it('decrements by the unit step', () => {
    assert.equal(decrement(450, 'g'), 400)
  })

  it('floors at one step, never zero', () => {
    // A row you can lose by tapping twice is a row you will lose in a shop.
    assert.equal(decrement(50, 'g'), 50)
    assert.equal(decrement(10, 'g'), 50)
    assert.equal(decrement(1, 'cloves'), 1)
  })

  it('reports the floor so − can go disabled', () => {
    assert.equal(atFloor(50, 'g'), true)
    assert.equal(atFloor(100, 'g'), false)
    assert.equal(atFloor(1, 'cloves'), true)
  })

  it('does not accumulate float error', () => {
    // 0.1 + 0.2 territory: a shopping list that reads "3.0000000000000004" is
    // worse than one that is slightly wrong.
    let amount = 1
    for (let i = 0; i < 10; i++) amount = increment(amount, 'cloves')
    assert.equal(amount, 11)
    assert.equal(String(increment(1.5, 'cloves')), '2.5')
  })
})

/**
 * The two lenses over a line — the day chip and the dish chip.
 *
 * Both are filters over the same `parts`, which is why the server sends the
 * pieces rather than a total per day beside a total per dish: the questions are
 * asked together, and two maps can each answer their own and neither can answer
 * both.
 */
describe('the lens over a line', () => {
  // Beef shin, 300 g in the amok on Monday and again on Tuesday, 250 g in the
  // lok lak on Tuesday.
  const parts: LinePart[] = [
    { date: '2026-08-17', recipeId: 'amok', amount: 300 },
    { date: '2026-08-18', recipeId: 'amok', amount: 300 },
    { date: '2026-08-18', recipeId: 'loklak', amount: 250 },
  ]

  it('treats an empty lens as the whole week', () => {
    assert.equal(isNarrowed({}), false)
    assert.equal(isNarrowed({ date: null, recipeId: null }), false)
    assert.equal(contributes(parts, {}), true)
    assert.equal(shareOf(parts, {}), 850)
  })

  it('narrows to one day', () => {
    assert.equal(shareOf(parts, { date: '2026-08-18' }), 550)
    assert.equal(contributes(parts, { date: '2026-08-19' }), false)
  })

  it('narrows to one dish', () => {
    assert.equal(shareOf(parts, { recipeId: 'amok' }), 600)
    assert.equal(contributes(parts, { recipeId: 'samlor' }), false)
  })

  it('composes the two, which is the whole reason parts travel as a list', () => {
    // "What do I still need for the amok, today" — neither half answers this on
    // its own, and a byDate map beside a byRecipe one could not either.
    assert.equal(shareOf(parts, { date: '2026-08-18', recipeId: 'amok' }), 300)
    assert.equal(contributes(parts, { date: '2026-08-17', recipeId: 'loklak' }), false)
  })

  it('rounds the way every other sum here does', () => {
    // The same floats the server added up, so a subset of them drifts the same
    // way — 0.1 + 0.2 on a shopping list is not a readable amount.
    const drifting: LinePart[] = [
      { date: '2026-08-17', recipeId: 'a', amount: 0.1 },
      { date: '2026-08-18', recipeId: 'a', amount: 0.2 },
    ]
    assert.equal(shareOf(drifting, { recipeId: 'a' }), 0.3)
  })

  it('reads presence as the filter, never a zero', () => {
    // A meal that asked for nothing is absent from `parts` rather than present
    // at zero: a zero-valued part would put an empty row on that day's list.
    assert.equal(contributes(parts, { date: '2026-08-20' }), false)
    assert.equal(shareOf(parts, { date: '2026-08-20' }), 0)
  })
})
