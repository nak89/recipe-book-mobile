import { ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { StyleProp, ViewStyle } from 'react-native'
import { minHeights, radius, shadow, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Chronicle primitive 4 — the buttons.
 *
 * **Primary** is a tamarind fill with paper text, 18px of vertical padding,
 * radius 20, and the single shadow in the product. **Secondary** (`outline`) is
 * transparent behind a 1.2px ink border at the same radius. Both set their
 * label in Newsreader 13 uppercase at `.22em` — the tracking is most of what
 * makes a button read as a printed caption rather than as a UI control, and it
 * is the one place in the app where letter-spacing is that wide.
 *
 * **The label loses almost all of that tracking in Khmer**, automatically:
 * `type.button` on the Khmer scale is Kantumruy 15 at 0.02em against the Latin
 * 0.22em, because display tracking breaks Khmer clusters — a fifth of an em
 * driven through one detaches the combining marks from the consonant they
 * belong to. Nothing here branches on language; the scale does it.
 *
 * `uppercase` is likewise unconditional and safe: Khmer has no letter case, so
 * the transform is a no-op on it.
 *
 * **The tamarind shadow is on `solid` only.** It is the product's only
 * elevation and it belongs to the primary action; putting it under an outline
 * button would make two things look equally weighted.
 */
export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'solid',
  style,
}: {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  /**
   * `danger` is retained but no longer a different colour: Chronicle names four
   * colours and no alert red, so a destructive button is an outline one whose
   * *copy* carries the warning. Introducing a second saturated hue beside
   * tamarind is the thing the palette exists to prevent. Flagged in `palettes.ts`
   * as a decision still owed.
   */
  variant?: 'solid' | 'outline' | 'danger'
  style?: StyleProp<ViewStyle>
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const inactive = disabled || loading

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        variant === 'solid' && styles.solid,
        variant !== 'solid' && styles.outline,
        pressed && !inactive && (variant === 'solid' ? styles.pressedSolid : styles.pressed),
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'solid' ? c.onPrimary : c.text} />
      ) : (
        <Text style={[styles.label, variant === 'solid' && styles.labelSolid]}>{label}</Text>
      )}
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    base: {
      minHeight: minHeights.button,
      paddingVertical: 18,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.button,
      alignItems: 'center',
      justifyContent: 'center',
    },
    solid: { backgroundColor: c.primary, ...shadow.raised },
    // 1.2px, not 1: it matches the masthead's action circles and the icon
    // hairlines, so every drawn line in the product sits at one of three
    // weights (1.2 borders, 1/0.5 rules, 1.5 mastheads) rather than drifting.
    outline: { borderWidth: 1.2, borderColor: c.text },
    // Tamarind has nowhere lighter to go on paper, so a solid press darkens the
    // fill rather than fading it — fading would show cream through the brand
    // colour. Outline buttons have no fill to darken and fade instead.
    pressedSolid: { backgroundColor: c.primaryPressed },
    pressed: { opacity: 0.6 },
    inactive: { opacity: 0.5 },
    label: { ...type.button, color: c.text, textTransform: 'uppercase' },
    labelSolid: { color: c.onPrimary },
  })
