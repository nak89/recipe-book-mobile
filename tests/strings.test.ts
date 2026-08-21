import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { en, km } from '@/i18n/strings'
import { hasKhmerDigits } from '@/lib/numerals'
import { hasKhmer } from '@/lib/text'

/**
 * The dictionaries, checked against the bilingual rule.
 *
 * `km` is annotated `Record<keyof typeof en, string>`, so a *missing* key is
 * already a compile error and needs no test. What the type system cannot see is
 * everything below: a translation that silently kept the English text, one that
 * dropped a `{placeholder}` the code will try to substitute, or one carrying
 * Latin digits inside Khmer copy.
 *
 * That last one is the failure the README warns is most likely, and it is
 * invisible to anyone reviewing who does not read Khmer.
 */

const KEYS = Object.keys(en) as (keyof typeof en)[]

/** `{n}`, `{field}`, `{max}` — anything the code will substitute at runtime. */
function placeholders(value: string): string[] {
  return (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort()
}

/**
 * Keys deliberately identical in both dictionaries, each with its reason.
 *
 * An explicit list rather than a rule, so adding one is a decision somebody
 * writes down rather than a test quietly going green. Anything not listed here
 * that matches the English is an untranslated string.
 */
const SAME_IN_BOTH = new Map<string, string>([
  [
    'language.en',
    'A language is named in its own script in both dictionaries, so that someone ' +
      'who cannot read the current UI can still find theirs. Translating it would ' +
      'hide English from a Khmer speaker looking for it.',
  ],
  ['language.km', 'Same rule — and this is why ខ្មែរ legitimately sits in `en`.'],
  [
    'auth.emailPlaceholder',
    'A sample address. Script-neutral, and an email is Latin either way.',
  ],
])

/**
 * Keys allowed to carry Khmer script inside the **English** dictionary.
 *
 * Exactly one, and it is the bilingual rule's own documented exception: the
 * language control shows each language in its own script. Everything else in
 * `en` that contains Khmer is a translation pasted into the wrong map.
 */
const KHMER_IN_ENGLISH = new Set(['language.km'])

/**
 * Khmer written during the rework rather than supplied by the handoff.
 *
 * SCREENS.md marks its UI copy final **in both languages**, but only gives a
 * Khmer string for some of it. Everything below was written to fill the gap and
 * has not been read by a Khmer speaker. It is enumerated here rather than left
 * to a comment per line so the debt is countable and can be handed over as a
 * list — and so this test fails if the list drifts out of step with the
 * dictionary.
 *
 * Delete an entry once it has been reviewed. The test at the bottom of this
 * file pins the count so the list can't quietly grow.
 */
export const KHMER_NEEDS_REVIEW = [
  'index.nothingToday',
  'detail.saved',
  'detail.toolsPrefix',
  'detail.servingsMultiplier',
  'week.emptyTitle',
  'week.emptyBody',
  'market.share',
  'market.emptyBody',
  'market.goToWeek',
  // The dish filter. The mockup draws the row but writes no Khmer for it, so
  // all five were written here — including the reworded "everything gathered"
  // body, which had to stop naming the week once the list could be narrowed to
  // a single dish.
  'grocery.allDishes',
  'grocery.filterByDish',
  'grocery.moreDishes',
  'grocery.emptyDishTitle',
  'grocery.emptyDishBody',
  'grocery.emptyMissingBody',
  'settings.about',
  'settings.recipeCount',
  'empty.recipesBody',
  'empty.recipesPrimary',
  'empty.noMatchBody',
  'auth.passwordHint',
  'about.oneBody',
  'about.twoBody',
  'about.threeBody',
  'first.subtitle',
  'first.writeBody',
  'first.classicsBody',
  // Explore. SCREENS.md §11/§12 give Khmer for the masthead, the search
  // placeholder, both section headings, the chips and the no-results copy —
  // those are verbatim and are not listed here. Everything below had no Khmer in
  // the handoff, either because the design gave only English or because the
  // string did not exist in the design at all (the copy CTA, the attribution,
  // the two derived collection names).
  'explore.twoToTry',
  'explore.collectionKroeung',
  'explore.collectionQuick',
  'explore.noResultsBody',
  'explore.inYourBook',
  'explore.copyToBook',
  'explore.copying',
  'explore.copied',
  'explore.openCopy',
  'explore.byChefNak',
  'explore.sourceLine',
  'explore.method',
  'explore.chefsNote',
  'explore.offlineBody',
  'explore.offlineSub',
  'explore.openMyBook',
  'explore.tryAgain',
  'subject.soups',
  'subject.grilled',
  'subject.sweets',
  'subject.festival',
  // The twelve Khmer solar months. Added so the mastheads and the week label
  // could stop reading the *phone's* locale, which printed `AUGUST ១៥` in a
  // Khmer UI. `សីហា` is verbatim from the mockup's own masthead; the other
  // eleven follow the same series and are owed the same read as everything
  // else on this list.
  'month.1',
  'month.2',
  'month.3',
  'month.4',
  'month.5',
  'month.6',
  'month.7',
  'month.8',
  'month.9',
  'month.10',
  'month.11',
  'month.12',
  // Cook mode. SCREENS.md § 8 gives Khmer for the header, `ផ្អាក`/`ចាប់ផ្ដើម`
  // and the tutorial card over it — those are verbatim and not listed. The rest
  // of the screen's copy did not exist in the design.
  'cook.exit',
  'cook.resume',
  'cook.reset',
  'cook.ofSteps',
  'cook.previous',
  'cook.next',
  'cook.done',
  'cook.finishedTitle',
  'cook.finishedBody',
  'cook.noSteps',
  'form.addTimer',
  'form.stepTimer',
  'form.stepTimerHint',
  'form.noTimer',
  'form.hoursShort',
  'form.minutesShort',
  'form.secondsShort',
] as const

describe('the dictionaries', () => {
  it('have the same keys', () => {
    // The type annotation on `km` already guarantees this direction; the test
    // covers the other one — a key in `km` that `en` dropped.
    assert.deepEqual(Object.keys(km).sort(), KEYS.slice().sort())
  })

  it('are not empty anywhere', () => {
    for (const key of KEYS) {
      assert.notEqual(en[key].trim(), '', `en.${key} is blank`)
      assert.notEqual(km[key].trim(), '', `km.${key} is blank`)
    }
  })

  it('carry the same placeholders in both languages', () => {
    // A translation that dropped `{n}` renders a sentence with a hole in it; one
    // that invented `{count}` renders the braces literally.
    for (const key of KEYS) {
      assert.deepEqual(
        placeholders(km[key]),
        placeholders(en[key]),
        `${key}: en has ${placeholders(en[key]).join(' ')}, km has ${placeholders(km[key]).join(' ')}`
      )
    }
  })
})

describe('the one-language-at-a-time rule', () => {
  it('has a genuinely Khmer translation for every key', () => {
    const untranslated = KEYS.filter(
      (key) => !SAME_IN_BOTH.has(key) && km[key] === en[key]
    )
    assert.deepEqual(untranslated, [], `left in English: ${untranslated.join(', ')}`)
  })

  it('uses Khmer numerals in Khmer copy, never Latin ones', () => {
    // The README states it directly: Khmer mode uses ០១២៣៤៥៦៧៨៩ for counts,
    // durations, servings and calories. A hardcoded Latin digit inside a Khmer
    // string bypasses `useNum()` entirely, and nothing at runtime would catch it.
    const offenders = KEYS.filter((key) => /[0-9]/.test(km[key]))
    assert.deepEqual(offenders, [], `Latin digits in Khmer copy: ${offenders.join(', ')}`)
  })

  it('never puts Khmer digits in English copy', () => {
    const offenders = KEYS.filter((key) => hasKhmerDigits(en[key]))
    assert.deepEqual(offenders, [], `Khmer digits in English copy: ${offenders.join(', ')}`)
  })

  it('has a real Khmer string for every key still awaiting review', () => {
    // The list is a record of what a reviewer must look at, not a licence to
    // leave a key untranslated — so each entry still has to be Khmer, and still
    // has to differ from the English.
    for (const key of KHMER_NEEDS_REVIEW) {
      const typed = key as keyof typeof en
      assert.equal(hasKhmer(km[typed]), true, `${key} is on the review list but is not Khmer`)
      assert.notEqual(km[typed], en[typed], `${key} is on the review list but is still English`)
    }
  })

  it('never leaves Khmer script inside an English string', () => {
    const offenders = KEYS.filter((key) => !KHMER_IN_ENGLISH.has(key) && hasKhmer(en[key]))
    assert.deepEqual(offenders, [], `Khmer script in English copy: ${offenders.join(', ')}`)
  })
})
