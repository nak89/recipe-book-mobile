import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { COMMON_INGREDIENTS, emojiForIngredient, DEFAULT_INGREDIENT_EMOJI } from '@/data/ingredients'
import { KHMER_INGREDIENTS } from '@/data/ingredients.km'
import { aisleForIngredient } from '@/data/aisles'
import { foldForCompare } from '@/lib/text'

/**
 * The pantry against the backend's shared library — a coupling that spans two
 * repositories and that nothing else can see.
 *
 * `data/library.ts` spells every ingredient against `src/data/ingredients.km.ts`
 * — the **Khmer** pantry, since the library is Khmer only. Rename an entry on
 * either side and nothing breaks loudly: `emojiForIngredient` just falls through
 * to 🥄 and `aisleForIngredient` to Other, on Explore and on every copy a user
 * has already taken. TypeScript cannot help (the two projects have separate
 * builds), and the backend's own suite cannot either — nothing crosses that
 * boundary but the string itself.
 *
 * The failure this file was written about is worth restating, because the Khmer
 * version of it is *quieter* than the Latin one was. The Khmer lookup is a
 * longest-first **substring** scan rather than a whole-word match, so a near
 * miss usually still lands on something — ស្ករក្រហម finding nothing is loud, but
 * ម្ទេសក្រហមស្ងួតបុក quietly resolving through ម្ទេស is the norm and is correct.
 * What that leaves undetectable by eye is a *spelling* difference: ណ្ត and ណ្ដ
 * are visually identical and compare unequal, and that is exactly how សណ្តែកកួរ
 * lost its emoji the first time this file was translated.
 *
 * So the check reads the backend's source as **text**. It is deliberately not an
 * import: the two projects have independent `tsconfig`s and dependency trees,
 * and making the app's tests import from the API's build is a far worse coupling
 * than parsing a well-known literal shape out of one file.
 *
 * **The suite skips rather than fails when the backend is absent.** CLAUDE.md
 * documents the two projects as siblings under one folder, so the path resolves
 * on a normal checkout — but the app is independently cloneable, and a test that
 * fails because a *different repository* is missing would be noise rather than a
 * finding.
 */

const here = dirname(fileURLToPath(import.meta.url))
const LIBRARY_PATH = resolve(here, '../../recipe-book-backend/data/library.ts')

/** `['ស្ករត្នោត', 30, 'g']` — the tuple shape the library stores. */
const INGREDIENT_TUPLE = /\['([^']+)',\s*[\d.]+,\s*'[^']*'\]/g

function libraryIngredientNames(): string[] {
  const source = readFileSync(LIBRARY_PATH, 'utf8')
  return [...new Set([...source.matchAll(INGREDIENT_TUPLE)].map((m) => m[1]))].sort()
}

describe('the shared library’s ingredients', { skip: !existsSync(LIBRARY_PATH) }, () => {
  it('are all written in Khmer', () => {
    // The library is Khmer only. An English ingredient name here would still
    // resolve — the Latin pantry is searched too, and most of these words are in
    // it — so nothing downstream would complain; it would simply sit in English
    // in the middle of a Khmer method.
    const latin = libraryIngredientNames().filter((name) => !/[ក-៿]/.test(name))
    assert.deepEqual(latin, [], `still in English: ${latin.join(', ')}`)
  })

  it('each resolve to something in the Khmer pantry', () => {
    // Exact match, or the longest-first substring the Khmer lookup actually
    // uses — ទឹកដូងខាប់ resolves through ទឹកដូង, and that is the design rather
    // than a near miss. What this refuses is a name that reaches *neither*.
    const exact = new Set(KHMER_INGREDIENTS.map((i) => foldForCompare(i.name)))
    const byLength = [...KHMER_INGREDIENTS]
      .sort((a, b) => b.name.length - a.name.length)
      .map((i) => foldForCompare(i.name))

    const unmatched = libraryIngredientNames().filter((name) => {
      const key = foldForCompare(name)
      return !exact.has(key) && !byLength.some((entry) => key.includes(entry))
    })
    assert.deepEqual(
      unmatched,
      [],
      `not reachable from src/data/ingredients.km.ts: ${unmatched.join(', ')}`
    )
  })

  it('are all filed in a real aisle, never Other', () => {
    // The grocery list groups by aisle, and Other is the honest answer for a
    // free-text ingredient the user typed. It is never the right answer for the
    // app's own content — a week planned entirely out of the library would put
    // its whole shop under one heading.
    const homeless = libraryIngredientNames().filter(
      (name) => aisleForIngredient(name) === 'Other'
    )
    assert.deepEqual(homeless, [], `fell through to Other: ${homeless.join(', ')}`)
  })

  it('every one of them resolves to a real emoji', () => {
    // The stronger claim, and the one that actually matters on screen. A name
    // can be present in the pantry and still fall through — `emojiForIngredient`
    // folds, singularises and then scans whole words longest-first, and it is
    // that last step, not the exact match, that most rows rely on.
    //
    // It also catches a case the first test cannot: an entry that *is* in the
    // pantry but carries 🥄, which is the fallback itself and therefore reads as
    // a miss. `Baking powder` and `Cumin` are both set that way deliberately;
    // this only insists that nothing the **library** uses is.
    const dull = libraryIngredientNames().filter(
      (name) => emojiForIngredient(name) === DEFAULT_INGREDIENT_EMOJI
    )
    assert.deepEqual(dull, [], `fell through to ${DEFAULT_INGREDIENT_EMOJI}: ${dull.join(', ')}`)
  })

  it('finds the Cambodian staples in both pantries', () => {
    // Both halves matter and for different reasons. The Khmer names are what the
    // library ships. The Latin ones are what a user may still type into their
    // own recipe — the entries added when this file was English are deliberately
    // left in `ingredients.ts`, and dropping them would strip the emoji off
    // every copy taken before the translation.
    for (const name of ['គ្រឿង', 'រំដេង', 'ស្លឹកគ្រៃ', 'ស្ករត្នោត', 'កាពិ']) {
      assert.notEqual(
        emojiForIngredient(name),
        DEFAULT_INGREDIENT_EMOJI,
        `${name} lost its emoji`
      )
    }
    for (const name of ['Kroeung', 'Galangal', 'Kaffir lime leaves', 'Palm sugar', 'Shrimp paste']) {
      assert.notEqual(
        emojiForIngredient(name),
        DEFAULT_INGREDIENT_EMOJI,
        `${name} lost its emoji`
      )
    }
  })
})

describe('the pantry itself', () => {
  it('has no duplicate names, in either language', () => {
    // Two rows with one name is one row the picker shows twice and one
    // `emojiForIngredient` result that depends on array order. Both lists are
    // checked: the Khmer one grew by ten when the library was translated, and a
    // duplicate there is harder to spot by eye than a Latin one.
    for (const [label, list] of [
      ['ingredients.ts', COMMON_INGREDIENTS],
      ['ingredients.km.ts', KHMER_INGREDIENTS],
    ] as const) {
      const seen = new Map<string, number>()
      for (const { name } of list) {
        const key = foldForCompare(name)
        seen.set(key, (seen.get(key) ?? 0) + 1)
      }
      const dupes = [...seen].filter(([, count]) => count > 1).map(([name]) => name)
      assert.deepEqual(dupes, [], `duplicated in ${label}: ${dupes.join(', ')}`)
    }
  })

  it('keeps "sea salt" and "salt" apart', () => {
    // The longest-first scan is what makes this work, and it is easy to break by
    // reordering. If "salt" ever won, every sea-salt row would silently take the
    // wrong entry's unit and emoji.
    assert.notEqual(emojiForIngredient('Sea salt'), DEFAULT_INGREDIENT_EMOJI)
    assert.notEqual(emojiForIngredient('Salt'), DEFAULT_INGREDIENT_EMOJI)
  })
})
