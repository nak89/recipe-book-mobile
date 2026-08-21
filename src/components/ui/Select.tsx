import { useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { StyleProp, ViewStyle } from 'react-native'
import FieldTrigger from '@/components/ui/FieldTrigger'
import SearchBar from '@/components/ui/SearchBar'
import { minHeights, radius, spacing, useScreenTopPad, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { useT } from '@/i18n'

export interface SelectOption {
  label: string
  emoji?: string
}

/**
 * The dropdown: a `Field`-shaped trigger opening a searchable list.
 *
 * `allowCustom` offers whatever you type as its own option, and a `value` the
 * options don't contain is pinned to the top of the list — both exist so a
 * picker over a **free-text column** can never refuse to represent a stored
 * value. Use this rather than a raw picker for anything with a
 * suggested-but-open set.
 *
 * The trigger itself is `FieldTrigger`, shared with the tools control on the
 * New Recipe screen.
 */
export default function Select({
  label,
  value,
  options,
  placeholder,
  title,
  searchPlaceholder,
  allowCustom,
  clearable = true,
  invalid,
  containerStyle,
  emojiFor,
  onChange,
}: {
  label?: string
  value?: string
  options: SelectOption[]
  placeholder?: string
  title?: string
  searchPlaceholder?: string
  allowCustom?: boolean
  clearable?: boolean
  invalid?: boolean
  containerStyle?: StyleProp<ViewStyle>
  emojiFor?: (value: string) => string | undefined
  onChange: (value?: string) => void
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  // Defaulted here rather than in the signature: a parameter default can't
  // call a hook, and every one of these needs translating.
  const placeholderText = placeholder ?? t('select.placeholder')
  const searchText = searchPlaceholder ?? t('select.search')
  const topPad = useScreenTopPad()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const trimmed = query.trim()

  // A stored value the option list doesn't know about (older data, or something
  // typed via allowCustom) is pinned to the top rather than silently missing.
  const all = useMemo(() => {
    if (!value || options.some((o) => o.label.toLowerCase() === value.toLowerCase())) return options
    return [{ label: value, emoji: emojiFor?.(value) }, ...options]
  }, [options, value, emojiFor])

  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase()
    return q ? all.filter((o) => o.label.toLowerCase().includes(q)) : all
  }, [all, trimmed])

  // Offer the typed text as its own option unless it's already one, so "Khmer"
  // is one tap rather than a dead end.
  const custom =
    allowCustom &&
    trimmed.length > 0 &&
    !all.some((o) => o.label.toLowerCase() === trimmed.toLowerCase())
      ? trimmed
      : null

  function close() {
    setOpen(false)
    setQuery('')
  }

  function pick(next?: string) {
    onChange(next)
    close()
  }

  return (
    <View style={containerStyle}>
      <FieldTrigger
        label={label}
        value={value}
        placeholder={placeholderText}
        emoji={value ? emojiFor?.(value) : undefined}
        invalid={invalid}
        onPress={() => setOpen(true)}
      />

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <View style={[styles.sheet, { paddingTop: topPad }]}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{title ?? label ?? placeholderText}</Text>
              <Pressable
                onPress={close}
                hitSlop={10}
                style={styles.close}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <Ionicons name="close" size={20} color={c.text} />
              </Pressable>
            </View>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={allowCustom ? `${searchText} ${t('select.orTypeYourOwn')}` : searchText}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(option) => option.label}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <>
                {custom && (
                  <Pressable
                    onPress={() => pick(custom)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <Text style={styles.emoji}>✏️</Text>
                    <Text style={styles.name} numberOfLines={1}>
                      {`${t('select.use')} “${custom}”`}
                    </Text>
                  </Pressable>
                )}
                {clearable && value && !trimmed && (
                  <Pressable
                    onPress={() => pick(undefined)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <Text style={styles.emoji}>🚫</Text>
                    <Text style={[styles.name, styles.clear]}>{t('select.none')}</Text>
                  </Pressable>
                )}
              </>
            }
            renderItem={({ item }) => {
              const selected = value?.toLowerCase() === item.label.toLowerCase()
              return (
                <Pressable
                  onPress={() => pick(item.label)}
                  style={({ pressed }) => [
                    styles.row,
                    selected && styles.rowSelected,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  {item.emoji ? <Text style={styles.emoji}>{item.emoji}</Text> : null}
                  <Text style={styles.name} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={20} color={c.text} />}
                </Pressable>
              )
            }}
            ListEmptyComponent={
              custom ? null : (
                <Text style={styles.empty}>{`${t('select.noMatch')} “${trimmed}”`}</Text>
              )
            }
          />
        </View>
      </Modal>
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  sheet: { flex: 1, backgroundColor: c.bg },
  header: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { ...type.title, color: c.text, flex: 1, minWidth: 0 },
  close: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: minHeights.row,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: c.surfaceAlt },
  rowPressed: { opacity: 0.6 },
  emoji: { fontSize: 20 },
  name: { ...type.bodyLarge, color: c.text, flex: 1, minWidth: 0 },
  clear: { color: c.textMuted },
  empty: { ...type.body, color: c.textMuted, textAlign: 'center', paddingVertical: spacing.xxl },
})
