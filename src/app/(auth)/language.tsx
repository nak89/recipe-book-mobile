import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLanguage } from '@/i18n'
import type { Language } from '@/i18n'
import PageDots from '@/components/ui/PageDots'
import { moulType, spacing, useScreenTopPad, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

/**
 * Screen 1 — the language picker, and **the only screen in the app that shows
 * both scripts at once**.
 *
 * Every string below is hardcoded in both languages rather than coming from
 * `@/i18n`, and that is the design rather than a shortcut. This screen runs
 * before a preference exists, so `t()` would resolve to the default (English)
 * and the Khmer option would be the only Khmer on a page whose entire job is to
 * let a Khmer speaker recognise their own language. The README names this as the
 * rule's one exception; anywhere else, two scripts on one screen is a bug.
 *
 * Nothing here writes the "seen" flag. Choosing a language is a preference, not
 * progress through the flow — someone who taps the wrong row and force-quits
 * should land back here rather than three screens further on with an interface
 * they can't read. `about.tsx` writes it, on either of its two exits.
 */
export default function LanguageScreen() {
  const { setLanguage } = useLanguage()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const topPad = useScreenTopPad()
  const styles = useThemedStyles(makeStyles)

  function choose(language: Language) {
    setLanguage(language)
    router.push('/about')
  }

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <View style={styles.masthead}>
        {/* Moul at 40. The Khmer wordmark leads because this is the screen where
            a Khmer reader has to find themselves first. */}
        <Text style={styles.wordmarkKm}>ចង្ក្រាន</Text>
        <Text style={styles.wordmarkEn}>HEARTH</Text>
        <View style={styles.rule} />
        <Text style={styles.promiseEn}>
          A cookbook for the dishes your family already knows.
        </Text>
        <Text style={styles.promiseKm}>សៀវភៅម្ហូបសម្រាប់រូបមន្តគ្រួសារអ្នក។</Text>
      </View>

      <View style={styles.choices}>
        {/* The two scripts are joined by a middle dot rather than stacked, so
            the label reads as one instruction in two languages instead of as a
            translation sitting under an original. */}
        <Text style={styles.chooseLabel}>CHOOSE A LANGUAGE · ជ្រើសភាសា</Text>

        <Row label="ភាសាខ្មែរ" labelStyle={styles.optionKm} onPress={() => choose('km')} />
        <Row label="English" labelStyle={styles.optionEn} onPress={() => choose('en')} />

        <Text style={styles.footnoteEn}>You can switch any time in Settings.</Text>
        <Text style={styles.footnoteKm}>អ្នកអាចប្ដូរពេលណាក៏បាន។</Text>
      </View>

      <PageDots count={2} index={0} style={[styles.dots, { marginBottom: insets.bottom }]} />
    </View>
  )
}

function Row({
  label,
  labelStyle,
  onPress,
}: {
  label: string
  labelStyle: object
  onPress: () => void
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <Text style={[labelStyle, styles.optionLabel]}>{label}</Text>
      {/* Drawn rather than typed: the arrow glyph in Newsreader is a different
          weight from the 1.2px rules around it, and at this size that reads as
          a mistake. Views, like the "+" in `AddRow`. */}
      <View style={styles.arrow}>
        <View style={styles.arrowShaft} />
        <View style={styles.arrowHead} />
      </View>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    // 34, the design's own — wider than `gutterWide`, because this page is a
    // centred column rather than a page of content.
    screen: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 34 },
    masthead: { alignItems: 'center', gap: spacing.sm },
    // Both wordmarks are written against a fixed family rather than the active
    // scale: `useThemedStyles` would otherwise set `HEARTH` in Kantumruy for a
    // Khmer reader, which is a Latin word in a Khmer face.
    // 56 was 17pt short — the worst of the four, on the first screen a Khmer
    // reader ever sees.
    wordmarkKm: { ...moulType(40), color: c.text },
    wordmarkEn: {
      fontFamily: 'Newsreader_400Regular',
      fontSize: 12,
      letterSpacing: 3.6, // .3em
      color: c.textMuted,
    },
    rule: { width: 44, height: 1.5, backgroundColor: c.text, marginVertical: spacing.md },
    promiseEn: {
      fontFamily: 'Newsreader_400Regular',
      fontSize: 15,
      lineHeight: 22,
      color: c.text,
      textAlign: 'center',
    },
    promiseKm: {
      fontFamily: 'KantumruyPro_400Regular',
      fontSize: 15,
      // 1.85 — the multi-line Khmer paragraph leading the README specifies.
      lineHeight: 28,
      color: c.text,
      textAlign: 'center',
    },

    choices: { flex: 1, justifyContent: 'center', gap: spacing.md },
    chooseLabel: {
      ...type.metadataSmall,
      color: c.textMuted,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 17,
      borderBottomWidth: 1.2,
      borderBottomColor: c.text,
    },
    pressed: { opacity: 0.6 },
    optionLabel: { color: c.text, flex: 1, minWidth: 0 },
    optionKm: { fontFamily: 'KantumruyPro_500Medium', fontSize: 24, lineHeight: 40 },
    optionEn: { fontFamily: 'Newsreader_400Regular', fontSize: 24, lineHeight: 32 },

    arrow: { width: 18, height: 12, justifyContent: 'center' },
    arrowShaft: { position: 'absolute', left: 0, right: 2, height: 1.2, backgroundColor: c.text },
    /**
     * The head is **one square with two borders**, not two rotated bars.
     *
     * Two bars can't make a point. Each was rotated about its own centre, so
     * their right-hand ends landed 1.9px apart on either side of the shaft and
     * the arrow finished in a notch rather than a tip — the "cut off" look. A
     * box carrying only its top and right borders has the vertex built in:
     * rotated 45° the corner between them *is* the tip, and the two arms can't
     * drift apart because they are one element.
     *
     * The geometry: rotating a 7×7 box 45° about its centre throws that corner
     * √2 × 3.5 = 4.95 out from the middle, i.e. 1.45 past the box's own right
     * edge — so `right: 3.5` lands the tip at x≈16, exactly where the shaft
     * ends, and `top` centres it on the shaft's line. Both arms stay inside the
     * 18×12 frame with a point to spare.
     */
    arrowHead: {
      position: 'absolute',
      right: 3.5,
      top: 2.5,
      width: 7,
      height: 7,
      borderTopWidth: 1.2,
      borderRightWidth: 1.2,
      borderColor: c.text,
      transform: [{ rotate: '45deg' }],
    },

    footnoteEn: {
      ...sharedFootnote,
      fontFamily: 'Newsreader_400Regular',
      color: c.textMuted,
    },
    footnoteKm: {
      ...sharedFootnote,
      fontFamily: 'KantumruyPro_400Regular',
      lineHeight: 22,
      color: c.textMuted,
    },
    dots: { alignSelf: 'center', paddingVertical: spacing.xl },
  })

const sharedFootnote = { fontSize: 13, textAlign: 'center' } as const
