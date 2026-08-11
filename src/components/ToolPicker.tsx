import { useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SearchBar from '@/components/ui/SearchBar'
import PrimaryButton from '@/components/ui/PrimaryButton'
import type { CommonTool } from '@/data/tools'
import { useTools } from '@/data/usePantry'
import { foldForCompare } from '@/lib/text'
import { useT } from '@/i18n'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

type Row =
  | { kind: 'header'; key: string; category: string }
  | { kind: 'item'; key: string; tool: CommonTool }

/**
 * Tap-to-add equipment list. The ingredient picker's twin, down to staying open
 * across taps — a recipe that needs a pan usually needs a bowl too.
 *
 * Selection is derived from what's already in the form's tools field rather than
 * from local state, so a tool typed by hand shows as added here as well. The
 * form keeps that text field: this list is a shortcut, and `Recipe.tools` is
 * free text.
 */
export default function ToolPicker({
  visible,
  selectedNames,
  onAdd,
  onRemove,
  onClose,
}: {
  visible: boolean
  selectedNames: string[]
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  onClose: () => void
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const t = useT()
  // Follows the language toggle, because what you tap is written into the
  // recipe — see `data/usePantry.ts`.
  const { tools, categories } = useTools()
  const [query, setQuery] = useState('')

  const selected = useMemo(
    () => new Set(selectedNames.map(foldForCompare)),
    [selectedNames]
  )

  const rows = useMemo<Row[]>(() => {
    // Folded, not lowercased — a Khmer name and a Khmer query can differ by an
    // invisible zero-width space and never match. See lib/text.ts.
    const q = foldForCompare(query)
    const out: Row[] = []
    for (const category of categories) {
      const items = tools.filter(
        (tool) => tool.category === category && (!q || foldForCompare(tool.name).includes(q))
      )
      if (items.length === 0) continue
      out.push({ kind: 'header', key: `h:${category}`, category })
      for (const tool of items) {
        out.push({ kind: 'item', key: tool.name, tool })
      }
    }
    return out
  }, [query, tools, categories])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('toolPicker.title')}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={20} color={c.text} />
            </Pressable>
          </View>
          <SearchBar value={query} onChangeText={setQuery} placeholder={t('toolPicker.search')} />
        </View>

        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item: row }) => {
            if (row.kind === 'header') {
              return <Text style={styles.category}>{row.category}</Text>
            }
            const { tool } = row
            const isSelected = selected.has(foldForCompare(tool.name))
            return (
              <Pressable
                onPress={() => (isSelected ? onRemove(tool.name) : onAdd(tool.name))}
                style={({ pressed }) => [
                  styles.row,
                  isSelected && styles.rowSelected,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={tool.name}
              >
                <Text style={styles.emoji}>{tool.emoji}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {tool.name}
                </Text>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                  size={22}
                  color={isSelected ? c.text : c.borderStrong}
                />
              </Pressable>
            )
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{`${t('toolPicker.noMatch')} “${query.trim()}”`}</Text>
              <Text style={styles.emptyBody}>{t('toolPicker.noMatchBody')}</Text>
            </View>
          }
        />

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <PrimaryButton label={t('common.done')} onPress={onClose} />
        </View>
      </View>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bg },
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  category: {
    ...type.label,
    color: c.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    height: 52,
    borderRadius: radius.md,
  },
  rowSelected: { backgroundColor: c.surfaceAlt },
  rowPressed: { opacity: 0.6 },
  emoji: { fontSize: 20 },
  name: { ...type.bodyLarge, color: c.text, flex: 1, minWidth: 0 },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyTitle: { ...type.bodyStrong, color: c.text, textAlign: 'center' },
  emptyBody: { ...type.body, color: c.textMuted, textAlign: 'center' },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.bg,
  },
})
