import { StyleSheet, View } from 'react-native'
import { useT } from '@/i18n'
import NavigationButton from '@/components/ui/NavigationButton'
import { Text } from '@/components/ui/Text'
import { spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

export function RecipeAuthoringNav({ back, onPress, disabled }: {
  back?: boolean
  onPress: () => void
  disabled?: boolean
}) {
  const t = useT()
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={[styles.nav, back && styles.navBack]}>
      <NavigationButton
        action={back ? 'back' : 'cancel'}
        accessibilityLabel={back ? t('import.backToNewRecipe') : undefined}
        onPress={onPress}
        disabled={disabled}
      />
    </View>
  )
}

export function RecipeAuthoringHeading({ title, description, featured }: {
  title: string
  description?: string
  featured?: boolean
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={featured ? styles.featuredTitle : styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  nav: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xs,
  },
  navBack: { alignItems: 'flex-start' },
  heading: { gap: spacing.sm },
  title: { ...type.authoringTitle, color: c.text },
  featuredTitle: { ...type.authoringMasthead, color: c.text },
  description: { ...type.authoringBody, color: c.textSecondary },
})
