import { Pressable, StyleSheet } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { StyleProp, ViewStyle } from 'react-native'
import { radius, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * A single-select filter chip. "All" first, then the options.
 *
 * **Unselected is transparent with a 1px hairline; selected is a tamarind fill
 * with no border at all.** The hairline was left off on the reasoning that a row
 * of outlined chips reads as a row of buttons — but the mockup draws one on
 * every unselected chip in both places it uses this control (Explore's `BY
 * SUBJECT` and the form's `MEALTIME`, each `1px solid rgba(36,30,24,.25)`), and
 * without it the four mealtime options on the New Recipe screen rendered as four
 * bare tappable words with nothing to say they were controls. The fill still
 * carries the selection; the hairline only says "this is a thing you can press".
 *
 * `borderStrong` is ink at .22 against the mockup's .25 — three hundredths on a
 * hairline, and the palette's three rule weights are the whole visual system.
 * A fourth for one control would be a token nobody could choose between.
 *
 * **Selected has no press state.** Pressing the chip you are already on does
 * nothing, so feedback would be a promise the control doesn't keep.
 *
 * **The white-on-green contrast fight is over, and the palette won it.** Under
 * the old system a selected chip's label was ink because the handoff's `white`
 * measured 2.3:1 on that green — a deliberate debt this app declined. Chronicle
 * has no such problem: `onPrimary` is paper on tamarind at **4.50:1**, which is
 * what the design asks for *and* clears AA. The token name did not change, so
 * this file did not either; the note is here because the reasoning did.
 *
 * Sizing is Chronicle's `9×15px` at `r99`, which is noticeably tighter than the
 * pill this used to be — a chip is a label with a fill, not a button.
 */
export default function Chip({
  label,
  active,
  onPress,
  style,
}: {
  label: string
  active: boolean
  onPress: () => void
  style?: StyleProp<ViewStyle>
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !active && styles.chipPressed,
        style,
      ]}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  chip: {
    // 15 × 9, the design's own. Off the spacing scale and staying literal:
    // it measures this control rather than being a step someone should pick.
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: c.borderStrong,
    // The 44pt floor without a 44pt-tall chip — the drawn size and the tappable
    // size are allowed to disagree, as they do on `MastheadAction`.
    minHeight: 34,
    justifyContent: 'center',
  },
  // The fill replaces the hairline rather than sitting inside it — a tamarind
  // pill ringed in ink reads as a selected *button*, which is the thing the
  // borderless version was right to avoid.
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  // An unselected chip has no fill to darken, so a press tints it with the same
  // ghost the tab bar uses for its active pill rather than inventing a grey.
  chipPressed: { backgroundColor: c.accentPill },
  text: { ...type.metadata, color: c.textMuted },
  textActive: { color: c.onPrimary },
})
