import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { en, km } from '@/i18n/strings'
import { localiseDigits } from '@/lib/numerals'
import {
  LIMITS,
  MAX_RECIPE_BYTES,
  recipeSizeError,
  summarise,
  utf8ByteLength,
  validateStep,
} from '@/lib/recipeValidation'
import type { Localiser, RecipeFormValues } from '@/lib/recipeValidation'

/**
 * The wizard's rules, exercised in both languages.
 *
 * Two things are being pinned here and they are different in kind. The first is
 * ordinary: the limits still reject what they always rejected. The second is the
 * one-language-at-a-time rule — that a Khmer error message carries **Khmer
 * numerals**, not Latin ones. That failure is invisible to anyone who can't read
 * Khmer, which is exactly the sort of thing a test is for.
 */

/** A real `Localiser`, built the way the app builds one: dictionary + script. */
function localiser(language: 'en' | 'km'): Localiser {
  const dictionary = language === 'en' ? en : km
  return {
    t: (key) => dictionary[key],
    n: (value) => localiseDigits(String(value), language),
  }
}

const EN = localiser('en')
const KM = localiser('km')

function values(overrides: Partial<RecipeFormValues> = {}): RecipeFormValues {
  return {
    photoUrl: 'https://example.test/a.jpg',
    title: 'Fish amok',
    description: '',
    totalMinutes: '50',
    servings: '4',
    cuisine: '',
    tools: '',
    ingredients: [{ id: 'i1', name: 'Coconut milk', quantity: '250', unit: 'ml' }],
    steps: [{ id: 's1', instruction: 'Steam it.', durationSeconds: null }],
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    takenTitles: new Set<string>(),
    ...overrides,
  }
}

describe('validateStep — basics', () => {
  it('passes a complete recipe', () => {
    assert.deepEqual(validateStep(0, values(), EN), {})
  })

  it('accepts Khmer digits in the time and servings fields', () => {
    // The bug that motivated `parseWholeNumber`. `\d` is ASCII-only, so `៥០`
    // used to fail `^\d+$` and outline a field holding a perfectly good number.
    const errors = validateStep(0, values({ totalMinutes: '៥០', servings: '៤' }), KM)
    assert.equal(errors.totalMinutes, undefined)
    assert.equal(errors.servings, undefined)
  })

  it('still rejects a Khmer decimal where a whole number belongs', () => {
    const errors = validateStep(0, values({ servings: '៤.៥' }), KM)
    assert.notEqual(errors.servings, undefined)
  })

  it('still enforces the ceiling on Khmer input', () => {
    const overMax = localiseDigits(String(LIMITS.servings + 1), 'km')
    const errors = validateStep(0, values({ servings: overMax }), KM)
    assert.notEqual(errors.servings, undefined)
  })

  it('marks a missing photo — the column is nullable but the layout is not', () => {
    assert.equal('photoUrl' in validateStep(0, values({ photoUrl: undefined }), EN), true)
  })

  it('reports a taken title with a sentence, not a bare highlight', () => {
    // The one error where the field looks completely fine, so the outline alone
    // would leave you staring at it.
    const errors = validateStep(0, values({ takenTitles: new Set(['fish amok']) }), EN)
    assert.equal(errors.title, en['error.api.titleTaken'])
  })

  it('folds zero-width spaces before the duplicate check', () => {
    // A Khmer keyboard emits U+200B at word boundaries, so two titles that are
    // pixel-identical compare unequal without the fold.
    const errors = validateStep(
      0,
      values({ title: 'Fish​ amok', takenTitles: new Set(['fish amok']) }),
      EN
    )
    assert.notEqual(errors.title, undefined)
  })
})

describe('validateStep — the numeral rule inside error messages', () => {
  it('puts Khmer numerals in a Khmer message', () => {
    const long = 'x'.repeat(LIMITS.title + 1)
    const message = validateStep(0, values({ title: long }), KM).title
    assert.equal(typeof message, 'string')
    // The limit is 200, so a correct Khmer message says ២០០ and never "200".
    assert.match(message, /២០០/)
    assert.doesNotMatch(message, /[0-9]/)
  })

  it('puts Latin numerals in an English message', () => {
    const long = 'x'.repeat(LIMITS.title + 1)
    const message = validateStep(0, values({ title: long }), EN).title
    assert.match(message, /200/)
    assert.doesNotMatch(message, /[០-៩]/)
  })

  it('converts a pre-formatted thousands separator without eating the comma', () => {
    const message = validateStep(
      0,
      values({ description: 'word '.repeat(LIMITS.descriptionWords + 1) }),
      KM
    ).description
    assert.match(message, /១,០០០/)
  })

  it('leaves no Latin digit in any Khmer message the wizard can produce', () => {
    // A sweep rather than a case: every message with a `{n}` in it goes through
    // one `fill`, so this is really a test that nothing bypasses that choke point.
    const cases: Partial<RecipeFormValues>[] = [
      { title: 'x'.repeat(LIMITS.title + 1) },
      { description: 'word '.repeat(LIMITS.descriptionWords + 1) },
      { description: 'x'.repeat(LIMITS.description + 1) },
      { totalMinutes: '30.5' },
      { servings: '4.5' },
      { tools: Array.from({ length: LIMITS.tools + 1 }, (_, i) => `t${i}`).join(',') },
    ]
    for (const override of cases) {
      for (const message of Object.values(validateStep(0, values(override), KM))) {
        assert.doesNotMatch(message, /[0-9]/, `Latin digits leaked: ${message}`)
      }
    }
  })
})

describe('validateStep — ingredients and steps', () => {
  it('accepts a Khmer quantity', () => {
    const errors = validateStep(
      1,
      values({ ingredients: [{ id: 'i1', name: 'ត្រី', quantity: '២៥០', unit: 'g' }] }),
      KM
    )
    assert.deepEqual(errors, {})
  })

  it('accepts a Khmer decimal quantity', () => {
    const errors = validateStep(
      1,
      values({ ingredients: [{ id: 'i1', name: 'ត្រី', quantity: '១.៥', unit: 'kg' }] }),
      KM
    )
    assert.deepEqual(errors, {})
  })

  it('rejects letters where an amount belongs', () => {
    const errors = validateStep(
      1,
      values({ ingredients: [{ id: 'i1', name: 'Fish', quantity: 'some', unit: 'g' }] }),
      EN
    )
    assert.equal(errors['ingredient:i1'], en['validation.amountsNumbers'])
  })

  it('allows a blank quantity — it saves as 0', () => {
    const errors = validateStep(
      1,
      values({ ingredients: [{ id: 'i1', name: 'Salt', quantity: '', unit: '' }] }),
      EN
    )
    assert.deepEqual(errors, {})
  })

  it('marks the list itself when every row is nameless', () => {
    const errors = validateStep(
      1,
      values({ ingredients: [{ id: 'i1', name: '', quantity: '2', unit: 'g' }] }),
      EN
    )
    assert.equal('ingredients' in errors, true)
    assert.equal('ingredient:i1' in errors, true)
  })

  it('requires at least one step', () => {
    assert.equal('steps' in validateStep(2, values({ steps: [] }), EN), true)
  })
})

describe('validateStep — nutrition', () => {
  it('can never block a save: all four blank is valid', () => {
    assert.deepEqual(validateStep(3, values(), EN), {})
  })

  it('accepts Khmer digits', () => {
    assert.deepEqual(validateStep(3, values({ calories: '៤៧០' }), KM), {})
  })

  it('bounds what you did type', () => {
    const over = String(LIMITS.calories + 1)
    assert.equal('calories' in validateStep(3, values({ calories: over }), EN), true)
  })

  it('keeps a genuine zero', () => {
    // `0 g` of fat is a real answer and must not read as "not filled in".
    assert.deepEqual(validateStep(3, values({ fat: '0' }), EN), {})
  })
})

describe('summarise', () => {
  it('is null when nothing is wrong', () => {
    assert.equal(summarise({}, EN), null)
  })

  it('collapses highlight-only errors into one line', () => {
    assert.equal(summarise({ title: '', servings: '' }, EN), en['validation.fillHighlighted'])
  })

  it('shows a lone specific message as itself', () => {
    assert.equal(summarise({ title: 'Already used.' }, EN), 'Already used.')
  })

  it('falls back to the generic line when several fields have messages', () => {
    assert.equal(summarise({ a: 'one', b: 'two' }, EN), en['validation.checkHighlighted'])
  })
})

describe('utf8ByteLength', () => {
  it('agrees with Buffer.byteLength — the server counts with that', () => {
    // The two limits sit on either side of one boundary, so a disagreement here
    // means a recipe the app accepts and the API rejects.
    for (const value of ['', 'abc', 'café', 'ត្រីអាម៉ុក', '🥥', '🇰🇭 amok', 'a'.repeat(1000)]) {
      assert.equal(utf8ByteLength(value), Buffer.byteLength(value, 'utf8'), value)
    }
  })

  it('counts a surrogate pair as four bytes, not six', () => {
    assert.equal(utf8ByteLength('🥥'), 4)
  })
})

describe('recipeSizeError', () => {
  it('passes a normal recipe', () => {
    assert.equal(recipeSizeError({ title: 'Amok' }, EN), null)
  })

  it('rejects one over the cap and says so in the active script', () => {
    const huge = { instruction: 'x'.repeat(MAX_RECIPE_BYTES + 1) }
    const message = recipeSizeError(huge, KM)
    assert.notEqual(message, null)
    assert.doesNotMatch(message as string, /[0-9]/)
  })
})
