/**
 * Chronicle. One palette — see `ThemeContext` for why a printed-page direction
 * has no night mode.
 *
 * Every colour is named by role rather than hue, which is what has made each
 * palette change since — warm stone, to near-neutral green, and now to cream
 * and tamarind — a change to two files rather than thirty. No screen asks for
 * "tamarind"; it asks for `primary`.
 *
 * **There are exactly four base colours**, and everything else in this file is
 * one of them at an alpha:
 *
 *   `paper`    #f8f2e6   every background — screens, tab bar, sheets
 *   `ink`      #241e18   every piece of text, every rule, every icon stroke
 *   `tamarind` #b4522a   the primary action, the active state, accent numerals
 *   `oat`      #e7dccb   image placeholders and thumbnails
 *
 * **There are only two background colours in the whole app**, `paper` and
 * `oat`, and no gradients anywhere except the 28px fade behind sticky CTAs.
 * A card here is defined by a rule and a radius, never by sitting on a
 * different fill and never by a shadow — which is why `bg`, `surface` and
 * `textInverse` all resolve to the same cream, and why that is correct rather
 * than lazy. If a surface needs separating, it gets a hairline, not a tint.
 *
 * **Depth is spent once.** The single shadow in the product sits under a
 * tamarind button (`shadow.raised`). Nothing else is elevated.
 *
 * **Muted text is ink at an alpha, never a separate grey.** The design system
 * states this as `opacity: .5` on ink; it is written here as `rgba` so it can
 * live in a colour token rather than forcing every consumer to stack an opacity
 * on a `Text`. The two are equivalent over an opaque `paper` ground, which is
 * the only ground the app has.
 *
 * **There is no flat `colors` export.** Reading a palette directly would bake
 * it into a module-scope `StyleSheet.create`, which is exactly the bug that
 * made dark mode impossible before. Use `useThemedStyles` instead — and note
 * the same indirection now carries the *language*-dependent type scale, so it
 * is load-bearing whether or not a second palette ever exists.
 */

// The four bases, written once so every alpha below is visibly derived from one
// of them rather than being an independent colour someone has to reconcile.
const INK_RGB = '36,30,24'
const TAMARIND_RGB = '180,82,42'
/** `bg`/`surface`'s cream, needed as rgb by the one token that fades it out. */
const PAPER_RGB = '248,242,230'
/** The hero and tutorial scrims are a *warmer, darker* brown than `ink`, per spec. */
const SHADE_RGB = '26,20,14'

const paper = {
  // ── Surfaces ────────────────────────────────────────────────────────────
  // Only two exist. `bg` and `surface` are the same cream, as they have been
  // through every palette this app has had, and `surfaceAlt`/`surfaceSunken`
  // both land on oat: the design has one recessed fill, used for image
  // placeholders, thumbnails and tiles alike.
  bg: '#f8f2e6',
  /**
   * `bg` with its alpha taken out, for a gradient that fades the page into
   * nothing — currently the overflow fade at the end of the dish filter's row.
   *
   * It exists for the same reason `scrimNone` does: a gradient ending on a
   * differently-coloured `transparent` interpolates through that colour's rgb
   * on the way and leaves a visible fringe down the ramp. The end stop has to
   * be this cream at zero, not `transparent`.
   */
  bgNone: `rgba(${PAPER_RGB},0)`,
  bgSubtle: '#e7dccb',
  surface: '#f8f2e6',
  surfaceAlt: '#e7dccb',
  surfaceSunken: '#e7dccb',
  /** The oat base under its own name, for places that mean the fill literally. */
  oat: '#e7dccb',
  /**
   * The ground *behind* the phone in the prototype. The design system marks it
   * "not an app color", and on a phone it isn't — but the app also runs in a
   * browser, where the page is wider than the design and the layout is capped
   * to a phone-width column. This is what surrounds that column, which is the
   * same job it does in the prototype.
   */
  canvas: '#efe7d8',

  // ── Rules ───────────────────────────────────────────────────────────────
  // Three weights, and the difference between them is the whole visual system:
  // a page of ruled lines instead of a grid of filled cards. They are alphas
  // over ink rather than separate greys so they sit *in* the paper rather than
  // on it.
  /** List-row separators — the hairline under every ledger row. */
  border: `rgba(${INK_RGB},0.16)`,
  /** The rule beside a section header, one step stronger than a row separator. */
  borderStrong: `rgba(${INK_RGB},0.22)`,
  /**
   * Dotted leaders and dashed "add" outlines — the two idioms that make a list
   * read as a printed index and an empty slot read as an unfilled line.
   */
  borderFaint: `rgba(${INK_RGB},0.35)`,

  // ── Type ────────────────────────────────────────────────────────────────
  // One ink, at four strengths. Measured on `paper`:
  //
  //   text          14.78:1   passes AA and AAA comfortably
  //   textMuted      3.15:1   ⚠ fails AA (4.5:1) for body copy — see below
  //   textPlaceholder 2.41:1   intentionally sub-threshold; reads as absent
  //   inactive       2.54:1   ⚠ under the 3:1 floor for a UI control
  //
  text: '#241e18',
  /**
   * ⚠ Ink at .5, exactly as the design system specifies ("Muted text:
   * `opacity: .5` on ink, never a separate grey") — and it measures **3.15:1**,
   * which is under the 4.5:1 needed for body text.
   *
   * Transcribed as specified rather than quietly corrected, because it is a
   * design decision to make rather than a transcription error to fix: this token
   * carries a lot of real copy (recipe descriptions, meta lines, every
   * empty-state sub-line), and darkening it to ~.62 would clear AA while
   * visibly changing the page's colour — the pale secondary voice is a large
   * part of what makes the layout read as printed rather than as a UI.
   *
   * Worth noting this codebase has declined a sub-threshold handoff value
   * before, on the selected `Chip`, where white-on-green measured 2.3:1. The
   * difference is that there the fix cost nothing; here it costs the look.
   */
  textMuted: `rgba(${INK_RGB},0.5)`,
  /** Ink at .4 — placeholders and unfilled field values. Reads as absent. */
  textPlaceholder: `rgba(${INK_RGB},0.4)`,
  /**
   * What sits on a tamarind fill: paper, not white. The design system says so
   * directly ("Primary: tamarind fill, paper text"), and it matters — pure
   * white against this brown-red is colder than anything else in the product
   * and reads as a sticker stuck onto the page.
   */
  textInverse: '#f8f2e6',
  textOnPhoto: '#f8f2e6',

  // ── Actions ─────────────────────────────────────────────────────────────
  // Tamarind and paper measure **4.50:1 against each other**, which clears AA
  // for normal text in both directions — a tamarind link on paper, and a paper
  // label on a tamarind button. Worth stating because the outgoing palette could
  // not do this: white on that green was 2.1:1, which is why its buttons had to
  // carry ink instead. Chronicle's accent needs no such workaround.
  primary: '#b4522a',
  /**
   * INVENTED — the design system specifies no pressed state, and the motion
   * section allows only four transitions in the product (none of them a button
   * press). This is tamarind stepped ~10% darker so a press is legible without
   * introducing a second accent. If the design ever states one, replace it;
   * the alternative used elsewhere in this app is dropping opacity on press,
   * which is what the non-tamarind controls already do.
   */
  primaryPressed: '#9e4824',
  onPrimary: '#f8f2e6',

  // `accent` is an alias of `primary` and has no colour of its own. Chronicle
  // has exactly one accent; a second would be the inconsistency, not the
  // feature.
  accent: '#b4522a',
  /** Tamarind at .1 — chip fills, inline notices, the set-timer chip. */
  accentSoft: `rgba(${TAMARIND_RGB},0.1)`,
  /**
   * Tamarind at .09 — the active tab pill, and *only* that. A hundredth apart
   * from `accentSoft` and kept separate because the design system states the
   * two independently and fidelity here is exact; collapsing them would be a
   * decision, not a tidy-up.
   */
  accentPill: `rgba(${TAMARIND_RGB},0.09)`,
  /** Ghosted display glyphs — the empty-state `០`, cook mode's step numeral. */
  accentGhost: `rgba(${TAMARIND_RGB},0.18)`,
  /** Ink at .42 — an inactive tab label, the one "disabled" strength there is. */
  inactive: `rgba(${INK_RGB},0.42)`,

  /**
   * Saving a recipe. Chronicle has one accent, so the heart's red is gone with
   * the rest of the old palette — the detail screen's control is a `◇ SAVE` /
   * `◆ SAVED` diamond in tamarind, not a filled heart. These stay as aliases
   * until that screen is restyled.
   */
  favourite: '#b4522a',
  favouriteSoft: `rgba(${TAMARIND_RGB},0.1)`,

  /**
   * ⚠ Destructive actions have no colour of their own in this design, and this
   * is a real gap rather than an omission I can fill safely. Chronicle names
   * four colours and no alert red; introducing one would put a second
   * saturated hue next to tamarind, which is the thing the palette is built to
   * avoid. Delete confirmations therefore read as tamarind and lean on their
   * *copy* to carry the warning. Worth a design decision rather than leaving
   * it to this comment.
   */
  danger: '#b4522a',
  dangerSoft: `rgba(${TAMARIND_RGB},0.1)`,

  // ── Scrims ──────────────────────────────────────────────────────────────
  // Warmer and darker than ink: these sit over photographs, where a neutral
  // black would grey the food out.
  /** Over the top 190px of a recipe hero, fading to nothing. */
  scrim: `rgba(20,14,8,0.42)`,
  /** The tutorial's full-screen dim. */
  scrimStrong: `rgba(${SHADE_RGB},0.5)`,
  scrimSoft: `rgba(20,14,8,0.25)`,
  /**
   * A gradient fading to a *differently* coloured transparent interpolates
   * through grey and leaves a visible fringe, so the end stop has to share the
   * middle stop's rgb rather than being a bare `transparent`.
   */
  scrimNone: `rgba(20,14,8,0)`,
}

/**
 * Kept as a named type even though exactly one palette satisfies it.
 *
 * Its original job was to stop two palettes drifting — a key present in one and
 * missing from the other was a compile error. With dark mode gone that
 * guarantee has nothing left to guard, but the type is what every `makeStyles`
 * factory takes as its first argument, so it is now the contract between the
 * palette and the thirty-odd screens reading it — and the shape a night palette
 * would have to satisfy if one is ever designed.
 */
export type ThemeColors = Record<keyof typeof paper, string>

export const paperColors: ThemeColors = paper
