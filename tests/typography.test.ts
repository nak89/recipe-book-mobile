import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { contentType, fonts, moulType, sized, type, typeKm } from '@/theme/typography'
import type { TypeScale } from '@/theme/typography'

/**
 * The type scale, checked offline.
 *
 * It imports cleanly under plain Node because `typography.ts` takes `TextStyle`
 * as a **type-only** import and otherwise depends on nothing but `lib/text` —
 * the same module-graph purity rule the rest of this suite runs under. That is
 * worth keeping: everything below is a rule about the scale rather than about a
 * rendered screen, and none of it needs a device to be true.
 *
 * Four of these pin fixes that were invisible on iOS and broke on Android, web,
 * or in the other language — the class of bug a screenshot review will not catch
 * and a reviewer will not either.
 */

const SCALES: [string, TypeScale][] = [
  ['type', type],
  ['typeKm', typeKm],
]

/** Every Latin face that has no Khmer coverage at all. */
const NO_KHMER_COVERAGE = [fonts.serif, fonts.serifMedium, fonts.mono, fonts.monoMedium]

describe('the two scales', () => {
  it('carry the same roles', () => {
    // `typeKm` is annotated `TypeScale`, so the compiler already guarantees this
    // direction. The test covers the other one — a role added to `typeKm` and
    // forgotten in `type`.
    assert.deepEqual(Object.keys(typeKm).sort(), Object.keys(type).sort())
  })

  it('never name a Latin face on the Khmer scale', () => {
    // Newsreader and IBM Plex Mono have no Khmer glyphs, so naming one here
    // does not render Khmer in a serif — it drops to whatever the OS
    // substitutes, at metrics nothing in this app has measured. The failure is
    // silent, which is exactly why it is a test.
    for (const [role, token] of Object.entries(typeKm)) {
      assert.ok(
        !NO_KHMER_COVERAGE.includes(token.fontFamily as never),
        `typeKm.${role} names ${token.fontFamily}, which has no Khmer coverage`
      )
    }
  })

  it('never set fontWeight beside a weight-named family', () => {
    // Both are redundant on iOS and actively wrong elsewhere: Android and
    // react-native-web synthesize a weight on top of a face that already has
    // one, which double-bolds the label.
    for (const [name, scale] of SCALES) {
      for (const [role, token] of Object.entries(scale)) {
        assert.equal(
          token.fontWeight,
          undefined,
          `${name}.${role} sets fontWeight; the family is the source of weight`
        )
      }
    }
  })

  it('never pin a line box smaller than the text in it', () => {
    // CSS lets a short line box overflow and the glyph still draws. React
    // Native crops to the box and re-centres what is left, so `12px/1` loses
    // its descenders and a 96pt glyph in a 100pt box loses its middle.
    //
    // `stepNumeral` is the one exception, and it is deliberate: cook mode's
    // numeral is set at .9 by the design, and a numeral carries no descender
    // and no stacked Khmer mark to lose.
    for (const [name, scale] of SCALES) {
      for (const [role, token] of Object.entries(scale)) {
        if (role === 'stepNumeral') continue
        if (token.lineHeight === undefined) continue
        assert.ok(
          token.lineHeight > token.fontSize,
          `${name}.${role} pins lineHeight ${token.lineHeight} on fontSize ${token.fontSize}`
        )
      }
    }
  })

  it('give every Moul token the 1.81em its own ink needs', () => {
    // Moul's `head` bbox and its `hhea` metrics agree exactly: +1.221em above
    // the baseline, −0.586em below, so 1.807em of ink and no slack anywhere.
    // iOS leaves only `lineHeight − descent` above the baseline, so a ratio
    // under that cuts the top off the cluster — which is what every Khmer
    // masthead, screen title and ledger row did at the 1.45 they used to take.
    //
    // The 1.4 "Khmer floor" below is a rule about *Kantumruy* (1.443em of ink)
    // and does not reach this face. Holding Moul to it is the bug, not the fix.
    const MOUL_INK = 1.807
    // `stepNumeral` sets `០`–`៩` and nothing else, and Moul's digits stop at
    // +0.952em rather than reaching the full +1.221em ascent — so they need
    // 0.952 + the 0.586 descent the platform reserves, and no more. It is the
    // one Moul token measured against its own glyphs instead of the face.
    const MOUL_DIGIT_INK = 1.538
    for (const [name, scale] of SCALES) {
      for (const [role, token] of Object.entries(scale)) {
        if (token.fontFamily !== fonts.khmerDisplay) continue
        const need = role === 'stepNumeral' ? MOUL_DIGIT_INK : MOUL_INK
        assert.ok(
          token.lineHeight! / token.fontSize >= need,
          `${name}.${role} is Moul at ${(token.lineHeight! / token.fontSize).toFixed(2)}, ` +
            `under the ${need} its ink needs — the top of the glyph is cut off`
        )
      }
    }
  })

  it('give the cook-mode numeral a box its digits fit in', () => {
    // The Latin half of the same bug. § 8 specs `100/.9`; Newsreader's digits
    // run to +0.700em and the platform reserves 0.265em of descent under the
    // baseline, so 0.9 left 0.635em of room for 0.700em of glyph and sliced the
    // top off every numeral. The mockup survives it because CSS lets a short
    // line box overflow and paints the glyph anyway; React Native crops.
    const need = 0.7 + 0.265
    assert.ok(
      type.stepNumeral.lineHeight! / type.stepNumeral.fontSize >= need,
      `type.stepNumeral is ${(type.stepNumeral.lineHeight! / type.stepNumeral.fontSize).toFixed(3)}`
    )
    // …and not a point more than it has to be: this is a display numeral, and
    // the tightness is the effect being asked for.
    assert.ok(type.stepNumeral.lineHeight! / type.stepNumeral.fontSize < 1)
  })

  it('clear the Kantumruy ink on every Khmer token that pins a line box', () => {
    // A Khmer cluster stacks a vowel sign above its base consonant and a
    // subscript below it, so its ink runs past what Latin ascenders claim.
    //
    // **The floor is the font's 1.443em, not DESIGN_SYSTEM.md's 1.4.** The doc
    // rounds; `Kantumruy-Regular` does not, and the four hundredths between the
    // two are a whole point of ink at 15pt — enough to shave the upper mark off
    // every ingredient name on the market list, which is exactly what shipped
    // while this test asserted the doc's number. Same lesson as `lhMoul`: when
    // a glyph looks clipped, the font file is the authority. Moul needs
    // considerably more again — see the test above.
    const KANTUMRUY_INK = 1.443
    for (const [role, token] of Object.entries(typeKm)) {
      if (role === 'stepNumeral') continue // numerals carry no stacked marks
      if (token.lineHeight === undefined) continue
      assert.ok(
        token.lineHeight / token.fontSize >= KANTUMRUY_INK,
        `typeKm.${role} is ${(token.lineHeight / token.fontSize).toFixed(2)}, under the ${KANTUMRUY_INK} its ink needs`
      )
    }
  })

  it('keep Khmer tracking to a whisper, never the Latin display value', () => {
    // The design says "tracking breaks Khmer clusters", and at the Latin display
    // weights — .18em to .22em on buttons, tab labels, section heads — it is
    // right: a fifth of an em driven through a cluster detaches the vowel signs
    // and the subscript from the consonant they belong to.
    //
    // A flat zero was the other end of that argument rather than its conclusion,
    // and read dense. The scale carries 0.02em now — about a tenth of the Latin
    // value, verified against the bundled files on the stacked cases. What this
    // test protects is the *ceiling*: it exists so a Latin display token can
    // never be copied across with its tracking intact, which is the failure the
    // design rule was actually written about.
    const CEILING = 0.03
    for (const [role, token] of Object.entries(typeKm)) {
      const ems = (token.letterSpacing ?? 0) / token.fontSize
      assert.ok(
        ems >= 0 && ems <= CEILING,
        `typeKm.${role} tracks at ${ems.toFixed(3)}em; the ceiling is ${CEILING}em`
      )
    }
  })

  it('never track Khmer as hard as the Latin roles it mirrors', () => {
    // The pairs the design singles out. Stated as a relationship rather than as
    // two numbers so it still holds if either scale is re-tuned.
    for (const role of ['button', 'tabLabel', 'sectionLabel'] as const) {
      const latin = (type[role].letterSpacing ?? 0) / type[role].fontSize
      const khmer = (typeKm[role].letterSpacing ?? 0) / typeKm[role].fontSize
      assert.ok(
        khmer < latin / 4,
        `typeKm.${role} tracks at ${khmer.toFixed(3)}em against Latin's ${latin.toFixed(3)}em`
      )
    }
  })
})

describe('contentType', () => {
  it('picks the face from the string, not the language', () => {
    // The whole point. It takes no language and reads no context, so there is
    // no way for a caller to make it follow the toggle.
    assert.equal(contentType('rowTitle', 'Mango Sticky Rice'), type.rowTitle)
    assert.equal(contentType('rowTitle', 'អាម៉ុកត្រី'), typeKm.rowTitle)
  })

  it('keeps Moul off Latin text', () => {
    // The bug it exists for: a Latin recipe title in a Khmer UI came out in
    // Moul's Latin glyphs — a heavy blocky slab that sets far wider than
    // Newsreader, which is most of why those screens read as a different app.
    const latin = contentType('rowTitle', 'Pho Bo')
    assert.equal(latin.fontFamily, fonts.serif)
    assert.notEqual(latin.fontFamily, fonts.khmerDisplay)
  })

  it('keeps a Khmer-less mono off Khmer text', () => {
    // The same bug in the other direction, and the quieter one: an action
    // sheet titled in Khmer under an English UI fell through to whatever the
    // OS substituted for IBM Plex Mono.
    assert.equal(contentType('caption', 'បបរ').fontFamily, fonts.khmer)
  })

  it('follows a mixed string to Khmer', () => {
    // Any Khmer at all wins: a title reading `អាម៉ុក Amok` has clusters that
    // would be clipped by a Latin line box, and Kantumruy renders the Latin
    // half perfectly well. The reverse is not true.
    assert.equal(contentType('rowTitle', 'អាម៉ុក Amok'), typeKm.rowTitle)
  })

  it('does not throw on an empty string', () => {
    // Reached on every empty `Field` in the app.
    assert.equal(contentType('body', ''), type.body)
  })
})

describe('the empty-state roles', () => {
  it('are quieter than the recipe hero', () => {
    // `screenTitle` is Moul 33 in Khmer and exists for one thing, the detail
    // hero. Pointing an empty state at it put a wall of heavy display Khmer
    // across a screen whose whole job is to be quiet.
    assert.ok(type.emptyTitle.fontSize < type.screenTitle.fontSize)
    assert.ok(typeKm.emptyTitle.fontSize < typeKm.screenTitle.fontSize)
    assert.equal(typeKm.emptyTitle.fontFamily, fonts.khmer)
    assert.notEqual(typeKm.emptyTitle.fontFamily, fonts.khmerDisplay)
  })

  it('set the heading regular, not medium', () => {
    // The mockup's empty headings are 400. At 500 they read as a level of the
    // hierarchy they are not.
    assert.equal(type.emptyTitle.fontFamily, fonts.serif)
  })

  it('give the ghost glyph a line box bigger than itself', () => {
    // This is the one that produced two grey slivers on the Market screen: the
    // glyph was being set from cook mode's `stepNumeral`, 96 in a 100pt box.
    assert.ok(type.ghostGlyph.lineHeight! > type.ghostGlyph.fontSize)
    assert.equal(type.ghostGlyph.fontFamily, fonts.khmerDisplay)
    // Moul in both scales — it is a mark rather than text.
    assert.deepEqual(
      { ...typeKm.ghostGlyph, letterSpacing: undefined },
      { ...type.ghostGlyph, letterSpacing: undefined }
    )
  })

  it('carry the ratio down when resized', () => {
    // `sized`, not a bare fontSize override: 46 in the full-size line box would
    // push the heading half a screen down.
    const small = sized(type.ghostGlyph, 46)
    assert.equal(small.fontSize, 46)
    // The ratio survives the resize, and it is still Moul's own 1.81 rather
    // than the 1.45 this used to be pinned at — a `sized` glyph is as croppable
    // as a full-size one.
    assert.ok(small.lineHeight! / small.fontSize >= 1.8)
    assert.equal(
      small.lineHeight,
      Math.round(46 * (type.ghostGlyph.lineHeight! / type.ghostGlyph.fontSize))
    )
  })
})


/**
 * Moul set **outside** the scale — the recurrence guard.
 *
 * The test above holds every Moul *token* to the 1.81em the face declares. It
 * cannot see a screen that writes `{ fontFamily: 'Moul_400Regular', fontSize:
 * 25, lineHeight: 40 }` into its own stylesheet, and four screens did: the
 * first-run wordmark at 1.40, the recipe hero at 1.58, the Today's Dish card at
 * 1.60 and the About numerals at 1.55. All four cropped the top off the cluster,
 * and all four were written *after* `lhMoul` existed — the ratio lived in the
 * scale and these styles simply did not go through it.
 *
 * They go through `moulType` now. This reads the source as text, the way
 * `library.test.ts` reads the backend's, so the next one written by hand fails
 * here rather than on a Khmer reader's phone. **It is the only way to catch
 * this class offline**: web overflows a short line box and paints the glyph
 * anyway, so `tools/shoot.mjs` renders it correctly while a device does not.
 *
 * A hand-rolled Moul style with *no* `lineHeight` is left alone deliberately —
 * unpinned, the platform uses the font's own ascent and descent, which by
 * definition contain its ink. Pinning a number is what introduces the risk.
 */
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src')

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return tsxFiles(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

describe('Moul set outside the scale', () => {
  it('is never pinned to a line box shorter than its own ink', () => {
    // `fontSize: n` then optionally `lineHeight: m`, on one style object.
    const HAND_ROLLED =
      /fontFamily:\s*'Moul_400Regular',\s*fontSize:\s*(\d+)(?:,\s*lineHeight:\s*(\d+))?/g
    const MOUL_INK = 1.807
    const offenders: string[] = []

    for (const file of tsxFiles(SRC)) {
      // The scale itself is where the ratio is defined and already tested.
      if (file.endsWith(join('theme', 'typography.ts'))) continue
      const source = readFileSync(file, 'utf8')
      for (const [, size, line] of source.matchAll(HAND_ROLLED)) {
        if (!line) continue // unpinned: natural metrics contain the ink
        const fontSize = Number(size)
        const lineHeight = Number(line)
        if (lineHeight / fontSize >= MOUL_INK) continue
        offenders.push(
          `${relative(SRC, file)}: Moul ${fontSize}/${lineHeight} is ` +
            `${(lineHeight / fontSize).toFixed(2)}em, under ${MOUL_INK} — use moulType(${fontSize})`
        )
      }
    }

    assert.deepEqual(offenders, [], `\n  ${offenders.join('\n  ')}`)
  })

  it('moulType hands back a box the face fits in', () => {
    for (const size of [13, 22, 25, 33, 40, 62]) {
      const token = moulType(size)
      assert.equal(token.fontFamily, fonts.khmerDisplay)
      assert.equal(token.fontSize, size)
      assert.ok(
        token.lineHeight! / size >= 1.807,
        `moulType(${size}) gave ${token.lineHeight}, under the 1.807em Moul declares`
      )
    }
  })
})
