import { useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SearchBar from '@/components/ui/SearchBar'
import PrimaryButton from '@/components/ui/PrimaryButton'
import type { CommonIngredient } from '@/data/ingredients'
import { useIngredients } from '@/data/usePantry'
import { foldForCompare } from '@/lib/text'
import { useT } from '@/i18n'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

type Row =
  | { kind: 'header'; key: string; category: string }
  | { kind: 'item'; key: string; ingredient: CommonIngredient }

/**
 * Tap-to-add pantry list. It stays open after each tap because nobody adds
 * exactly one ingredient — closing on select would mean reopening it six times
 * for a curry.
 *
 * Selection is driven by the names already in the form rather than by local
 * state, so a row typed by hand shows as added here too.
 */
export default function IngredientPicker({
  visible,
  selectedNames,
  onAdd,
  onRemove,
  onClose,
}: {
  visible: boolean
  selectedNames: string[]
  onAdd: (ingredient: CommonIngredient) => void
  onRemove: (name: string) => void
  onClose: () => void
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const t = useT()
  // The one list in the app that follows the toggle, because what you tap here
  // is written into your recipe — see `data/usePantry.ts`.
  const { ingredients, categories } = useIngredients()
  const [query, setQuery] = useState('')

  const selected = useMemo(
    () => new Set(selectedNames.map(foldForCompare)),
    [selectedNames]
  )

  const rows = useMemo<Row[]>(() => {
    // Folded, not lowercased — see lib/text.ts. A Khmer pantry name and a Khmer
    // query can differ by an invisible zero-width space and never match.
    const q = foldForCompare(query)
    const out: Row[] = []
    for (const category of categories) {
      const items = ingredients.filter(
        (i) => i.category === category && (!q || foldForCompare(i.name).includes(q))
      )
      if (items.length === 0) continue
      out.push({ kind: 'header', key: `h:${category}`, category })
      for (const ingredient of items) {
        out.push({ kind: 'item', key: ingredient.name, ingredient })
      }
    }
    return out
  }, [query, ingredients, categories])

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('picker.title')}</Text>
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
          <SearchBar value={query} onChangeText={setQuery} placeholder={t('picker.search')} />
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
            const { ingredient } = row
            const isSelected = selected.has(foldForCompare(ingredient.name))
            return (
              <Pressable
                onPress={() =>
                  isSelected ? onRemove(ingredient.name) : onAdd(ingredient)
                }
                style={({ pressed }) => [
                  styles.row,
                  isSelected && styles.rowSelected,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={ingredient.name}
              >
                <Text style={styles.emoji}>{ingredient.emoji}</Text>
                <Text style={styles.name} numberOfLines={1}>
                  {ingredient.name}
                </Text>
                {ingredient.unit ? <Text style={styles.unit}>{ingredient.unit}</Text> : null}
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
              {/* One of the two places a value is spliced into a translated
                  string. Verb-then-object holds in both languages, so a template
                  literal at the call site is enough — see i18n/strings.ts. */}
              <Text style={styles.emptyTitle}>{`${t('picker.noMatch')} “${query.trim()}”`}</Text>
              <Text style={styles.emptyBody}>{t('picker.noMatchBody')}</Text>
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
  unit: { ...type.caption, color: c.textPlaceholder },
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
