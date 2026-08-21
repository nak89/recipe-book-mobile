import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Switch, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { StyleProp, ViewStyle } from 'react-native'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * A settings card row: icon, label, optional value, and a chevron or a switch.
 *
 * Extracted from the profile screen, where all three variants already existed
 * as hand-built `Pressable`s. Giving them one component is what stops the
 * fourth one drifting.
 *
 * **A switch is only ever for a genuine binary.** Anything with three or more
 * options is a chevron opening an `ActionSheet`, so the current value is
 * readable without flipping anything first.
 *
 * Its scope has narrowed a long way under Chronicle. The language row became
 * two `◆`-marked rows on the page itself, and every read-only row became a
 * `LedgerRow` — so what is left is the dev-only "Start fresh" row and any future
 * switch. The oat fill went with the rest of the card idiom; a row is a rule
 * now, and the dashed variant is the only bordered thing in the product.
 */
export default function SettingRow({
  icon,
  label,
  value,
  trailing = 'none',
  checked,
  onToggle,
  onPress,
  dashed = false,
  hint,
  style,
}: {
  /** Ionicons name, `textMuted`, 18pt. Outline unless it reflects state. */
  icon?: keyof typeof Ionicons.glyphMap
  label: string
  /** A trailing read-only value — the current language, a join date. */
  value?: string
  trailing?: 'none' | 'chevron' | 'switch'
  checked?: boolean
  onToggle?: (next: boolean) => void
  onPress?: () => void
  /** Dashed and unfilled — the app's only dashed border, dev-only rows. */
  dashed?: boolean
  /** A second, smaller line under the label. */
  hint?: string
  style?: StyleProp<ViewStyle>
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)

  const body = (
    <>
      {icon && <Ionicons name={icon} size={18} color={c.textMuted} />}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint && <Text style={styles.hint}>{hint}</Text>}
      </View>
      {value && <Text style={styles.value}>{value}</Text>}
      {trailing === 'chevron' && (
        <Ionicons name="chevron-forward" size={16} color={c.textPlaceholder} />
      )}
      {trailing === 'switch' && (
        <Switch
          value={checked}
          onValueChange={onToggle}
          accessibilityLabel={label}
          trackColor={{ false: c.borderStrong, true: c.primary }}
          // The design calls this a "20px paper knob", in both states. Under
          // the old two-palette system it had to be a literal white — the one
          // token that stayed put while everything else inverted — which is why
          // `white` existed at all. With a single cream palette, paper *is*
          // that constant, so the hue-named token was deleted and this now
          // reads as the thing the design names.
          thumbColor={c.bg}
          ios_backgroundColor={c.borderStrong}
        />
      )}
    </>
  )

  // A switch row owns its own control, so wrapping it in a Pressable would give
  // the row two competing tap targets — tapping the label would toggle
  // something the finger never touched.
  if (trailing === 'switch' || !onPress) {
    return (
      <View
        style={[
          styles.row,
          dashed ? styles.dashed : styles.filled,
          trailing === 'switch' && styles.switchRow,
          style,
        ]}
      >
        {body}
      </View>
    )
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        dashed ? styles.dashed : styles.filled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {body}
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.notice,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // A hairline under the row, like every other list row in the product — not a
  // fill. `surfaceAlt` here was the last oat panel outside a thumbnail.
  filled: { borderBottomWidth: 0.5, borderBottomColor: c.border, borderRadius: 0 },
  // The app's only dashed border, and that is the point: a dashed edge always
  // means "not a real part of the product", so a dev-only row can't be mistaken
  // for a setting by anyone reading over your shoulder.
  dashed: { borderWidth: 1, borderStyle: 'dashed', borderColor: c.borderStrong },
  // A Switch is taller than a line of text, so this row takes less vertical
  // padding to finish the same height as the rows above and below it.
  switchRow: { paddingVertical: spacing.md },
  text: { flex: 1, gap: 2 },
  label: { ...type.body, color: c.text },
  hint: { ...type.caption, color: c.textPlaceholder },
  value: { ...type.bodyStrong, color: c.textMuted },
  // Press feedback is opacity, never colour and never scale. List rows dip
  // further than buttons do.
  pressed: { opacity: 0.7 },
})
