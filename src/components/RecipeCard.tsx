import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { radius, shadow, spacing, type, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'
import type { Recipe } from '@/types/recipe'

/**
 * One card, two sizes. `featured` is the large horizontal-carousel card;
 * `grid` is the two-column tile. They share the photo-with-scrim treatment so
 * the two sections of the dashboard read as one design rather than two.
 *
 * Edit and delete live behind a long-press rather than on the card face —
 * three tap targets on a 160pt tile is what makes a photo grid look cluttered.
 */
export default function RecipeCard({
  recipe,
  variant = 'grid',
  onPress,
  onLongPress,
  onToggleFavourite,
  style,
}: {
  recipe: Recipe
  variant?: 'featured' | 'grid'
  onPress: () => void
  onLongPress?: () => void
  onToggleFavourite?: () => void
  style?: StyleProp<ViewStyle>
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const featured = variant === 'featured'

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={recipe.title}
      style={({ pressed }) => [
        styles.card,
        featured ? styles.featured : styles.grid,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Image
        source={recipe.photoUrl ? { uri: recipe.photoUrl } : undefined}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={200}
      />

      {/* Scrim over the lower half only — the photo stays clean up top. */}
      <LinearGradient
        colors={[c.scrimNone, c.scrim, c.scrimStrong]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {onToggleFavourite && (
        <Pressable
          onPress={(e) => {
            // Without this the tap falls through and opens the recipe.
            e.stopPropagation()
            onToggleFavourite()
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={recipe.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
          style={styles.favourite}
        >
          <Ionicons
            name={recipe.isFavourite ? 'heart' : 'heart-outline'}
            size={17}
            color={recipe.isFavourite ? c.favourite : c.textOnPhoto}
          />
        </Pressable>
      )}

      <View style={styles.content}>
        <Text style={[styles.title, featured && styles.titleFeatured]} numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Ionicons name="time-outline" size={11} color={c.textOnPhoto} />
            <Text style={styles.badgeText}>{recipe.totalMinutes} min</Text>
          </View>
          {featured && (
            <View style={styles.badge}>
              <Ionicons name="restaurant-outline" size={11} color={c.textOnPhoto} />
              <Text style={styles.badgeText}>Serves {recipe.servings}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: c.surfaceSunken,
    justifyContent: 'flex-end',
    ...shadow.card,
  },
  featured: { width: 260, height: 190 },
  grid: { flex: 1, aspectRatio: 0.86 },
  pressed: { opacity: 0.9 },
  favourite: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.md, gap: spacing.sm },
  title: { ...type.bodyStrong, fontSize: 14, color: c.textOnPhoto },
  titleFeatured: { fontSize: 16 },
  badges: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { ...type.caption, fontSize: 11, color: c.textOnPhoto },
})
