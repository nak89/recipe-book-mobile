import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useDayLabel } from '@/i18n/labels'
import { isSameDay, toDateKey } from '@/lib/week'
import { radius, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * The week's seven days as one row.
 *
 * Each day reuses `Chip`'s selected treatment rather than being a Chip: a Chip
 * is content-sized and these have to divide the row evenly, so the *look* is
 * shared and the layout isn't. Seven equal columns is also what keeps the strip
 * from reflowing as the numbers change width between months.
 *
 * The dot under a day means "something is planned here". It's a dot rather than
 * a count because at this size a numeral is unreadable, and because the useful
 * question standing in the kitchen is whether a day is empty, not how full.
 */
export default function DayStrip({
  days,
  selected,
  plannedKeys,
  onSelect,
}: {
  days: Date[]
  selected: Date
  /** Date keys with at least one meal planned. */
  plannedKeys: Set<string>
  onSelect: (day: Date) => void
}) {
  const styles = useThemedStyles(makeStyles)
  const dayLabel = useDayLabel()

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const key = toDateKey(day)
        const active = isSameDay(day, selected)
        const planned = plannedKeys.has(key)

        return (
          <Pressable
            key={key}
            onPress={() => onSelect(day)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.day,
              active && styles.dayActive,
              pressed && !active && styles.dayPressed,
            ]}
          >
            <Text style={[styles.name, active && styles.textActive]} numberOfLines={1}>
              {dayLabel(day)}
            </Text>
            <Text style={[styles.date, active && styles.textActive]}>{day.getDate()}</Text>
            {/* Always rendered, transparent when empty — a dot that appears and
                disappears would change every day's height as the week fills. */}
            <View style={[styles.dot, planned && (active ? styles.dotActive : styles.dotPlanned)]} />
          </Pressable>
        )
      })}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.lg },
    // `flex: 1` over a fixed width: seven columns have to divide whatever the
    // screen is, and this app runs on web where that's a resizable window.
    day: {
      flex: 1,
      alignItems: 'center',
      gap: 5,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: 'transparent',
    },
    dayActive: { backgroundColor: c.primary },
    dayPressed: { backgroundColor: c.surfaceAlt },
    name: { ...type.caption, color: c.textMuted },
    date: { ...type.bodyStrong, color: c.textMuted },
    textActive: { color: c.onPrimary },
    dot: { width: 5, height: 5, borderRadius: radius.pill, backgroundColor: 'transparent' },
    dotPlanned: { backgroundColor: c.textMuted },
    // On the selected day the dot sits on the green fill, so it takes the same
    // ink the label does — `textMuted` there is nearly invisible.
    dotActive: { backgroundColor: c.onPrimary },
  })
