import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { ReactNode } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { sizes, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * The action circle's diameter — the full 44pt target, drawn.
 *
 * The design's own measurement is a 30px circle inside a 44px hit area, i.e. the
 * drawn weight and the touchable area deliberately disagreeing. That reads
 * correctly next to a lone wordmark and stops holding up next to the profile
 * avatar, which *is* drawn at 44: three circles in one row at two diameters
 * looks like a mistake rather than like a hierarchy. They are one size now, and
 * the difference between them is carried by what is inside — a hairline glyph
 * versus a letterform.
 */
const ACTION = sizes.hitMin

/**
 * What to multiply a glyph's geometry by to fill the bigger circle.
 *
 * The icons in `ui/icons.tsx` are drawn against the design's 30pt circle, so
 * they'd sit lost inside a 44 without this. **Geometry only — never the stroke**:
 * every rule, border and mark in this product is 1–1.5px, including the ring
 * these sit inside, and a glyph whose strokes scaled with it would out-weigh its
 * own circle.
 */
export const mastheadGlyphScale = ACTION / 30

/**
 * Chronicle primitive 1 — the masthead.
 *
 * A wordmark on the left, actions on the right, **one 1.5px ink rule** running
 * the full gutter width, and an optional metadata line beneath it — date left,
 * issue number right, in mono at half strength.
 *
 * **One rule, not two.** The design says so explicitly, and it is the detail
 * that decides whether the screen reads as a printed page or as a web header: a
 * masthead's rule is a single heavy stroke, and doubling it turns a periodical
 * into a table. It is also the heaviest line in the product at 1.5px — the same
 * weight as the tab bar's top edge, deliberately, so the two pieces of chrome
 * bracket the page as one material.
 *
 * **The wordmark switches face, not just string.** `type.masthead` is Newsreader
 * 25 in Latin and Moul 25 in Khmer, and the scale does that on its own — nothing
 * here branches on language. Moul is a display face only; it must never end up
 * on body text.
 *
 * **The masthead scrolls away; it does not float.** Chronicle's page edge is a
 * hard rule, and a rule that stayed pinned would be a bar rather than a
 * masthead. What is left floating is `ProgressiveBlurHeader`, mounted once by
 * the tab layout — that band exists for the status bar, not for this header,
 * and it is what stops a photograph passing under the clock in a hard line.
 */
export default function Masthead({
  title,
  actions,
  metaLeft,
  metaRight,
  style,
}: {
  title: string
  /** Right-hand actions. Use `MastheadAction` so they share the circle treatment. */
  actions?: ReactNode
  /** Date, conventionally. Rendered as given — the caller owns numeral script. */
  metaLeft?: string
  /** Issue number, conventionally. */
  metaRight?: string
  style?: StyleProp<ViewStyle>
}) {
  const styles = useThemedStyles(makeStyles)
  const hasMeta = metaLeft != null || metaRight != null

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.top}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {actions != null && <View style={styles.actions}>{actions}</View>}
      </View>

      <View style={styles.rule} />

      {hasMeta && (
        <View style={styles.meta}>
          <Text style={styles.metaText}>{metaLeft ?? ''}</Text>
          <Text style={styles.metaText}>{metaRight ?? ''}</Text>
        </View>
      )}
    </View>
  )
}

/**
 * One masthead action — a 44px bordered circle on the page's own ground.
 *
 * **No fill.** The ring and its contents are the whole control, which is what
 * lets the share, the +, and the profile avatar read as one set: three
 * identical circles distinguished by their marks. A filled one among them stops
 * being a peer and becomes the button, which is a claim none of these three has
 * any business making from a masthead.
 *
 * Used for the profile avatar too — see `ui/ProfileButton.tsx`, which wraps this
 * rather than redrawing a circle of its own.
 */
export function MastheadAction({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode
  onPress: () => void
  accessibilityLabel: string
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      {children}
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: spacing.gutter },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
    // `flex: 1` so a long Khmer wordmark yields to the actions rather than
    // pushing them off the edge.
    title: { ...type.masthead, color: c.text, flex: 1, minWidth: 0 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    action: {
      width: ACTION,
      height: ACTION,
      borderRadius: ACTION / 2,
      borderWidth: 1.2,
      borderColor: c.text,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionPressed: { opacity: 0.6 },
    // The one heavy rule. 1.5px is a real value, not a hairline — the platform
    // constant is 1/3px on a 3× screen and would vanish against paper.
    rule: { height: 1.5, backgroundColor: c.text },
    meta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingTop: spacing.sm,
    },
    metaText: { ...type.metadataSmall, color: c.textMuted, textTransform: 'uppercase' },
  })
