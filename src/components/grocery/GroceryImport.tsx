import { useRef, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import {
  FlatList, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Chip from '@/components/ui/Chip'
import Field from '@/components/ui/Field'
import NavigationButton from '@/components/ui/NavigationButton'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { Text } from '@/components/ui/Text'
import { useNum, useT } from '@/i18n'
import { apiErrorKey } from '@/i18n/errors'
import { useDayLabel, useMonthLabel } from '@/i18n/labels'
import type { StringKey } from '@/i18n/strings'
import { ApiError, importGroceryItems } from '@/lib/api'
import type { GroceryItem, GroceryList } from '@/lib/api'
import {
  groceryImportKey, MAX_GROCERY_ITEMS_PER_WEEK, parseGroceryImport, reviewedGroceryItem,
} from '@/lib/groceryImport'
import type { GroceryImportRow } from '@/lib/groceryImport'
import { fromDateKey, toDateKey } from '@/lib/week'
import { sizes, spacing, useTheme, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

type Destination = 'day' | 'week'

export default function GroceryImport({
  list, focusDate, initialDestination, token, onClose, onSaved,
}: {
  list: GroceryList
  focusDate: string
  initialDestination: Destination
  token: string
  onClose: () => void
  onSaved: (week: string, items: GroceryItem[], destination: Destination) => void
}) {
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const t = useT()
  const n = useNum()
  const day = useDayLabel()
  const month = useMonthLabel()

  const [text, setText] = useState('')
  const [draft, setDraft] = useState<GroceryImportRow[] | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const [destination, setDestination] = useState(initialDestination)
  const [error, setError] = useState<StringKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [retryOnly, setRetryOnly] = useState(false)
  const writing = useRef(false)
  const importId = useRef('')

  const date = fromDateKey(focusDate)
  const from = fromDateKey(list.from)
  const to = fromDateKey(list.to)
  const dayLabel = [day(date), n(date.getDate()), month(date)].join(' ')
  const weekLabel = [n(from.getDate()), month(from), '–', n(to.getDate()), month(to)].join(' ')
  const today = toDateKey(new Date())
  const isToday = focusDate === today
  const isThisWeek = today >= list.from && today <= list.to
  const shoppingDate = destination === 'day' ? focusDate : null
  const matchingItems = new Set(list.items.filter((item) => (
    destination === 'week' ? !item.shoppingDate : item.shoppingDate === shoppingDate
  )).map((item) => groceryImportKey(item.name, item.unit)))
  const items = draft?.map(reviewedGroceryItem) ?? []
  const available = Math.max(0, MAX_GROCERY_ITEMS_PER_WEEK - list.items.length)
  const overCapacity = items.length > available
  const invalid = items.includes(null)
  const locked = saving || retryOnly

  function close() {
    if (!writing.current) onClose()
  }

  function back() {
    if (writing.current) return
    if (!reviewing || retryOnly) return close()
    Keyboard.dismiss()
    setError(null)
    setReviewing(false)
  }

  function preview() {
    const rows = draft ?? parseGroceryImport(text)
    if (rows.length === 0) {
      setError('grocery.importEmpty')
      return
    }
    Keyboard.dismiss()
    setError(null)
    setDraft(rows)
    setReviewing(true)
  }

  function edit(id: number, field: 'name' | 'amount' | 'unit', value: string) {
    setError(null)
    setDraft((rows) => rows?.map((row) => row.id === id ? { ...row, [field]: value } : row) ?? null)
  }

  async function save() {
    const validItems = items.filter((item) => item !== null)
    if (writing.current || invalid || (!retryOnly && overCapacity) || validItems.length === 0) return
    if (!importId.current) {
      importId.current = [Date.now(), Math.random(), Math.random()].map((part) => (
        part.toString(36).replace('.', '')
      )).join('-')
    }
    writing.current = true
    Keyboard.dismiss()
    setSaving(true)
    setError(null)
    try {
      const saved = await importGroceryItems({
        weekStart: list.from, shoppingDate, importId: importId.current, items: validItems,
      }, token)
      onSaved(list.from, saved, destination)
    } catch (err) {
      // A connection loss can happen after commit. Retry the identical batch.
      const uncertain = !(err instanceof ApiError) || err.status >= 500 || err.status === 408
      if (uncertain) setRetryOnly(true)
      setError(uncertain ? 'grocery.importUnconfirmed' : apiErrorKey(err))
    } finally {
      writing.current = false
      setSaving(false)
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={back}>
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          {reviewing && !retryOnly && (
            <NavigationButton action="back" onPress={back} />
          )}
          <Text accessibilityRole="header" style={styles.title}>
            {t(reviewing ? 'grocery.importReview' : 'grocery.importTitle')}
          </Text>
          <NavigationButton action="close" onPress={close} />
        </View>

        {reviewing ? (
          <FlatList
            data={draft ?? undefined}
            keyExtractor={(row) => String(row.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
            ListHeaderComponent={
              <View style={styles.destination}>
                <Text style={styles.label}>{t('grocery.importDestination')}</Text>
                <View style={styles.choices} pointerEvents={locked ? 'none' : 'auto'}>
                  <Chip
                    label={isToday ? t('grocery.scopeDay') : dayLabel}
                    active={destination === 'day'}
                    onPress={() => { if (!locked) setDestination('day') }}
                  />
                  <Chip
                    label={isThisWeek ? t('grocery.scopeWeek') : weekLabel}
                    active={destination === 'week'}
                    onPress={() => { if (!locked) setDestination('week') }}
                  />
                </View>
                {(destination === 'day' ? isToday : isThisWeek) && (
                  <Text style={styles.note}>{destination === 'day' ? dayLabel : weekLabel}</Text>
                )}
              </View>
            }
            renderItem={({ item, index }) => {
              const duplicate = matchingItems.has(groceryImportKey(item.name, item.unit))
              const itemInvalid = items[index] === null
              return (
                <View style={styles.row}>
                  <View style={styles.fields}>
                    <Field
                      label={t('grocery.composerName')}
                      accessibilityLabel={t('grocery.composerName')}
                      containerStyle={styles.field}
                      value={item.name}
                      editable={!locked}
                      onChangeText={(value) => edit(item.id, 'name', value)}
                    />
                    <Pressable
                      style={styles.remove}
                      accessibilityRole="button"
                      accessibilityLabel={t('grocery.importRemove').replace('{name}', item.name)}
                      disabled={locked}
                      onPress={() => {
                        setError(null)
                        setDraft((rows) => rows?.filter((row) => row.id !== item.id) ?? null)
                      }}
                    >
                      <Ionicons name="close" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                  <View style={styles.fields}>
                    <Field
                      label={t('grocery.composerAmount')}
                      accessibilityLabel={t('grocery.composerAmount')}
                      containerStyle={styles.field}
                      editable={!locked}
                      keyboardType="decimal-pad"
                      value={item.amount}
                      onChangeText={(value) => edit(item.id, 'amount', value)}
                    />
                    <Field
                      label={t('grocery.composerUnit')}
                      accessibilityLabel={t('grocery.composerUnit')}
                      containerStyle={styles.field}
                      editable={!locked}
                      value={item.unit}
                      onChangeText={(value) => edit(item.id, 'unit', value)}
                    />
                  </View>
                  {duplicate && <Text style={styles.note}>{t('grocery.importDuplicate')}</Text>}
                  {itemInvalid && <Text style={styles.error}>{t('grocery.importInvalid')}</Text>}
                </View>
              )
            }}
            ListEmptyComponent={<Text style={styles.note}>{t('grocery.importEmpty')}</Text>}
          />
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.note}>{t('grocery.importInstructions')}</Text>
            <Field
              multiline
              accessibilityLabel={t('grocery.importText')}
              autoCorrect={false}
              value={text}
              placeholder={t('grocery.importExample')}
              onChangeText={(value) => {
                setText(value)
                setDraft(null)
                setError(null)
              }}
            />
          </ScrollView>
        )}

        <View style={styles.footer}>
          {error && <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>}
          {reviewing && overCapacity && !retryOnly && (
            <Text accessibilityRole="alert" style={styles.error}>
              {available === 0
                ? t('grocery.importWeekFull')
                : t('grocery.importCapacity').replace('{count}', n(available))}
            </Text>
          )}
          {reviewing ? (
            <PrimaryButton
              label={t(retryOnly ? 'grocery.importRetry' : 'grocery.importSave')}
              loading={saving}
              disabled={invalid || (!retryOnly && overCapacity) || items.length === 0}
              onPress={save}
            />
          ) : (
            <PrimaryButton label={t('grocery.importPreview')} disabled={!text.trim()} onPress={preview} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
  },
  title: { ...type.emptyTitle, flex: 1, color: c.text },
  content: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.md, gap: spacing.md },
  destination: { gap: spacing.sm, marginBottom: spacing.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  label: { ...type.metadata, color: c.textMuted },
  row: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border, paddingVertical: spacing.md, gap: spacing.sm },
  fields: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  field: { flex: 1, minWidth: 0 },
  remove: { width: sizes.hitMin, minHeight: sizes.hitMin, alignItems: 'center', justifyContent: 'center' },
  note: { ...type.bodyRead, color: c.textMuted },
  error: { ...type.bodyRead, color: c.danger },
  footer: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.md, gap: spacing.sm },
})
