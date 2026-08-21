import { Image } from 'expo-image'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { ReactNode } from 'react'
import type { ViewStyle } from 'react-native'
import { contentType, radius, sizes, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/** The design's own measurements. Literals because they measure this control. */
const THUMB = 46
const CHECK = 13

interface LedgerRowProps {
  title: string
  /** The right-hand value — a duration, a quantity, a count. Always mono. */
  value?: string
  /**
   * The *ingredient row* treatment — a name being matched to a quantity, as
   * opposed to a row that names a dish.
   *
   * One prop rather than four, because there is one question behind all of
   * them: an ingredient takes the reading face (`ingredientName`, Kantumruy in
   * Khmer rather than Moul), the tighter `rowYTight` padding, and its emoji as
   * a bare glyph instead of a 46pt tile.
   *
   * **It used to draw a dotted leader between the name and the quantity too**,
   * which is where its old name came from and which is what the mockup draws on
   * exactly these rows. Removed at the user's call — with an emoji, a name and
   * a stepper already on the line, the dots were a fourth thing to read across
   * rather than a guide to the number.
   */
  ingredient?: boolean
  /** 46×46 thumbnail at radius 12. */
  photoUrl?: string | null
  /** Stands in where a row has no photograph of its own. */
  emoji?: string
  /** Checkable variant — a 13px tamarind circle in place of the thumbnail. */
  checked?: boolean
  onToggle?: (next: boolean) => void
  onPress?: () => void
  /**
   * Edit and delete live behind this, not on the row.
   *
   * Three tap targets inside a 52pt ruled row is what turns an index into a
   * toolbar — the same reason they were behind a long-press on the old photo
   * tile. They are still ordinary buttons on the detail screen, where there is
   * room to draw them.
   */
  onLongPress?: () => void
  /** Suppresses the hairline. The last row of a group closes on the group's edge. */
  last?: boolean
  /** Anything that isn't a plain mono value — a stepper, a `⋯`, a chevron. */
  trailing?: ReactNode
  style?: ViewStyle
  accessibilityLabel?: string
}

/**
 * Chronicle primitive 2 — the ledger row. The workhorse: recipes, ingredients,
 * market items, collections and settings are all this row with different parts
 * switched on.
 *
 *     [thumb 46×46 r12]  [title]                          [qty mono]
 *
 * It replaces four separate components from the outgoing design — `CheckRow`,
 * `RecipeCard`'s grid tile, `PlanSlot` and `SettingRow` — which is the point of
 * the primitive rather than a side effect: they were four different shapes
 * doing one job, and Chronicle's page only has one shape.
 *
 * **The hairline is `.5px`, not `StyleSheet.hairlineWidth`.** The design states
 * a real half-pixel and it renders as one on every screen this app runs on; the
 * platform constant is 1/3px on a 3× device, which disappears against paper.
 *
 * **A ticked row is struck through in both scripts, at the user's call.** It
 * was Latin-only for a real reason, inherited from `CheckRow`: `line-through`
 * is drawn across the middle of the line box, which is where a Khmer cluster
 * carries its vowel signs, so a struck Khmer row crosses the marks as well as
 * the word. The counter-argument won — a tick that visibly does nothing to
 * three quarters of a Cambodian shopping list is worse than a heavy line — and
 * the 0.34 fade still carries most of the "done" on its own. If it proves
 * unreadable on a device, the fix is to restore the exception here (test the
 * **string**, not the active language: a Khmer ingredient in an English UI is
 * the same problem), not to drop the strike everywhere.
 *
 * **The title's face is chosen the same way, by `contentType`.** A row title is
 * content, so Moul 15 belongs to a Khmer one and Newsreader 16 to a Latin one
 * regardless of which language the interface is in. Keying it to the language
 * instead put every English recipe title in a Khmer UI into Moul's Latin glyphs.
 */
export default function LedgerRow({
  title,
  value,
  ingredient,
  photoUrl,
  emoji,
  checked,
  onToggle,
  onPress,
  onLongPress,
  last,
  trailing,
  style,
  accessibilityLabel,
}: LedgerRowProps) {
  const styles = useThemedStyles(makeStyles)
  const checkable = onToggle != null || checked != null

  const handlePress = onToggle ? () => onToggle(!checked) : onPress

  return (
    <Pressable
      accessibilityRole={checkable ? 'checkbox' : onPress ? 'button' : undefined}
      accessibilityState={checkable ? { checked: checked === true } : undefined}
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={!handlePress && !onLongPress}
      onPress={handlePress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        ingredient && styles.rowIngredient,
        !last && styles.ruled,
        pressed && handlePress != null && styles.pressed,
        style,
      ]}
    >
      {checkable && <View style={[styles.check, checked === true && styles.checkOn]} />}

      {/* A tick and a picture are not alternatives — a market row wants both,
          and the old if/else silently dropped the emoji on every checkable
          row. What they can't share is the 46pt tile: an ingredient row is 40
          tall, so it sets the emoji as a bare glyph in a fixed column instead.
          The tile belongs to rows that name a dish. */}
      {photoUrl ? (
        <Image
          source={photoUrl}
          style={styles.thumb}
          contentFit="cover"
          transition={150}
          accessibilityIgnoresInvertColors
        />
      ) : emoji ? (
        ingredient ? (
          <Text style={styles.emojiGlyph}>{emoji}</Text>
        ) : (
          <View style={styles.thumb}>
            <Text style={styles.emoji}>{emoji}</Text>
          </View>
        )
      ) : null}

      {/* The face comes from the title, not from the interface language — a
          Latin title in a Khmer UI is still Newsreader. */}
      <Text
        style={[
          styles.title,
          contentType(ingredient ? 'ingredientName' : 'rowTitle', title),
          checked === true && styles.titleDone,
          checked === true && styles.struck,
        ]}
      >
        {title}
      </Text>

      {trailing}
      {value != null && <Text style={styles.value}>{value}</Text>}
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      // A floor rather than a height — a two-line Khmer title grows the row
      // instead of being clipped by it. See `minHeights` for why that inverted.
      minHeight: sizes.hitMin,
      paddingVertical: spacing.rowY,
    },
    /**
     * An ingredient row is the design's tighter one — `padding: 10px 0` and no
     * 44pt floor, which is how a market list of twenty lines stays a list you
     * can take in at a glance rather than a screen and a half of scrolling.
     *
     * Dropping the floor is deliberate and is not a lost tap target: the row is
     * only ever a checkbox, it spans the full gutter width, and the two
     * controls inside it that *aren't* the whole row — the stepper's − and + —
     * keep their own 44pt targets through `hitSlop`. Every other row still
     * carries the `sizes.hitMin` floor above.
     */
    rowIngredient: { minHeight: 0, paddingVertical: spacing.rowYTight },
    ruled: { borderBottomWidth: 0.5, borderBottomColor: c.border },
    pressed: { opacity: 0.6 },

    thumb: {
      width: THUMB,
      height: THUMB,
      borderRadius: radius.thumb,
      backgroundColor: c.oat,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emoji: { fontSize: 22 },
    // No `lineHeight`: an emoji's own box is taller than a Latin one at the
    // same size, and pinning one crops it on Android. The fixed width is what
    // keeps the names aligned down the column when the glyphs aren't all the
    // same width.
    emojiGlyph: { fontSize: 18, width: 22, textAlign: 'center' },

    check: {
      width: CHECK,
      height: CHECK,
      borderRadius: CHECK / 2,
      borderWidth: 1,
      borderColor: c.primary,
    },
    checkOn: { backgroundColor: c.primary },

    // Colour and layout only — the type comes from `contentType` at the call
    // site, so a residual `letterSpacing` from the other scale can't survive
    // underneath it. `flex: 1` and `minWidth: 0` so a long title yields to the
    // value rather than pushing it off the edge.
    title: { color: c.text, flex: 1, minWidth: 0 },
    titleDone: { opacity: 0.34 },
    struck: { textDecorationLine: 'line-through' },

    value: { ...type.metadata, color: c.textPlaceholder },
  })
