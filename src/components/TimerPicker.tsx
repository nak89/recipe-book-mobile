import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { formatDuration, durationParts, TIMER_PRESETS } from '@/lib/timer'
import { useNum, useT } from '@/i18n'
import { spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Picks a step's countdown — SCREENS.md § 17's timer chip, opened out.
 *
 * A **list, not a number pad.** Cooking times are conventional; nobody simmers
 * for seven minutes, and a keypad on a card inside a wizard is a lot of control
 * for a value most steps never set. `TIMER_PRESETS` is a shortcut in exactly the
 * way the pantry and the cuisine list are — the column takes any whole number of
 * seconds and the schema accepts 1–43200, so nothing here is a limit on what can
 * be stored, only on what this control offers.
 *
 * Each row carries the clock form **and** the words, because `0:30` beside
 * `1:30` is ambiguous about which unit is which until you have read both. Only
 * the clock form goes through `n()` on the chip itself, where the row above it
 * has already said which is which.
 *
 * The first row clears the timer rather than a ✕ in the corner: "no timer" is
 * one of the choices this control offers, not an escape from having made one.
 */
export default function TimerPicker({
  visible,
  value,
  onPick,
  onClose,
}: {
  visible: boolean
  /** The step's current duration in seconds, or null. */
  value: number | null
  onPick: (seconds: number | null) => void
  onClose: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const n = useNum()
  const insets = useSafeAreaInsets()

  /** `90` → `1 min 30 s`, in the interface's language. */
  function spell(seconds: number): string {
    const { hours, minutes, seconds: rest } = durationParts(seconds)
    return [
      hours > 0 ? `${n(hours)} ${t('form.hoursShort')}` : null,
      minutes > 0 ? `${n(minutes)} ${t('form.minutesShort')}` : null,
      rest > 0 ? `${n(rest)} ${t('form.secondsShort')}` : null,
    ]
      .filter(Boolean)
      .join(' ')
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.grabber} />
          <Text style={styles.title}>{t('form.stepTimer')}</Text>
          <Text style={styles.hint}>{t('form.stepTimerHint')}</Text>

          <FlatList
            data={TIMER_PRESETS}
            keyExtractor={(seconds) => String(seconds)}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            ListHeaderComponent={
              <Pressable
                onPress={() => onPick(null)}
                accessibilityRole="radio"
                accessibilityState={{ selected: value === null }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Text style={[styles.rowLabel, styles.rowClear]}>{t('form.noTimer')}</Text>
                {value === null && <View style={styles.tick} />}
              </Pressable>
            }
            renderItem={({ item }) => {
              const selected = value === item
              return (
                <Pressable
                  onPress={() => onPick(item)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <Text style={styles.rowLabel}>{n(formatDuration(item))}</Text>
                  <Text style={styles.rowSpelled}>{spell(item)}</Text>
                  {selected && <View style={styles.tick} />}
                </Pressable>
              )
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: c.scrimStrong, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: spacing.gutter,
      paddingTop: spacing.md,
      // Tall enough to show several presets without becoming a full-screen
      // takeover for one number.
      maxHeight: '72%',
    },
    grabber: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.borderStrong,
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    title: { ...type.section, color: c.text },
    hint: { ...type.body, color: c.textMuted, marginTop: spacing.xs },
    list: { marginTop: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      minHeight: 52,
      paddingVertical: spacing.rowY,
      borderBottomWidth: 0.5,
      borderBottomColor: c.border,
    },
    rowPressed: { opacity: 0.6 },
    // Mono, like every other quantity in the product — a duration is something
    // you reference rather than read.
    rowLabel: { ...type.bodyLargeStrong, color: c.text, minWidth: 72 },
    rowClear: { color: c.textMuted, minWidth: 0, flex: 1 },
    rowSpelled: { ...type.metadata, color: c.textMuted, flex: 1 },
    // The same 13px tamarind disc `LedgerRow` ticks with, so "chosen" looks the
    // same everywhere in the app.
    tick: { width: 13, height: 13, borderRadius: 7, backgroundColor: c.primary },
  })
