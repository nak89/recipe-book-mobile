import { forwardRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text, TextInput } from '@/components/ui/Text'
// The RN class is still the *type* a ref resolves to — `@/components/ui/Text`
// exports a function component wrapping it, which can't stand in here.
import type { StyleProp, TextInput as RNTextInput, TextInputProps, ViewStyle } from 'react-native'
import { contentType, inputType, sized, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Chronicle primitive 6 — the form field. **No boxes.**
 *
 * A small tracked label, the value in Newsreader 18, and a rule underneath.
 * That is the entire control: there is no filled input, no rounded container
 * and no focus ring, because a form on a printed page is a line you write on.
 *
 * **The rule's weight is the state.** 1.2px solid ink when the field holds
 * something, `.8px rgba(36,30,24,.35)` when it is empty or optional — so a
 * glance down the form tells you what is filled in without reading any of it.
 * That is why `filled` is derived from the value rather than taken as a prop:
 * a caller that forgot to pass it would silently break the one signal the
 * design is relying on.
 *
 * **`invalid` thickens and recolours the same rule rather than adding a box.**
 * The red outline *is* the error message — a form full of red sentences is
 * harder to act on than a form with two red rules, so the wording lives in one
 * line above the submit button. Note there is no alert red in this palette, so
 * invalid reads as tamarind; see `palettes.ts`, which flags that as a decision
 * still owed.
 *
 * `style` lands on the TextInput; **layout belongs on `containerStyle`**. Put
 * `flex: 1` in `style` and the input flexes inside a wrapper that is still
 * sized to its own content, so the field visibly grows and shrinks as you type.
 * Chronicle's 50/50 rows depend on that going to the right place.
 */
const Field = forwardRef<
  RNTextInput,
  TextInputProps & {
    label?: string
    hint?: string
    invalid?: boolean
    containerStyle?: StyleProp<ViewStyle>
    /**
     * A unit parked at the right-hand end of the rule — `kcal`, `g`.
     *
     * Mono and muted, per SCREENS.md § 18, and drawn *over* the input rather
     * than beside it: the rule belongs to the input itself, so a sibling would
     * sit outside the line it is supposed to share. The input gains padding so
     * a long number can't run underneath it.
     */
    suffix?: string
  }
>(function Field(
  { label, hint, invalid, style, containerStyle, multiline, value, suffix, onContentSizeChange, ...props },
  ref
) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const filled = typeof value === 'string' && value.length > 0
  const face = sized(contentType('body', typeof value === 'string' ? value : ''), 18)

  /**
   * **A multiline field starts as one line and grows with what you write.**
   *
   * It used to be a fixed `minHeight: 92` with the rule pinned at the bottom of
   * it, which left ~57pt of nothing between a one-line description and the line
   * underneath it. On a control whose whole idea is that there is *no box* —
   * just something you write on — a tall empty gap above a rule doesn't read as
   * room to write, it reads as a rule that has come adrift from its text.
   *
   * **The floor is one line, the same as any other field, and that is the
   * point.** An earlier pass floored it at two lines on the reasoning that an
   * empty description should invite a paragraph; on screen that just moved the
   * problem, because DESCRIPTION then sat visibly differently from TITLE right
   * above it. Two fields stacked in the same column are the same control, and
   * the one that is allowed to grow should look identical until it does. It
   * takes a second line the moment you type one.
   *
   * A **floor** rather than a fixed `height`: the measurement is a frame behind
   * the keystroke that caused it, and a floor lets the input hold its own text
   * in the meantime where an exact height would crop it.
   *
   * `onContentSizeChange` reports the height the text actually needs, padding
   * included. The comparison before `setState` is the important part — the event
   * fires on every keystroke, not only when the line count changes, and
   * assigning an equal number would re-render the whole form on each letter.
   */
  const [contentHeight, setContentHeight] = useState(0)

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        ref={ref}
        value={value}
        style={[
          styles.input,
          // A field's *value* is content — it is what the user is typing — so
          // its face comes from the string rather than from the interface
          // language. Writing an English title in a Khmer UI otherwise set it
          // in Kantumruy as you typed. The **label** above stays chrome and
          // stays with the language, which is the split this whole rule is.
          //
          // `inputType` on **both** shapes now: a pinned line box on a
          // one-line input clips its own descenders, and on a multiline one
          // both platforms add the surplus leading *above* each line — first
          // line included — so an 18pt placeholder spaced for a 29pt line hangs
          // a third of a line below the label and reads as floating rather than
          // as the top of a box. Natural metrics contain the ink either way;
          // see `inputType`, which this note supersedes.
          inputType(face),
          filled ? styles.ruleFilled : styles.ruleEmpty,
          multiline && styles.multiline,
          multiline && { minHeight: Math.max(contentHeight, face.lineHeight ?? 0) },
          invalid && styles.invalid,
          suffix ? styles.withSuffix : null,
          style,
        ]}
        placeholderTextColor={c.textPlaceholder}
        // One palette, and it is paper — see the note in `ThemeContext`. An
        // unset keyboard would follow the *phone* and arrive dark under a cream
        // page, which is the only reason this is stated at all.
        keyboardAppearance="light"
        multiline={multiline}
        onContentSizeChange={(event) => {
          onContentSizeChange?.(event)
          if (!multiline) return
          const next = Math.ceil(event.nativeEvent.contentSize.height)
          setContentHeight((prev) => (prev === next ? prev : next))
        }}
        {...props}
      />
      {suffix ? (
        <Text style={styles.suffix} pointerEvents="none">
          {suffix}
        </Text>
      ) : null}
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  )
})

export default Field

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    // Tighter than the old `sm`: the label belongs to its rule, and the air
    // goes between fields rather than inside one.
    wrapper: { gap: spacing.xs },
    label: { ...type.sectionLabel, color: c.textMuted, textTransform: 'uppercase' },
    input: {
      // Type comes from `contentType` at the call site above — see the note
      // there. `sized` rather than a bare fontSize override, because on the
      // Khmer scale a raw override leaves 18pt text in `body`'s 14pt line box.
      color: c.text,
      // No horizontal padding: the value starts at the gutter, in line with the
      // label above it and the rule beneath. Padding here would inset the text
      // from a rule that still ran full width.
      paddingHorizontal: 0,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    // The two states of the rule. Solid ink reads as written-on; the faint one
    // reads as a line still waiting.
    ruleFilled: { borderBottomWidth: 1.2, borderBottomColor: c.text },
    ruleEmpty: { borderBottomWidth: 0.8, borderBottomColor: c.borderFaint },
    // The height itself is measured and floored at the call site above; all
    // that is left here is keeping the text at the top of it, which is what
    // stops a two-line description centring itself over its own rule.
    multiline: { textAlignVertical: 'top' },
    invalid: { borderBottomWidth: 1.2, borderBottomColor: c.danger },
    hint: { ...type.metadataSmall, color: c.textMuted },
    // Room for the unit, so a five-figure number stops before it rather than
    // running underneath.
    withSuffix: { paddingRight: 34 },
    // Parked on the rule at the right-hand end. `metadata` is the mono token,
    // and `textPlaceholder` is the .4 § 18 asks for — a unit is a label on a
    // number, not a second number.
    suffix: {
      position: 'absolute',
      right: 0,
      bottom: spacing.sm,
      ...type.metadata,
      color: c.textPlaceholder,
    },
  })
