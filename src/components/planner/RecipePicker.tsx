import { useMemo, useState } from 'react'
import { Image } from 'expo-image'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import SearchBar from '@/components/ui/SearchBar'
import { useT } from '@/i18n'
import { useDebounce } from '@/hooks/useDebounce'
import { foldForCompare } from '@/lib/text'
import { radius, shadow, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import type { Recipe } from '@/types/recipe'

/**
 * Picks a recipe for one planner slot.
 *
 * A Modal over the library rather than a route, for the same reason `Select` is
 * one: you are answering a question the screen behind you asked, and coming
 * back to it. Pushing a route would put the planner's scroll position and the
 * half-chosen day through a navigation transition to no purpose.
 *
 * It searches the list already in memory — there is no server-side search
 * endpoint, and the planner has fetched the recipes anyway to render the rows.
 */
export default function RecipePicker({
  visible,
  title,
  recipes,
  onPick,
  onClose,
}: {
  visible: boolean
  title: string
  recipes: Recipe[]
  onPick: (recipe: Recipe) => void
  onClose: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const t = useT()
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query)

  const visibleRecipes = useMemo(() => {
    // Folded on both sides: a Khmer keyboard puts zero-width spaces at word
    // boundaries, and they survive trim/lowercase/NFC — so folding only the
    // query still misses a stored title that carries one.
    const q = foldForCompare(debounced)
    if (!q) return recipes
    return recipes.filter((r) => foldForCompare(r.title).includes(q))
  }, [recipes, debounced])

  function handlePick(recipe: Recipe) {
    onPick(recipe)
    // Cleared on the way out, not on the way in: leaving a stale query behind
    // would silently filter the next slot's list.
    setQuery('')
  }

  function handleClose() {
    setQuery('')
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} accessibilityLabel={t('common.dismiss')}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.grabber} />
          <Text style={styles.heading} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.search}>
            <SearchBar value={query} onChangeText={setQuery} placeholder={t('planner.pickSearch')} />
          </View>

          <FlatList
            data={visibleRecipes}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>{t('dashboard.noMatchTitle')}</Text>
                <Text style={styles.emptyBody}>{t('dashboard.noMatchBody')}</Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handlePick(item)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.thumb} contentFit="cover" transition={200} />
                ) : (
                  <View style={styles.thumb} />
                )}
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {`${item.totalMinutes} min · ${item.servings}`}
                  </Text>
                </View>
              </Pressable>
            )}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    // Opaque `surface`, not glass: blur is for the dock and nothing else.
    // maxHeight rather than a fixed one — a library of three recipes shouldn't
    // open a sheet three quarters of the way up the screen.
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.md,
      maxHeight: '80%',
      ...shadow.raised,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.borderStrong,
      marginBottom: spacing.md,
    },
    heading: { ...type.section, color: c.text, paddingHorizontal: spacing.xl },
    search: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
    list: { padding: spacing.md, gap: spacing.xs },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.sm,
      borderRadius: radius.md,
    },
    rowPressed: { backgroundColor: c.surfaceAlt },
    thumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: c.surfaceSunken },
    rowText: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { ...type.bodyStrong, color: c.text },
    rowMeta: { ...type.caption, color: c.textMuted },
    empty: { alignItems: 'center', gap: spacing.xs, padding: spacing.xxl },
    emptyTitle: { ...type.section, color: c.text },
    emptyBody: { ...type.body, color: c.textMuted, textAlign: 'center' },
  })
