import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import { colors, radius, spacing, type } from '@/theme'

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search recipes',
}: {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}) {
  return (
    <View style={styles.wrapper}>
      <Ionicons name="search" size={18} color={colors.textPlaceholder} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textPlaceholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={18} color={colors.textPlaceholder} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  // minWidth: 0 so a long query can't push the clear button off the edge.
  input: { flex: 1, minWidth: 0, ...type.body, color: colors.text },
})
