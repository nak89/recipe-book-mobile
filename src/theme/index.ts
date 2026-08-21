import { useMemo } from 'react'
import { Platform, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLanguage } from '@/i18n'
import { useTheme } from './ThemeContext'
import { TYPE_SCALES } from './typography'
import type { ThemeColors } from './palettes'
import type { TypeScale } from './typography'

// `@/theme` stays the single import path for everything design-system, so no
// screen ever needs to know that the palettes, the type scales and the hooks
// live in separate modules. They're split only to keep the dependency running
// one way: palettes + typography -> ThemeContext -> index, never back.
export { paperColors } from './palettes'
export type { ThemeColors } from './palettes'
export { ThemeProvider, useTheme } from './ThemeContext'
export { contentType, fonts, inputType, moulType, sized, type, typeKm } from './typography'
export type { TextToken, TypeScale } from './typography'
export { curve, duration, ease, spring, useMotion } from './motion'
export type { DurationKey } from './motion'

/**
 * Six steps, no more: 4/8/12/16/24/32.
 *
 * Anything in a screen that isn't on this scale is a measured exception with a
 * reason beside it — the tab bar's 7px icon-to-label gap, a 3px badge pad, a
 * 2px stat gap. If you reach for a seventh step, one of the six is probably
 * right. Chronicle's own page metrics are named below rather than added to the
 * scale, because they are rules about the page and not steps you choose from.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,

  // ── Chronicle's named measurements ──────────────────────────────────────
  // These are page metrics rather than steps on the scale, and three of them
  // (6, 10–13, 20) aren't on it at all. They're named because the design states
  // them as rules about the page — how far the text sits from the edge, how
  // tightly a section closes up under its own header — not as spacing you pick.
  /** Every screen's side margin. The reading page (recipe detail) uses 42. */
  gutter: 24,
  /** Onboarding and auth only, which the design sets more generously. */
  gutterWide: 30,
  /** Ledger row vertical padding — the design gives 10–13; this is the middle. */
  rowY: 12,
  /** The bottom of that range, for the tighter ingredient row. */
  rowYTight: 10,
  /** A ruled section header to its first row. Deliberately tight: they pair. */
  sectionGap: 6,
  /** Between one section and the next — the design gives 16–22. */
  sectionSpacing: 20,
  /** The reading gutter on recipe detail, wider than everywhere else. */
  readingGutter: 42,
} as const

/**
 * Where a screen's header sits: **the safe-area inset plus `spacing.lg`**, for
 * every screen in the app.
 *
 * This is a hook rather than a number because the inset is per-device, and it
 * lives here rather than in each screen because the arithmetic drifted the
 * moment it was written twice. Four tabs once carried two different rules —
 * Explore and Recipes used `Math.max(insets.top, spacing.lg)` while the planner
 * and grocery added the two — and the headings sat 16pt apart on any notched
 * phone while looking identical on web, where the inset is 0 and the two
 * expressions collapse to the same number.
 *
 * **Never `Math.max(insets.top, …)`.** The inset *is* the status bar, so `max`
 * spends the whole allowance clearing it and leaves the heading tucked under
 * the clock. Clear the bar, then add the gap.
 *
 * This is the one source for it: a screen that wants its header on the common
 * line calls this and adds nothing. Content that is not a header — the floating
 * back/save controls over a full-bleed photo hero — is measured from the inset
 * directly and is deliberately not on this line, because those screens have no
 * header row and the photograph runs under the status bar by design.
 */
export function useScreenTopPad(): number {
  const insets = useSafeAreaInsets()
  return insets.top + spacing.lg
}

/**
 * Chronicle's radii, which are a ladder of *sizes of thing* rather than a
 * t-shirt scale: the bigger the object, the rounder its corner. There is no
 * radius below 12 in the product and nothing sharp except the tutorial artwork.
 *
 * `sm`/`md`/`xl` are the outgoing names, remapped onto the nearest Chronicle
 * value so unrestyled screens land on a legal corner instead of an 8 or a 24
 * that no longer exists anywhere in the design. They retire with their last
 * consumer.
 */
export const radius = {
  /** List thumbnails — the 46×46 image in a ledger row. */
  thumb: 12,
  /** Small chips and thumbnails. */
  chip: 14,
  /** Inline notices — the offline strip. */
  notice: 16,
  /** Cards, tiles and dashed add rows. */
  card: 18,
  /** Primary buttons and sticky CTAs. */
  button: 20,
  /** Pills, toggles, progress bars. Circles use `borderRadius: '50%'` instead. */
  pill: 999,

  // Outgoing names.
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  /**
   * The brand mark's rounded square on the welcome sheet — a squircle radius,
   * off the scale on purpose, because the mark is 56pt and `xl` reads as a
   * pill at that size.
   */
  mark: 18,
} as const

/**
 * Control heights as **floors**, not fixed values. This inverts what the same
 * numbers used to mean, and the inversion is the point.
 *
 * They were `height`, and the old comment called them load-bearing for a
 * genuine reason: Khmer pins no line-height, so its line boxes are whatever the
 * platform measures, and a control that grew to fit them would have jumped
 * around unpredictably. Pinning the box instead made the layout stable — at the
 * cost of making the box the thing that clips. That trade is why the Khmer
 * scale can never pin a line-height and can never be set a point larger: these
 * were the walls it had to fit inside.
 *
 * Chronicle removes the walls. Its controls are described by padding, not
 * height — form fields are "no boxes, a value and a 1.2px underline", primary
 * buttons are "18px vertical padding", ledger rows are "padding 10–13px
 * vertical" — so a control is as tall as what it holds. That is what finally
 * lets Khmer take the line-heights the design specifies (see `typeKm`): a tall
 * cluster grows its row instead of being shaved off at the top.
 *
 * Kept as `minHeight` rather than dropped entirely because the numbers still do
 * a second job they always did quietly — holding a comfortable tap target when
 * the content is short. Latin at these sizes never reaches the floor, so
 * nothing about the Latin layout moves.
 *
 * Pair every one of these with `paddingVertical`. The floor governs an empty or
 * short control; the padding is what keeps tall content off the edges.
 */
export const minHeights = {
  button: 52,
  field: 50,
  search: 48,
  dialogButton: 46,
  row: 52,
} as const

/**
 * Fixed sizes for things that aren't controls with text in them.
 *
 * `hitMin` is the floor every tap target in the app clears — 44pt. Where a
 * control is drawn smaller than that (the grocery stepper's circles, at 38),
 * the *touch* area is still padded out to 44 and the padding inset back out of
 * the layout, so the drawn size and the tappable size can disagree safely.
 */
export const sizes = {
  avatar: 88,
  mark: 56,
  circleButton: 38,
  cardFavourite: 30,
  stepNumber: 26,
  hitMin: 44,
  /**
   * How far the status-bar blur ramps *past* the safe-area inset.
   *
   * The band is `insets.top + this`, which lands at ~67pt on a notched phone —
   * the value the treatment settled on after four reductions from 87. Short is
   * the point: the ramp only has to soften the line where a photograph meets
   * the clock, not put a panel over the page.
   */
  headerBlurRamp: 8,
} as const

/**
 * Blur intensity for the status-bar band, per theme.
 *
 * These are *peak* values — the top layer's — and every layer below carries a
 * fraction of them. They read absurdly low next to a conventional frosted
 * header (60–80) and that is deliberate: this app is photo-first, the recipe
 * photography is the content, and chrome that frosts it is chrome competing
 * with the thing the screen exists to show.
 *
 * This is the dial. Turn it up if the band is too faint to see; nothing else in
 * the ramp needs touching.
 */
export const blur = {
  header: 15,
} as const

/**
 * The reference frame every screen in the design system is drawn at.
 *
 * Not a layout constraint — the app is responsive and runs on everything from a
 * small phone to a resized browser window. This is here so a screenshot can be
 * taken at the size the mockups were drawn at when diffing against them.
 */
export const screen = {
  width: 402,
  height: 874,
} as const

/**
 * The replacement for a module-scope `StyleSheet.create`.
 *
 * Pass a factory declared at module scope — it's a stable reference, so the
 * memo only recomputes when the palette or the language actually changes, and
 * the stylesheet is built once per combination rather than once per render.
 *
 *     const styles = useThemedStyles(makeStyles)
 *     ...
 *     const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({ ... })
 *
 * The second argument is why the module-level `type` export is *not* what a
 * screen should spread. The Khmer scale's whole content is the *absence* of a
 * pinned `lineHeight` (see `typography.ts`), and a factory that reached past its
 * parameter for the static scale would set Khmer in a Latin line box and clip
 * its own headline the moment the language toggle moved — the same class of bug
 * as reading a palette at module scope, which is what `useThemedStyles` exists
 * to prevent in the first place.
 *
 * It lives here rather than in `ThemeContext` because it now reads two
 * contexts, and `ThemeContext` importing `@/i18n` would point the dependency
 * back the way it isn't allowed to run.
 */
export function useThemedStyles<T>(factory: (colors: ThemeColors, type: TypeScale) => T): T {
  const { colors } = useTheme()
  const scale = useTypeScale()
  return useMemo(() => factory(colors, scale), [factory, colors, scale])
}

/**
 * The scale on its own, for the handful of places that style text *outside* a
 * `StyleSheet` — chiefly react-navigation's `headerTitleStyle`, which is an
 * option object rather than a stylesheet entry and so never reaches a
 * `makeStyles` factory.
 */
export function useTypeScale(): TypeScale {
  const { language } = useLanguage()
  return TYPE_SCALES[language]
}

/**
 * **There is exactly one shadow in this product**, and it is coloured rather
 * than grey: `0 12px 28px rgba(180,82,42,.24)`, cast by a tamarind button onto
 * the paper under it. Nothing else is elevated.
 *
 * That is the design's whole position on depth, and it is a position rather
 * than an omission — "No card shadows: cards are defined by rules and radii,
 * not elevation." A page of paper has no floating layers, so a card that lifts
 * off it reads as a different material. Separation here is a hairline, a radius,
 * or a change of ground to `oat`. If something looks like it needs a shadow, it
 * almost certainly needs a rule.
 *
 * The shadow being *tamarind* and not black matters too: it reads as the
 * button's own colour bleeding onto the page, the way a saturated ink does, not
 * as an object casting a shadow in a room.
 *
 * iOS and Android express elevation differently, so both live in the token and
 * no component re-derives the branch. Android's `elevation` can't take a colour
 * on older APIs, which is why `shadowColor` is set alongside it.
 */
export const shadow = {
  /**
   * The only real shadow. Under primary buttons and sticky CTAs.
   */
  raised: Platform.select({
    ios: {
      shadowColor: '#b4522a',
      shadowOpacity: 0.24,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 12 },
    },
    android: { elevation: 8, shadowColor: '#b4522a' },
    default: { boxShadow: '0 12px 28px rgba(180,82,42,0.24)' },
  }),
  /**
   * Deliberately empty, and an empty *object* rather than `undefined` because
   * every consumer spreads it. `card` was the outgoing system's soft elevation
   * under a recipe tile; Chronicle has none — "cards are defined by rules and
   * radii, not elevation" — so it resolves to no style at all and the shadow
   * disappears as each screen is reworked. It retires with its last consumer,
   * `RecipeCard`. (`floating`, the dock's, went with the dock in step 2.)
   */
  card: {},
} as const

export const hairline = StyleSheet.hairlineWidth
