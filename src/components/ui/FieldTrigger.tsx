import { Pressable, StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { Text } from '@/components/ui/Text'
import { contentType, inputType, sized, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * The ruled trigger a picker hangs off: a tracked label, the value in
 * Newsreader 18, a rule underneath, and a chevron. No box — DESIGN_SYSTEM.md
 * § 6 is explicit about that, and a filled rectangle beside a `Field` on the
 * same row reads as two different forms.
 *
 * Extracted from `Select`, which drew it inline, because the New Recipe screen
 * now needs the same control for something `Select` can't serve: tools open a
 * multi-select picker rather than a list of single choices. Two hand-copied
 * triggers would have drifted the first time the rule's weight changed.
 */
export default function FieldTrigger({
  label,
  value,
  placeholder,
  emoji,
  invalid,
  onPress,
  containerStyle,
  accessibilityLabel,
}: {
  label?: string
  /** Undefined or empty renders the placeholder, and leaves the rule faint. */
  value?: string
  placeholder: string
  emoji?: string
  invalid?: boolean
  onPress: () => void
  containerStyle?: StyleProp<ViewStyle>
  accessibilityLabel?: string
}) {
  const styles = useThemedStyles(makeStyles)
  const filled = Boolean(value)

  // The same two pieces `Field` splits its face into, split the same way and put
  // in the same two places — see the note on `trigger` below. The floor goes on
  // the control, the face on the text.
  const { minHeight, ...valueFace } = inputType(sized(contentType('body', value ?? ''), 18))

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.trigger,
          { minHeight },
          filled ? styles.ruleFilled : styles.ruleEmpty,
          invalid && styles.invalid,
          pressed && styles.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (label ? `${label}: ${value ?? placeholder}` : placeholder)}
      >
        {filled && emoji ? <Text style={styles.emoji}>{emoji}</Text> : null}
        <Text
          style={[
            styles.value,
            // The chosen value is content — a cuisine, a tool, something the
            // user may have typed — so its face follows its script rather than
            // the interface language.
            valueFace,
            !filled && styles.placeholder,
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {/* Two 1.2px rules rather than an Ionicon: at this size the glyph
            carries a text face's stroke contrast and lands heavier than the
            rule it sits on. */}
        <View style={styles.chevron}>
          <View style={styles.chevronLeft} />
          <View style={styles.chevronRight} />
        </View>
      </Pressable>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    wrapper: { gap: spacing.xs },
    label: { ...type.sectionLabel, color: c.textMuted, textTransform: 'uppercase' },
/**
     * No horizontal padding, for the same reason `Field` has none: the value
     * starts at the gutter, in line with the label above it and the rule below.
     *
     * **The height comes from `inputType`, exactly as `Field`'s does, and that
     * is the whole point.** This is the control that has to agree with a
     * `Field` beside it in a 50/50 row, and it has twice failed to.
     *
     * First it carried `minHeights.field` (50) and drew its rule 12pt low.
     * Giving the *input* the 50 instead fixed the row and broke every other
     * field in the product, because a single-line `TextInput` centres its text
     * in whatever height it is given: on the login form the email sat mid-air
     * between its label and its rule rather than on it. There is no portable
     * way to bottom-align text inside an over-tall input, so the trigger comes
     * down to the field, never the other way round.
     *
     * Dropping the `minHeight` closed most of the gap and left 6pt of it, on the
     * half of the split that was easy to miss. `Field` hands its face to
     * `inputType`, which **strips the pinned `lineHeight` and keeps it as a
     * `minHeight` floor** — so the input renders on the face's natural single-
     * line metrics (~22pt at 18pt Newsreader) and the 28pt floor never binds.
     * This trigger handed the same face, line box still pinned, to a `<Text>` —
     * where `lineHeight` *is* the box and 28 is exactly what you get. Hence
     * 40 against 34, a rule 6pt low, and a value sitting half the surplus
     * leading below the one next to it. On the Khmer scale it was 45 against 38.
     *
     * So the split happens here too, and the two halves go where `Field` puts
     * them: the floor on the control, the face on the text. Both controls are
     * now `padding + the face's own natural line, floored at the token's line
     * box` — the same expression on both sides, which is what makes them agree
     * by construction rather than by coincidence. A single line cannot crop
     * under natural metrics: a font's ascent and descent contain its ink,
     * stacked Khmer marks included, which is the guarantee `inputType` rests on
     * and the reason `numberOfLines={1}` below is load-bearing.
     */
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: 0,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    // The two states of the rule, identical to `Field`'s: solid ink reads as
    // chosen, the faint one as a line still waiting.
    ruleFilled: { borderBottomWidth: 1.2, borderBottomColor: c.text },
    ruleEmpty: { borderBottomWidth: 0.8, borderBottomColor: c.borderFaint },
    invalid: { borderBottomWidth: 1.2, borderBottomColor: c.danger },
    // There is no fill left to darken, so a press fades like every other
    // unfilled control in the product.
    pressed: { opacity: 0.6 },
    /**
     * Same 18 as the value it sits beside, so the two read as one line.
     *
     * **It is the other thing that can drive this row's height, and that only
     * became true when the value's line box came off.** While the value carried
     * a pinned 28 the emoji could never reach it; now both are on natural
     * metrics, and the taller of the two sets the control. Newsreader at 18
     * reserves ~23pt of ascent and descent against Apple Color Emoji's ~21, so
     * the serif should still win and the trigger should still match the `Field`
     * beside it — but that is a claim about two fonts' metrics rather than about
     * this code, so it is worth a glance at a *filled* MINUTES / SERVINGS row on
     * a device. If the emoji ever wins, the row goes 2pt out again, and the fix
     * is to bring this size down rather than to pin a line box back on.
     */
    emoji: { fontSize: 18 },
    value: { color: c.text, flex: 1, minWidth: 0 },
    placeholder: { color: c.textPlaceholder },
    chevron: { width: 12, height: 12, justifyContent: 'center' },
    chevronLeft: {
      position: 'absolute',
      left: 0,
      width: 8,
      height: 1.2,
      backgroundColor: c.textMuted,
      transform: [{ rotate: '45deg' }],
    },
    chevronRight: {
      position: 'absolute',
      right: 0,
      width: 8,
      height: 1.2,
      backgroundColor: c.textMuted,
      transform: [{ rotate: '-45deg' }],
    },
  })
