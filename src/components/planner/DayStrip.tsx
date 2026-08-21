import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useNum } from '@/i18n'
import { useDayLabel } from '@/i18n/labels'
import { isSameDay, toDateKey } from '@/lib/week'
import { radius, spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * The week's seven days as one row.
 *
 * **The selected day is tamarind text over a short 20×1.5 underline, not a
 * filled block**, and the design is explicit about it. A filled chip is the
 * heaviest mark on a page whose whole system is 1–1.5px rules, and seven of
 * them in a row with one filled reads as a segmented control rather than as a
 * date. The underline is centred and deliberately narrower than the column, so
 * it marks the day rather than boxing it.
 *
 * Seven equal columns (`flex: 1`, not a fixed width) is what keeps the strip
 * from reflowing as the numbers change width between months — and this app runs
 * on web, where the row divides a resizable window.
 *
 * The dot above a day means "something is planned here". A dot rather than a
 * count because at this size a numeral is unreadable, and because the useful
 * question standing in a kitchen is whether a day is empty, not how full.
 *
 * **Today carries a soft tamarind disc under its numeral, whether or not it is
 * the day being viewed** — the two marks answer different questions. The
 * underline says "this is the day on screen"; the disc says "this is the day
 * you are actually in", which stays true while you plan Thursday. They are
 * deliberately different *kinds* of mark rather than two weights of the same
 * one: a fill and a rule can sit on the same day without either one reading as
 * a stronger version of the other.
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
  const n = useNum()
  // Read per render rather than memoised: the strip is cheap, and a `useMemo`
  // with no dependencies would keep yesterday's date across midnight.
  const today = new Date()

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const key = toDateKey(day)
        const active = isSameDay(day, selected)
        const isToday = isSameDay(day, today)
        const planned = plannedKeys.has(key)

        return (
          <Pressable
            key={key}
            onPress={() => onSelect(day)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.day,
              pressed && !active && styles.dayPressed,
            ]}
          >
            <Text style={[styles.name, active && styles.textActive]} numberOfLines={1}>
              {dayLabel(day)}
            </Text>
            {/* The disc is always drawn and only takes a fill on today, so
                the row's height can't depend on which week is on screen. */}
            <View style={[styles.disc, isToday && styles.discToday]}>
              <Text style={[styles.date, active && styles.textActive]}>{n(day.getDate())}</Text>
            </View>
            {/* Always rendered, transparent when empty — a dot that appears and
                disappears would change every day's height as the week fills. */}
            <View style={[styles.dot, planned && styles.dotPlanned]} />
            {/* Same: drawn in both states so selecting a day can't shift the
                row by 1.5px. */}
            <View style={[styles.underline, active && styles.underlineActive]} />
          </Pressable>
        )
      })}
    </View>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.gutter },
    day: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: spacing.sm },
    dayPressed: { opacity: 0.6 },
    name: { ...type.metadataSmall, color: c.textMuted, textTransform: 'uppercase' },
    // `dayNumeral`, not `rowTitle`: the date is the thing you tap, so it takes
    // the medium face the mockup gives it rather than the regular serif used
    // for a row's title. Full ink, not `textMuted` — the mockup dims only the
    // weekday above it (`opacity .7`), because the abbreviation is a caption on
    // the number and greying both left the whole strip reading as disabled.
    date: { ...type.dayNumeral, color: c.text, textAlign: 'center' },
    // Content-sized with a floor, so a two-digit date and a Khmer numeral both
    // sit centred in the same disc without it changing width down the row.
    disc: {
      minWidth: 30,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    /** Tamarind at .1 — the same soft fill the chips use, not a second colour. */
    discToday: { backgroundColor: c.accentSoft },
    // Colour alone, because the underline below is the shape cue. Neither is
    // carrying "selected" on its own.
    textActive: { color: c.primary },
    dot: { width: 3, height: 3, borderRadius: radius.pill, backgroundColor: 'transparent' },
    dotPlanned: { backgroundColor: c.primary },
    underline: { width: 20, height: 1.5, backgroundColor: 'transparent', marginTop: 2 },
    underlineActive: { backgroundColor: c.primary },
  })
