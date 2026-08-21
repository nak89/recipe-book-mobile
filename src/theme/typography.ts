import type { TextStyle } from 'react-native'
import { hasKhmer } from '@/lib/text'

/**
 * The four Chronicle faces, each with exactly one job (DESIGN_SYSTEM.md § Typography).
 *
 * This replaces the old arrangement, where the app was deliberately system-font
 * everywhere except one onboarding headline. Chronicle sets the entire product,
 * so every face here is bundled and every screen uses one.
 *
 * The split is by **script**, not by taste, and getting it wrong fails silently:
 * Newsreader and IBM Plex Mono have **no Khmer coverage at all**, so naming
 * either one on a Khmer string doesn't render Khmer in a serif — it drops to
 * whatever the OS substitutes, at metrics nothing in this app has measured. The
 * Khmer scale therefore never names a Latin face, and a mono label in English
 * becomes Kantumruy in Khmer rather than staying mono.
 *
 * `mono` was a platform lookup (`Menlo` / `monospace`) on the reasoning that
 * shipping a typeface for one 10pt kicker wasn't worth it. Chronicle puts mono
 * on every timer, quantity, metadata line and section label, so it is now a
 * real bundled face.
 */
export const fonts = {
  /** Latin body, titles and buttons. No Khmer coverage — never name it on Khmer. */
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  /** Latin metadata, timers, quantities, small-caps labels. No Khmer coverage. */
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  /** All Khmer body text, and the Khmer stand-in wherever Latin uses mono. */
  khmer: 'KantumruyPro_400Regular',
  khmerMedium: 'KantumruyPro_500Medium',
  /** Khmer display only — mastheads and big numerals. Never body text. */
  khmerDisplay: 'Moul_400Regular',

} as const

/**
 * Chronicle states tracking in ems and line-height as a multiplier; React Native
 * takes both in points. These convert at the token's own size, so the ratio is
 * visible in the source rather than pre-multiplied into a magic number.
 */
const em = (size: number, ems: number) => Math.round(size * ems * 100) / 100
const lh = (size: number, ratio: number) => Math.round(size * ratio)

/**
 * The same conversion for Khmer, rounding **up**.
 *
 * On the Latin scale a ratio is a target and rounding to the nearest point is
 * right. On the Khmer scale it is a **floor** — DESIGN_SYSTEM.md states 1.4 as a
 * minimum, because under it the platform shrinks the line box from the top and
 * shaves the vowel signs off the cluster. `Math.round` quietly landed on the
 * wrong side of that: `lh(11, 1.4)` is 15.4 → **15**, so the tab label rendered
 * at 1.36 while its own comment said it took the floor. Four tokens gain a point
 * from this and none loses one, which is the only safe direction here.
 */
const lhKm = (size: number, ratio: number) => Math.ceil(size * ratio)

/**
 * The line box **Moul** needs to draw all of its ink, as a multiple of its size.
 *
 * Read off the bundled file rather than chosen: `Moul_400Regular.ttf` declares
 * `unitsPerEm` 2048 with a `head` bounding box of `yMin −1200 / yMax +2500` and
 * an `hhea` ascent/descent of exactly the same pair — **+1.221em above the
 * baseline and −0.586em below it, so 1.807em of ink**. The two agreeing is the
 * useful part: for this face the declared metrics *are* the real extents, so
 * there is no slack to trim.
 *
 * Every Moul token used to take `lhKm(size, 1.45)`, which is 0.36em short. iOS
 * gives a line only `lineHeight − descent` above the baseline, so at 1.45 there
 * were `1.45 − 0.586 = 0.864`em above it against 1.221em of glyph, and the top
 * third of every Khmer masthead, screen title and ledger row was cut off. The
 * 1.4 "Khmer floor" that number came from is a rule about **Kantumruy** — whose
 * own ink is 1.443em, which 1.4 does very nearly cover — and Moul was quietly
 * held to a body face's measurement.
 *
 * **This is a Moul rule, not a Khmer one, and not a general one.** Newsreader's
 * bounding box is 1.325em, but that is its tallest glyph *anywhere* in the face,
 * not in any string this app sets; padding every Latin token out to it would add
 * a third of a line to text that has nothing to lose. Moul is different because
 * its bbox is driven by the stacked Khmer clusters that are exactly what it is
 * used to set.
 */
const MOUL_INK = 1.81

/** A line box for a Moul token. Rounds up, like `lhKm` and for the same reason. */
const lhMoul = (size: number) => Math.ceil(size * MOUL_INK)

/**
 * A **Moul style at an arbitrary size** — the face and the line box it needs,
 * together, so a call site cannot take one without the other.
 *
 * The scale's own Moul tokens (`screenTitle`, `ghostGlyph`, `stepNumeral`, the
 * masthead) already carry `lhMoul`. This is for the handful of places that set
 * Moul at a size the scale has no token for — a 40pt wordmark on the first-run
 * language picker, a 25pt title on the Today's Dish card — and which, before it
 * existed, each wrote `{ fontFamily: 'Moul_400Regular', fontSize: n, lineHeight:
 * m }` by hand and picked `m` by eye.
 *
 * **Every one of them picked it too small**, and by roughly the amount you would
 * if you reached for the 1.4 Khmer floor: 40/56, 33/52, 25/40, 22/34 — 1.4, 1.58,
 * 1.6 and 1.55 against the 1.81 the font actually declares. The top of the
 * cluster was cut off in all four. That is the failure `MOUL_INK` above is
 * about, recurring once per new screen because the ratio lived in the scale and
 * these styles did not.
 *
 * `tests/typography.test.ts` holds the backstop: any *remaining* hand-rolled
 * Moul style with an explicit `lineHeight` has to clear the same floor.
 */
export function moulType(fontSize: number): TextStyle {
  return { fontFamily: fonts.khmerDisplay, fontSize, lineHeight: lhMoul(fontSize) }
}

/**
 * A whisper of tracking on Khmer, and the reason it is a whisper.
 *
 * Every Khmer token used to pin `letterSpacing: 0`, transcribed from
 * DESIGN_SYSTEM.md: *"Khmer buttons drop the letter-spacing that Latin buttons
 * use — tracking breaks Khmer clusters."* That rule is aimed at the **Latin
 * display tracking** — `.18em` to `.22em` on buttons, tab labels and section
 * heads — and at those weights it is plainly right: a cluster is a base
 * consonant with a subscript hung under it and vowel signs stacked over it, and
 * a fifth of an em driven through one detaches the marks from what they belong
 * to. Zero, though, is the other end of the same argument rather than the
 * conclusion, and Kantumruy set solid at zero reads dense.
 *
 * 0.02em is roughly a tenth of the Latin display value — 0.28pt at body size.
 * Checked against the bundled files with the stacked cases that matter
 * (`សប្ដាហ៍`, `អាហារពេលព្រឹក`, `បញ្ជូន`, `ចង្ក្រាន`), the space lands **between**
 * clusters and every subscript and vowel sign stays attached, because the text
 * engine tracks by grapheme cluster rather than by code point.
 *
 * ⚠ That was verified in Chromium, which is the only place it can be. iOS
 * applies `letterSpacing` as kerning over the *shaped* run, and if a version
 * ever does that per glyph rather than per cluster this is exactly the value
 * that would show it. Keep it small, and keep `tests/typography.test.ts`'s
 * ceiling — it exists to stop the Latin display tracking finding its way in
 * here, which is the failure the design rule was actually written about.
 */
const KM_TRACKING = 0.02
const kmTrack = (size: number) => em(size, KM_TRACKING)

/**
 * The Latin scale — Newsreader for anything you read, IBM Plex Mono for
 * anything you reference (DESIGN_SYSTEM.md § Typography → Scale).
 *
 * The first block is Chronicle's own roles. The second is the outgoing scale's
 * names, kept as aliases onto Chronicle values so the thirty-odd screens that
 * still spread `type.title` keep compiling and keep looking right while they
 * are restyled one at a time. They are deleted as their last consumer is.
 *
 * **No token sets `fontWeight`**, and that is deliberate rather than an
 * omission. Every family here names its own weight (`Newsreader_500Medium`,
 * `IBMPlexMono_500Medium`, `KantumruyPro_500Medium`), so a `fontWeight: '500'`
 * beside one is at best redundant. iOS mostly resolves the pair back to the one
 * real face; Android and react-native-web instead **synthesize** a weight on top
 * of a face that already has it, which double-bolds the label. The family is the
 * single source of weight — if you need a different one, name a different face.
 */
export const type = {
  // ── Chronicle roles ─────────────────────────────────────────────────────
  /** The wordmark on every masthead. */
  masthead: {
    fontFamily: fonts.serifMedium,
    fontSize: 25,
    lineHeight: lh(25, 1.2),
    letterSpacing: em(25, -0.015),
  },
  /** A screen that announces itself — onboarding, auth, the authoring pages. */
  screenTitle: {
    fontFamily: fonts.serifMedium,
    fontSize: 32,
    lineHeight: lh(32, 1.2),
  },
  /**
   * An empty state's heading — **not** `screenTitle`.
   *
   * The mockup sets all four of them at `400 23px/1.5 Newsreader` (Kantumruy 21
   * in Khmer, inheriting the 34.5px line box, so ~1.6). `screenTitle` is Moul 33
   * in Khmer and exists for exactly one thing, the recipe-detail hero: pointing
   * an empty state at it put a wall of heavy display Khmer across the full width
   * of a screen whose whole job is to be quiet. Note the weight is **regular**,
   * which is the other half of the difference — at 500 these read as a level of
   * the hierarchy they aren't.
   */
  emptyTitle: { fontFamily: fonts.serif, fontSize: 23, lineHeight: lh(23, 1.5) },
  /** The title in a ledger row — a recipe, a collection, a plan slot. */
  rowTitle: { fontFamily: fonts.serif, fontSize: 16, lineHeight: lh(16, 1.2) },
  /**
   * The name in an *ingredient* row — the market list, and a recipe's own
   * ingredients — as opposed to `rowTitle`, which names a dish.
   *
   * A separate role because the mockup sets the two differently and means to:
   * `.swap.s .k` (a recipe in a list) is **Moul 15**, while `.ingname` is
   * `400 15px/1.2 Newsreader` in Latin and **Kantumruy 14** in Khmer. The
   * difference is what the string *is* — a dish has a name and takes the
   * display face, an ingredient is a word in a shopping list and takes the
   * reading one. Collapsing them onto `rowTitle` set every Khmer ingredient in
   * Moul, which is both the heaviest face in the product and the tallest: at
   * `lhMoul(15)` the line box alone is 27pt, so a market row stood 51pt high
   * and read as a page of headings.
   *
   * **A point over the mockup's 15/14**, at the user's call: the reading face
   * at the mockup's size held the row height but sat noticeably smaller than
   * the `rowTitle` beside it in the same list. The face is the part that was
   * wrong, not the size — this is `rowTitle`'s size in the reading weight.
   */
  ingredientName: { fontFamily: fonts.serif, fontSize: 16, lineHeight: lh(16, 1.2) },
  body: { fontFamily: fonts.serif, fontSize: 15, lineHeight: lh(15, 1.5) },
  /** One instruction, set large because your hands are busy. */
  cookStep: { fontFamily: fonts.serif, fontSize: 27, lineHeight: lh(27, 1.45) },
  /**
   * `LABEL ────── count`. Uppercased at the call site, not here.
   *
   * No `lineHeight`: this and the four below it used to pin one at or under
   * their own `fontSize`. CSS lets a short line box overflow and the glyph still
   * draws, which is why the mockup gets away with `10px/1` — React Native
   * **crops to the line box** and re-centres what is left, so the descenders
   * went. The surrounding `gap`/`paddingVertical` holds the rhythm instead; it
   * is the same `height` → `minHeight` inversion `minHeights` already made.
   */
  sectionLabel: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: em(10, 0.2),
  },
  /** Durations, quantities, dates, issue numbers, the timer. */
  metadata: { fontFamily: fonts.mono, fontSize: 12 },
  metadataSmall: { fontFamily: fonts.mono, fontSize: 11 },
  /**
   * A date in the week strip — the mockup's `500 15px 'IBM Plex Mono'`.
   *
   * Mono rather than the serif `rowTitle` it used to borrow, for the reason
   * cook mode's countdown is mono: seven numerals sit in seven flex columns and
   * a proportional face makes them drift left and right against their weekday
   * labels as the month rolls over. Medium because the date is the thing you
   * are picking; the weekday above it is the caption.
   */
  dayNumeral: { fontFamily: fonts.monoMedium, fontSize: 15, lineHeight: lh(15, 1.2) },
  button: {
    fontFamily: fonts.serifMedium,
    fontSize: 13,
    letterSpacing: em(13, 0.22),
  },
  tabLabel: {
    fontFamily: fonts.serifMedium,
    fontSize: 9.5,
    letterSpacing: em(9.5, 0.18),
  },
  /**
   * A filter tab that scopes the list under it — `THIS WEEK · TODAY · MISSING`.
   *
   * **Not `tabLabel`**, which is sized for the 88pt dock and would set these a
   * point small, and **not `sectionLabel`**, which is mono: the mockup draws the
   * aisle headers in IBM Plex and these in Newsreader, and the difference is
   * what keeps a control from reading as another heading. No `lineHeight`, like
   * every other label token here — the row's `paddingBottom` carries the rule
   * the underline sits on.
   */
  filterTab: {
    fontFamily: fonts.serifMedium,
    fontSize: 10.5,
    letterSpacing: em(10.5, 0.18),
  },
  /**
   * The ghosted display glyph behind an empty state — `០`, `?`, `◇`.
   *
   * **Moul in both scales**, which is why the two entries are identical: it is a
   * mark rather than text, and the mockup sets it in the display face whichever
   * language the page is in. The numeral itself still follows the language, via
   * `n()` at the call site.
   *
   * 62 is the empty book's; `sized(type.ghostGlyph, 46)` carries the 1.45 down
   * for the smaller `?` and `◇`. **This is not `stepNumeral`** — that is cook
   * mode's 100/.9 and appears nowhere else. Setting an empty state from it was
   * what left two grey slivers where a `០` should have been: at `lineHeight`
   * 100 on a 96pt Moul glyph, RN cropped the middle out of the character.
   */
  // `lhMoul`, even here on the Latin scale — the token names Moul in both, so it
  // takes Moul's measurement in both.
  ghostGlyph: { fontFamily: fonts.khmerDisplay, fontSize: 62, lineHeight: lhMoul(62) },
  /**
   * The ghosted numeral behind a **cook-mode** step, and nothing else.
   *
   * SCREENS.md § 8 specs `100/.9`, and 0.9 does not fit. Newsreader's digits run
   * from −0.024em to **+0.700em**, and iOS gives a line only `lineHeight −
   * descent` above the baseline — 0.9 − 0.265 = 0.635em against 0.700em of
   * glyph, so the top of every numeral was sliced off. The mockup gets away with
   * it because CSS lets a short line box *overflow* and paints the glyph anyway;
   * React Native crops to the box. Same divergence, same direction, as every
   * other `…/1` in the handoff.
   *
   * 0.965 is the digits' own measured requirement — `0.700` of ink plus the
   * `0.265` descent the platform reserves under it — and not a point more, so
   * the display tightness the design is after survives. `cook.tsx` takes the
   * slack back out of the layout with a derived negative margin; see
   * `stepTextOffset`.
   */
  stepNumeral: {
    fontFamily: fonts.serifMedium,
    fontSize: 100,
    lineHeight: lh(100, 0.965),
  },

  // ── Outgoing names, mapped onto Chronicle ───────────────────────────────
  kicker: {
    fontFamily: fonts.monoMedium,
    fontSize: 10,
    letterSpacing: em(10, 0.2),
  },
  displayLarge: {
    fontFamily: fonts.serifMedium,
    fontSize: 32,
    lineHeight: lh(32, 1.2),
  },
  display: {
    fontFamily: fonts.serifMedium,
    fontSize: 28,
    lineHeight: lh(28, 1.2),
  },
  title: {
    fontFamily: fonts.serifMedium,
    fontSize: 22,
    lineHeight: lh(22, 1.2),
  },
  section: {
    fontFamily: fonts.serifMedium,
    fontSize: 17,
    lineHeight: lh(17, 1.2),
  },
  bodyStrong: {
    fontFamily: fonts.serifMedium,
    fontSize: 15,
    lineHeight: lh(15, 1.5),
  },
  /**
   * The 16pt floor is a real constraint rather than a preference: mobile Safari
   * zooms the page when a focused input is under 16px, and this app runs in a
   * browser. Chronicle sets form values at 18, comfortably clear of it.
   */
  bodyLarge: { fontFamily: fonts.serif, fontSize: 16, lineHeight: lh(16, 1.5) },
  bodyLargeStrong: {
    fontFamily: fonts.serifMedium,
    fontSize: 16,
    lineHeight: lh(16, 1.5),
  },
  /** Body copy set as a paragraph — a description, a method step, a dialog. */
  bodyRead: { fontFamily: fonts.serif, fontSize: 15, lineHeight: lh(15, 1.5) },
  label: {
    fontFamily: fonts.serifMedium,
    fontSize: 13,
    lineHeight: lh(13, 1.2),
  },
  caption: { fontFamily: fonts.mono, fontSize: 12 },
} as const

/**
 * One entry in the scale. Deliberately wider than what `type` infers under
 * `as const`: the literal types are useless to a consumer and would make the
 * Khmer scale unassignable the moment a size differed, which is the entire
 * point of having a second scale.
 */
export interface TextToken {
  fontFamily?: string
  fontSize: number
  fontWeight?: TextStyle['fontWeight']
  letterSpacing?: number
  lineHeight?: number
}

/**
 * Every token a `makeStyles` factory can spread. `typeKm` is annotated with it
 * so a token added to one scale and not the other is a compile error — the same
 * guarantee `Strings` gives the dictionary.
 */
export type TypeScale = Record<keyof typeof type, TextToken>

/**
 * The Khmer scale — Kantumruy Pro for body, Moul for display, and **a pinned
 * line-height on every token**.
 *
 * This reverses the previous rule, which was "never pin a lineHeight on Khmer",
 * and the reversal is the point rather than a regression. That rule was correct
 * for the app as it stood and is worth understanding before touching anything
 * here.
 *
 * A Khmer cluster stacks a vowel sign above its base consonant and a subscript
 * consonant below it, so its ink runs past what Latin ascenders and descenders
 * claim — and both platforms shrink the line box **from the top** when
 * `lineHeight` falls under the font's ascent, shaving off the marks. Those marks
 * are the vowels, so what gets clipped is meaning. Raising the value blindly
 * doesn't fix it either: a constant tall enough for every cluster used to
 * overflow the app's fixed-height controls and clip the text whole, and both
 * failures look identical on screen.
 *
 * Two things changed, and both had to change before this file could:
 *
 *   1. **A Khmer font is bundled now.** Previously none was, so Khmer rendered
 *      in whatever the OS supplied — a different face on iOS than on Android,
 *      with an ascent nothing here could know. Leaving `lineHeight` unset handed
 *      the measurement to the platform, which was the only party that knew.
 *      Kantumruy Pro and Moul ship in the binary, so the metrics are now ours.
 *   2. **The fixed heights are gone.** `minHeights` are floors rather than
 *      walls, so a tall line box grows its control instead of being clipped by
 *      it. That was step 0.3, and it is the precondition for this file: pinning
 *      these values while `Field` was still 50pt tall would have reproduced the
 *      original failure exactly.
 *
 * Sizes and ratios are transcribed from DESIGN_SYSTEM.md § Typography → Scale.
 * Tracking is **not** transcribed: the design states a flat zero, and every
 * token now takes `kmTrack` instead — see that helper for what changed and what
 * the zero was actually protecting against.
 *
 * ⚠ TWO DEPARTURES, both where DESIGN_SYSTEM.md contradicts itself. Its scale
 * table gives Khmer tab labels `11/1` and the Khmer step numeral `96/.9`, while
 * the paragraph immediately below the same table reads: "**Khmer line-height
 * floor is 1.4. Khmer never gets `line-height: 1`.**"
 *
 *   - `tabLabel` takes the floor (1.4). It is real text with stacked clusters —
 *     `រុករក`, `សប្ដាហ៍` — in a 88px bar, and at 1.0 the marks would be shaved
 *     off the tab bar of every screen in the app. The prose rule wins over the
 *     table.
 *   - `stepNumeral` keeps 0.9 as specced. Khmer numerals `០១២៣` carry no
 *     stacked vowel signs, so the mechanism the floor exists to prevent does not
 *     apply, and the tight leading is the display effect being asked for. This
 *     one wants checking on a device — it is the single riskiest value here.
 */
export const typeKm: TypeScale = {
  // ── Chronicle roles ─────────────────────────────────────────────────────
  masthead: {
    fontFamily: fonts.khmerDisplay,
    fontSize: 25,
    lineHeight: lhMoul(25),
    letterSpacing: kmTrack(25),
  },
  screenTitle: {
    fontFamily: fonts.khmerDisplay,
    fontSize: 33,
    lineHeight: lhMoul(33),
    letterSpacing: kmTrack(33),
  },
  // Kantumruy, not Moul. The mockup's `km` span overrides only the family and
  // the size, so it keeps the Latin shorthand's computed 34.5px line box — 21pt
  // text in a 34pt line, i.e. ~1.6. Moul here is what made the Market's empty
  // state a full-width slab of display Khmer.
  emptyTitle: { fontFamily: fonts.khmer, fontSize: 21, lineHeight: lhKm(21, 1.6), letterSpacing: kmTrack(21) },
  rowTitle: {
    fontFamily: fonts.khmerDisplay,
    fontSize: 15,
    lineHeight: lhMoul(15),
    letterSpacing: kmTrack(15),
  },
  // Kantumruy at 15, not Moul — see the Latin token for why the two row roles
  // are separate.
  //
  // **1.45, not the design's 1.4**, and the difference is a real point of ink
  // rather than rounding: `Kantumruy-Regular` declares 1.443em of it (hhea
  // ascent +1.023em, descent −0.420em), so a 15pt token in a 21pt box loses the
  // top of every vowel sign — ស្លឹកគ្រៃ and ខ្ទិះដូង shaved along the upper
  // mark. DESIGN_SYSTEM.md's 1.4 is prose; the font file is the authority, the
  // same way `lhMoul` beat the doc's ratio for the display face.
  ingredientName: {
    fontFamily: fonts.khmer,
    fontSize: 15,
    lineHeight: lhKm(15, 1.45),
    letterSpacing: kmTrack(15),
  },
  body: { fontFamily: fonts.khmer, fontSize: 14, lineHeight: lhKm(14, 1.85), letterSpacing: kmTrack(14) },
  cookStep: { fontFamily: fonts.khmer, fontSize: 23, lineHeight: lhKm(23, 1.85), letterSpacing: kmTrack(23) },
  // Kantumruy, not mono: IBM Plex Mono has no Khmer glyphs, so naming it here
  // would only hide a silent substitution. The design states the swap directly.
  sectionLabel: {
    fontFamily: fonts.khmerMedium,
    fontSize: 13,
    lineHeight: lhKm(13, 1.6),
    letterSpacing: kmTrack(13),
  },
  metadata: { fontFamily: fonts.khmer, fontSize: 13, lineHeight: lhKm(13, 1.6), letterSpacing: kmTrack(13) },
  metadataSmall: { fontFamily: fonts.khmer, fontSize: 12, lineHeight: lhKm(12, 1.6), letterSpacing: kmTrack(12) },
  // Kantumruy Medium at the same 15, which is the mockup's own Khmer numeral —
  // not Moul. `០១២` carries no stacked mark, but the strip sits beside Khmer
  // weekday labels already set in Kantumruy and a display face would out-shout
  // them.
  dayNumeral: {
    fontFamily: fonts.khmerMedium,
    fontSize: 15,
    // `lhKm`, not `lhMoul` — this token is Kantumruy, and 1.45 already clears
    // that face's own 1.443em of ink.
    lineHeight: lhKm(15, 1.45),
    letterSpacing: kmTrack(15),
  },
  button: {
    fontFamily: fonts.khmerMedium,
    fontSize: 15,
    lineHeight: lhKm(15, 1.6),
    letterSpacing: kmTrack(15),
  },
  // 1.4, not the table's 1.0 — see the departure note above.
  tabLabel: {
    fontFamily: fonts.khmerMedium,
    fontSize: 11,
    lineHeight: lhKm(11, 1.4),
    letterSpacing: kmTrack(11),
  },
  // 13, two and a half points over the Latin, which is the one place the Khmer
  // scale steps *up*: the mockup writes it that way because `សប្ដាហ៍នេះ` at
  // 10.5 with the tracking dropped sets narrower than `THIS WEEK` does, and the
  // row would read as an afterthought beside it.
  filterTab: {
    fontFamily: fonts.khmerMedium,
    fontSize: 13,
    lineHeight: lhKm(13, 1.6),
    letterSpacing: kmTrack(13),
  },
  // Identical to the Latin entry on purpose — see the note there.
  ghostGlyph: {
    fontFamily: fonts.khmerDisplay,
    fontSize: 62,
    lineHeight: lhMoul(62),
    letterSpacing: kmTrack(62),
  },
  // The same correction, and far larger here. Moul's digits `០`–`៩` reach
  // **+0.952em** with a 0.586em descent reserved beneath them, so they need
  // 1.538em — against the specced 0.9, which left 0.314em of room for 0.952em of
  // glyph and cut roughly two thirds off the top of the numeral. This is the
  // value the old "numerals carry no stacked marks, so .9 is safe" note got
  // wrong: the crop is a property of the **box**, not of the marks.
  //
  // Still well under the 1.807em a Moul *letter* needs — see `lhMoul`. Digits
  // are the one thing in this face that doesn't reach the full ascent, which is
  // exactly why this token gets measured separately instead of taking the rule.
  stepNumeral: {
    fontFamily: fonts.khmerDisplay,
    fontSize: 96,
    lineHeight: lhKm(96, 1.538),
    letterSpacing: kmTrack(96),
  },

  // ── Outgoing names, mapped onto Chronicle ───────────────────────────────
  kicker: {
    fontFamily: fonts.khmerMedium,
    fontSize: 13,
    lineHeight: lhKm(13, 1.6),
    letterSpacing: kmTrack(13),
  },
  displayLarge: {
    fontFamily: fonts.khmerDisplay,
    fontSize: 33,
    lineHeight: lhMoul(33),
    letterSpacing: kmTrack(33),
  },
  display: {
    fontFamily: fonts.khmerDisplay,
    fontSize: 28,
    lineHeight: lhMoul(28),
    letterSpacing: kmTrack(28),
  },
  title: {
    fontFamily: fonts.khmerDisplay,
    fontSize: 22,
    lineHeight: lhMoul(22),
    letterSpacing: kmTrack(22),
  },
  section: {
    fontFamily: fonts.khmerMedium,
    fontSize: 17,
    lineHeight: lhKm(17, 1.6),
    letterSpacing: kmTrack(17),
  },
  bodyStrong: {
    fontFamily: fonts.khmerMedium,
    fontSize: 14,
    lineHeight: lhKm(14, 1.85),
    letterSpacing: kmTrack(14),
  },
  bodyLarge: { fontFamily: fonts.khmer, fontSize: 16, lineHeight: lhKm(16, 1.85), letterSpacing: kmTrack(16) },
  bodyLargeStrong: {
    fontFamily: fonts.khmerMedium,
    fontSize: 16,
    lineHeight: lhKm(16, 1.85),
    letterSpacing: kmTrack(16),
  },
  // The design asks for 1.85–1.9 on multi-line Khmer paragraphs specifically,
  // which is what this token is for; `body` already sits at 1.85.
  bodyRead: { fontFamily: fonts.khmer, fontSize: 14, lineHeight: lhKm(14, 1.9), letterSpacing: kmTrack(14) },
  label: {
    fontFamily: fonts.khmerMedium,
    fontSize: 13,
    lineHeight: lhKm(13, 1.6),
    letterSpacing: kmTrack(13),
  },
  caption: { fontFamily: fonts.khmer, fontSize: 12, lineHeight: lhKm(12, 1.6), letterSpacing: kmTrack(12) },
}

export const TYPE_SCALES = { en: type, km: typeKm } as const

/**
 * The face for a piece of **content**, chosen by the string rather than by the
 * interface language.
 *
 * `TYPE_SCALES[language]` is right for chrome and wrong for content, and the
 * difference is not cosmetic. Chrome is UI copy: it is always in the UI's
 * language, so keying it to the language is keying it to what it is. Content is
 * whatever the user typed — a recipe title, an ingredient name, a method step —
 * and it stays in the script it was written in no matter which way the toggle is
 * set. Handing that to the language-keyed scale set "Mango Sticky Rice" in
 * **Moul**, a Khmer display face, whose Latin glyphs are a heavy blocky slab
 * that sets far wider than Newsreader: every Latin title in a Khmer UI came out
 * in the wrong face at the wrong width, which is most of why those screens read
 * as a different product.
 *
 * The test is `hasKhmer(text)` — the same one `LedgerRow` already uses to decide
 * whether a strikethrough is safe, and for the same reason it gives there: *"the
 * test is on the **string**, not the active language."* That rule was always
 * meant to govern the face too.
 *
 * **It is a plain function, not a hook, and it reads nothing from context.**
 * That is the whole point: a hook would imply it depends on the language, and
 * anyone reading the call site would have to check whether it does.
 *
 *     <Text style={[styles.title, contentType('rowTitle', recipe.title)]}>
 *
 * Put only colour and layout in the stylesheet entry and let this supply every
 * type property, so the two can't half-merge — a `letterSpacing` left behind
 * from the other scale is exactly the kind of residue that survives a review.
 */
export function contentType(role: keyof TypeScale, text: string): TextToken {
  return (hasKhmer(text) ? typeKm : type)[role]
}

/**
 * Re-size a token, carrying its line box down with it.
 *
 * `{ ...type.bodyStrong, fontSize: 14 }` used to be harmless, because almost
 * nothing in either scale pinned a `lineHeight`. **Both scales now pin one on
 * every token**, so a bare `fontSize` override leaves 14pt text spaced for a
 * 22pt line — and on the Khmer scale it is worse than loose, since the ratios
 * there are the thing keeping the vowel marks on screen.
 *
 * Use this instead of overriding `fontSize` on a spread token.
 */
export function sized(token: TypeScale[keyof TypeScale], fontSize: number): TextStyle {
  if (!token.lineHeight) return { ...token, fontSize }
  const ratio = token.lineHeight / token.fontSize
  return { ...token, fontSize, lineHeight: Math.round(fontSize * ratio) }
}

/**
 * A token for a **single-line `TextInput`** — the same face, with the line box
 * turned back into a floor.
 *
 * `Text` and `TextInput` do not treat `lineHeight` the same way. On a `Text` it
 * is leading and the glyph is drawn wherever the box puts it; on a single-line
 * input both platforms hand it to the text engine as a paragraph line height
 * and then clip the field's content box to it, so the extra leading is added
 * *above* the baseline and the descenders drop out of the bottom of the box.
 * That is what cut the tails off `g`, `y` and `p` on the sign-up form, and it
 * bites hardest where the input also sets `paddingVertical: 0` — the content
 * box is then exactly the line box, with nothing to overshoot into.
 *
 * The natural metrics are the right answer here: a font's own ascent and
 * descent always contain its ink, including a Khmer cluster's stacked marks, so
 * an unpinned single line cannot crop. The box it gives up is kept as a
 * `minHeight` floor, so an input can never end up shorter than the line it was
 * spaced for — the field closes up by the leading it was carrying and no more.
 *
 * **`multiline` used to keep its `lineHeight`**, on the reasoning that there it
 * is doing the job it is for — setting the leading between wrapped lines — and
 * the text view grows to fit rather than clipping. It doesn't any more. The
 * surplus leading is added *above* each line, the first one included, so an
 * 18pt placeholder spaced for a 29pt line starts a third of a line down inside
 * its own box: the description field read as floating below its label rather
 * than sitting at the top of the field. Wrapped lines close up to the face's
 * own leading, which is the same guarantee the paragraph above rests on — a
 * font's ascent and descent contain its ink, stacked Khmer marks included.
 */
export function inputType(token: TextToken | TextStyle): TextStyle {
  const { lineHeight, ...face } = token
  return lineHeight == null ? face : { ...face, minHeight: lineHeight }
}
