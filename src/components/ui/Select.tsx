import { useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SearchBar from '@/components/ui/SearchBar'
import { colors, radius, spacing, type } from '@/theme'

export interface SelectOption {
  label: string
  emoji?: string
}

/**
 * A dropdown that isn't a closed list. The trigger matches `Field` so a form
 * row of inputs and selects lines up, and the sheet is a Modal for the same
 * reason `ActionSheet` is — the native pickers don't exist on web.
 *
 * `allowCustom` turns the search box into an entry field: whatever you type
 * that doesn't match an option can be committed as-is. That's required wherever
 * the underlying column is free text, so the picker can never refuse to
 * represent a value that's already stored.
 */
export default function Select({
  label,
  value,
  options,
  placeholder = 'Select',
  title,
  searchPlaceholder = 'Search',
  allowCustom = false,
  clearable = true,
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
  emojiFor?: (value: string) => string | undefined
  onChange: (value?: string) => void
}) {
  const insets = useSafeAreaInsets()
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
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${value ?? placeholder}` : placeholder}
      >
        {value ? <Text style={styles.triggerEmoji}>{emojiFor?.(value)}</Text> : null}
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <View style={[styles.sheet, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{title ?? label ?? placeholder}</Text>
              <Pressable
                onPress={close}
                hitSlop={10}
                style={styles.close}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder={allowCustom ? `${searchPlaceholder} or type your own` : searchPlaceholder}
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
                      Use “{custom}”
                    </Text>
                  </Pressable>
                )}
                {clearable && value && !trimmed && (
                  <Pressable
                    onPress={() => pick(undefined)}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <Text style={styles.emoji}>🚫</Text>
                    <Text style={[styles.name, styles.clear]}>None</Text>
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
                  {selected && <Ionicons name="checkmark" size={20} color={colors.text} />}
                </Pressable>
              )
            }}
            ListEmptyComponent={
              custom ? null : (
                <Text style={styles.empty}>Nothing matches “{trimmed}”</Text>
              )
            }
          />
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm },
  label: { ...type.label, color: colors.text },
  // Deliberately identical to Field's input box so the two line up in a form.
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  triggerPressed: { backgroundColor: colors.surfaceSunken },
  triggerEmoji: { fontSize: 18 },
  triggerText: { ...type.body, fontSize: 16, color: colors.text, flex: 1, minWidth: 0 },
  triggerPlaceholder: { color: colors.textPlaceholder },
  sheet: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { ...type.title, color: colors.text, flex: 1, minWidth: 0 },
  close: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: colors.surfaceAlt },
  rowPressed: { opacity: 0.6 },
  emoji: { fontSize: 20 },
  name: { ...type.body, fontSize: 16, color: colors.text, flex: 1, minWidth: 0 },
  clear: { color: colors.textMuted },
  empty: { ...type.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xxl },
})
