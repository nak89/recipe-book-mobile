import { useEffect, useMemo, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SearchBar from '@/components/ui/SearchBar'
import { useUnits } from '@/data/usePantry'
import { foldForCompare } from '@/lib/text'
import { useT } from '@/i18n'
import { radius, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

type Row =
  | { kind: 'header'; key: string; category: string }
  | { kind: 'item'; key: string; unit: string }

/**
 * The ingredient row's unit picker.
 *
 * Unlike `IngredientPicker` and `ToolPicker` this one **closes on selection** —
 * a row has exactly one unit, so staying open would just be a modal you then
 * have to dismiss.
 *
 * Two rows exist that aren't in the data. The `—` row sets the unit back to
 * `''`, which is a real and common value (a great many pantry entries ship no
 * unit at all — you don't measure onions in anything). And a typed query that
 * matches nothing is offered as-is, because `Ingredient.unit` is free text on
 * the server too and a picker over a free-text column must never be able to
 * refuse a value.
 */
export default function UnitPicker({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean
  value: string
  onSelect: (unit: string) => void
  onClose: () => void
}) {
  const { colors: c } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const t = useT()
  // Follows the language toggle: the Khmer list keeps Latin measurements and
  // swaps the count words — see `data/units.km.ts`.
  const groups = useUnits()
  const [query, setQuery] = useState('')

  // One picker instance serves every row, so the query has to be dropped between
  // openings — otherwise the second ingredient inherits the first one's search.
  useEffect(() => {
    if (!visible) setQuery('')
  }, [visible])

  const trimmed = query.trim()
  const current = foldForCompare(value)

  const rows = useMemo<Row[]>(() => {
    const q = foldForCompare(query)
    const out: Row[] = []
    for (const group of groups) {
      const units = group.units.filter((unit) => !q || foldForCompare(unit).includes(q))
      if (units.length === 0) continue
      out.push({ kind: 'header', key: `h:${group.category}`, category: group.category })
      for (const unit of units) {
        out.push({ kind: 'item', key: `${group.category}:${unit}`, unit })
      }
    }
    return out
  }, [query, groups])

  // Offer the typed text unless it's already on the list — the same contract
  // `Select`'s `allowCustom` has.
  const custom =
    trimmed.length > 0 &&
    !groups.some((g) => g.units.some((u) => foldForCompare(u) === foldForCompare(trimmed)))
      ? trimmed
      : null

  function pick(unit: string) {
    onSelect(unit)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('unitPicker.title')}</Text>
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
          <SearchBar value={query} onChangeText={setQuery} placeholder={t('unitPicker.search')} />
        </View>

        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
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
              {!trimmed && (
                <Pressable
                  onPress={() => pick('')}
                  style={({ pressed }) => [
                    styles.row,
                    !value && styles.rowSelected,
                    pressed && styles.rowPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: !value }}
                >
                  <Text style={styles.emoji}>➖</Text>
                  <Text style={[styles.name, styles.none]}>{t('unitPicker.none')}</Text>
                  {!value && <Ionicons name="checkmark" size={20} color={c.text} />}
                </Pressable>
              )}
            </>
          }
          renderItem={({ item: row }) => {
            if (row.kind === 'header') {
              return <Text style={styles.category}>{row.category}</Text>
            }
            const selected = current.length > 0 && foldForCompare(row.unit) === current
            return (
              <Pressable
                onPress={() => pick(row.unit)}
                style={({ pressed }) => [
                  styles.row,
                  selected && styles.rowSelected,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={row.unit}
              >
                <Text style={styles.name} numberOfLines={1}>
                  {row.unit}
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
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
  none: { color: c.textMuted },
  empty: { ...type.body, color: c.textMuted, textAlign: 'center', paddingVertical: spacing.xxl },
})
