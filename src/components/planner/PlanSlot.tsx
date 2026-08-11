import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { PlannedRecipe } from '@/types/recipe'

/**
 * One mealtime's slot: either the recipe planned in it, or an invitation to
 * fill it.
 *
 * Both states are one row of the same height, so the four slots don't jump
 * about as a day fills up — which is the whole reason the empty state is a
 * bordered box rather than a bare "+" link.
 *
 * The border is a **hairline, never dashed**. The app's only dashed border is
 * the dev-only "Start fresh" row, precisely so a dashed edge always means
 * "this isn't a real part of the product".
 */
export function FilledSlot({
  recipe,
  meta,
  onPress,
  onLongPress,
  moreLabel,
}: {
  recipe: PlannedRecipe
  meta: string
  onPress: () => void
  onLongPress: () => void
  moreLabel: string
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={recipe.title}
      // The menu is only reachable by long-press, which a screen reader user has
      // no way to discover from the row alone.
      accessibilityHint={moreLabel}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {recipe.photoUrl ? (
        <Image source={{ uri: recipe.photoUrl }} style={styles.thumb} contentFit="cover" transition={200} />
      ) : (
        // The backend rejects a recipe without a photo, so this is unreachable
        // through the app — but the column is still nullable, and a broken image
        // box is a worse answer than a plain sunken tile.
        <View style={[styles.thumb, styles.thumbEmpty]} />
      )}

      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {recipe.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>

      {/* Not a button: the whole row long-presses to the same menu, and a second
          tap target on a 56pt row is what makes a list look cluttered. It's an
          affordance saying the row has more behind it. */}
      <Ionicons name="ellipsis-horizontal" size={18} color={c.textPlaceholder} />
    </Pressable>
  )
}

export function EmptySlot({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.empty, pressed && styles.rowPressed]}
    >
      <Ionicons name="add" size={18} color={c.textPlaceholder} />
      <Text style={styles.emptyLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

const ROW_HEIGHT = 72

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      height: ROW_HEIGHT,
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.md,
      paddingHorizontal: spacing.sm,
    },
    // Opacity, not a colour change and not a scale — the app's press feedback is
    // 0.85 on anything with a fill.
    rowPressed: { opacity: 0.85 },
    thumb: { width: 56, height: 56, borderRadius: radius.sm, backgroundColor: c.surfaceSunken },
    thumbEmpty: { backgroundColor: c.surfaceSunken },
    // minWidth: 0 so a long title ellipsises instead of pushing the chevron off
    // the right edge — the same fix the dashboard's greeting row needs.
    text: { flex: 1, minWidth: 0, gap: 3 },
    title: { ...type.bodyStrong, color: c.text },
    meta: { ...type.caption, color: c.textMuted },
    empty: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      height: ROW_HEIGHT,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: spacing.md,
    },
    emptyLabel: { ...type.body, color: c.textPlaceholder },
  })

export { ROW_HEIGHT as PLAN_SLOT_HEIGHT }
