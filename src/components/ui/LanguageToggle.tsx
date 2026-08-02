import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLanguage } from '@/i18n'
import type { Language } from '@/i18n'
import { hairline, radius, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

const OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  // Each language names itself in its own script, so someone who can't read the
  // current UI language can still find theirs. That's the whole job of this
  // control — it's the only route into Khmer before an account exists.
  { value: 'km', label: 'ខ្មែរ' },
]

/**
 * The pre-auth language control: a compact two-option pill for the intro
 * carousel and the auth forms.
 *
 * ## Why this exists separately from the profile row
 *
 * The language preference is device-local precisely so it can be changed *before*
 * there is an account — a Khmer speaker who has to sign up in English first has
 * been handed the feature backwards. But the profile's control is a full-width
 * settings card opening a modal sheet, and that shape is wrong sitting on top of
 * a photograph. Two contexts, two controls; trying to make one component do both
 * would compromise both.
 *
 * Deliberately *not* a general segmented control. The reference design's
 * three-way theme switch was cut for want of exactly that component, and adding
 * a general one here would quietly reopen a closed decision.
 *
 * ## The two variants
 *
 * The three screens this appears on don't share a background. The intro carousel
 * is full-bleed photography, so there it needs `textOnPhoto` and the `scrim`
 * tokens — the same reasoning those tokens exist for at all, since the brightness
 * underneath is unknown and identical in both themes. The auth forms are plain
 * `bg`, where a dark scrim pill would read as a stray element from another
 * screen, so there it uses `surfaceAlt` and ordinary text colours.
 *
 * One control, two skins — not a general segmented control.
 */
export default function LanguageToggle({
  variant = 'plain',
  style,
}: {
  variant?: 'plain' | 'onPhoto'
  style?: object
}) {
  const { language, setLanguage } = useLanguage()
  const styles = useThemedStyles(makeStyles)
  const onPhoto = variant === 'onPhoto'

  return (
    <View
      style={[styles.container, onPhoto ? styles.containerOnPhoto : styles.containerPlain, style]}
      accessibilityRole="radiogroup"
    >
      {OPTIONS.map((option) => {
        const selected = option.value === language
        return (
          <Pressable
            key={option.value}
            onPress={() => setLanguage(option.value)}
            style={({ pressed }) => [
              styles.option,
              selected && (onPhoto ? styles.optionSelectedOnPhoto : styles.optionSelectedPlain),
              pressed && styles.optionPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            hitSlop={6}
          >
            <Text
              style={[
                styles.label,
                onPhoto ? styles.labelOnPhoto : styles.labelPlain,
                selected && (onPhoto ? styles.labelSelectedOnPhoto : styles.labelSelectedPlain),
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: hairline,
  },
  // Over photography: a scrim so the pill stays legible whatever is beneath it.
  containerOnPhoto: { backgroundColor: c.scrim, borderColor: c.scrimStrong },
  // On plain `bg`: an ordinary inset control, the same weight as a Chip.
  containerPlain: { backgroundColor: c.surfaceAlt, borderColor: c.border },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelectedOnPhoto: { backgroundColor: c.textOnPhoto },
  optionSelectedPlain: { backgroundColor: c.primary },
  optionPressed: { opacity: 0.7 },
  // Muted until chosen, so the pill reads as one control rather than two buttons.
  label: { ...type.label },
  labelOnPhoto: { color: c.textOnPhoto, opacity: 0.7 },
  labelPlain: { color: c.textMuted },
  // The selected chip inverts against the chip that just appeared underneath it.
  labelSelectedOnPhoto: { color: c.scrimStrong, opacity: 1 },
  labelSelectedPlain: { color: c.onPrimary },
})
