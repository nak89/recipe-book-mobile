import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { useT } from '@/i18n'

export default function SearchBar({
  value,
  onChangeText,
  placeholder,
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}) {
  const { colors: c, isDark } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  return (
    <View style={styles.wrapper}>
      <Ionicons name="search" size={18} color={c.textPlaceholder} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        // Defaulted here, not in the signature — the fallback needs `t`.
        placeholder={placeholder ?? t('search.placeholder')}
        placeholderTextColor={c.textPlaceholder}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel={t('search.clear')}>
          <Ionicons name="close-circle" size={18} color={c.textPlaceholder} />
        </Pressable>
      )}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  // minWidth: 0 so a long query can't push the clear button off the edge.
  input: { flex: 1, minWidth: 0, ...type.body, color: c.text },
})
