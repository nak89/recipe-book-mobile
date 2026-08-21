import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '@/components/ui/Text'
import type { StyleProp, TextStyle, ViewStyle } from 'react-native'
import { spacing, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'
import { useLanguage, useT } from '@/i18n'
import type { Language } from '@/i18n'

/**
 * The masthead's language switch: `ខ្មែរ / EN`, the active one tamarind under a
 * 2px bottom border.
 *
 * **This is the one control in the app that shows both languages at once**, and
 * it is not a breach of the one-language-at-a-time rule — it is the rule's own
 * exception, for the same reason the first-run picker is: someone who cannot
 * read the current interface has to be able to find their way out of it. A
 * toggle that said "ភាសា" in Khmer mode and "Language" in English mode would be
 * unreadable to exactly the person who needs it.
 *
 * The two labels are therefore **not** translated, and each is set in its own
 * script's face. `ខ្មែរ` is Kantumruy 14 against `EN`'s 11pt Latin — the design
 * states both sizes, and the gap is not a mistake: Khmer carries more strokes
 * per em, so matched point sizes leave it visibly smaller than the Latin beside
 * it. This is the one place in the product where the two scales meet, so it is
 * the one place that has to be reconciled by hand — see `KM_LINE`/`EN_LINE`.
 */

/**
 * The two faces' declared ascent and descent, in ems, from their own `hhea`
 * tables. These are what the text engine distributes a `lineHeight` around, so
 * they are the numbers the alignment below has to be built from.
 */
const KANTUMRUY = { ascent: 0.92, descent: 0.26 }
const NEWSREADER = { ascent: 0.735, descent: 0.265 }

const KM_SIZE = 14
const EN_SIZE = 11

/** The design's own 14/1.5, and clear of Kantumruy's 1.443em of ink. */
const KM_LINE = 21

/**
 * The Latin line box that puts `EN` on the same baseline as `ខ្មែរ`.
 *
 * The row is bottom-aligned, so what lines up is the bottom of each label's line
 * *box* — and a box's bottom is not its baseline. A `lineHeight` is distributed
 * around the font's own `ascent + descent`, so the drop from box bottom to
 * baseline is `(line + descent − ascent) / 2`, which is a property of the face.
 * Equalising it gives this expression, which lands on 17.
 *
 * **Neither label pinned a `lineHeight` before**, so each fell back to its own
 * natural box and the two were reconciled by nothing at all. Measured in
 * Chromium against the bundled files, that put the Khmer baseline **9px above**
 * the Latin one; on iOS, where React Native distributes around the `hhea`
 * metrics this expression uses, it was nearer 0.7pt. Two very different numbers
 * for one bug, which is why it reads as "a little bit off the ground" on a phone
 * and as plainly broken in a browser.
 *
 * 17 zeroes it on iOS by construction and lands within 1px on web, where Chrome
 * measures the content box from different metrics and would prefer 18–19. That
 * residual is a rounding step — the browser quantises this to whole pixels — and
 * it is not worth a platform branch. **Don't hand-tune this to 18**: it would
 * trade a pixel on the platform nobody ships on for a pixel on the one they do.
 */
const EN_LINE = Math.round(
  KM_LINE -
    (KANTUMRUY.ascent - KANTUMRUY.descent) * KM_SIZE +
    (NEWSREADER.ascent - NEWSREADER.descent) * EN_SIZE
)
export default function LanguageToggle({ style }: { style?: StyleProp<ViewStyle> }) {
  const { language, setLanguage } = useLanguage()
  const styles = useThemedStyles(makeStyles)
  const t = useT()

  return (
    <View style={[styles.row, style]} accessibilityRole="radiogroup">
      <Option
        code="km"
        label="ខ្មែរ"
        active={language === 'km'}
        onPress={() => setLanguage('km')}
        labelStyle={styles.khmer}
      />
      <View style={styles.divider} />
      <Option
        code="en"
        label="EN"
        active={language === 'en'}
        onPress={() => setLanguage('en')}
        labelStyle={styles.latin}
      />
      {/* Named for a screen reader, which gets no help from the visual pairing. */}
      <View accessibilityLabel={t('index.languageToggle')} />
    </View>
  )
}

function Option({
  code,
  label,
  active,
  onPress,
  labelStyle,
}: {
  code: Language
  label: string
  active: boolean
  onPress: () => void
  labelStyle: StyleProp<TextStyle>
}) {
  const styles = useThemedStyles(makeStyles)
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      accessibilityValue={{ text: code }}
      onPress={onPress}
      // The drawn control is a word, which is well under 44pt tall; slop carries
      // the target out without opening a gap between the two labels.
      hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
      style={[styles.option, active && styles.optionActive]}
    >
      <Text style={[labelStyle, active ? styles.labelActive : styles.labelIdle]}>{label}</Text>
    </Pressable>
  )
}

const makeStyles = (c: ThemeColors, type: TypeScale) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
    option: { paddingBottom: 2, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    optionActive: { borderBottomColor: c.primary },
    // Both labels come from the *Latin* scale on purpose. `useThemedStyles`
    // hands this factory whichever scale the active language selects, and that
    // would set `EN` in Kantumruy while Khmer is active — a Latin word in a
    // Khmer face, which is the substitution the README warns about, pointed the
    // other way. Sizes are the design's own.
    // Both pin a `lineHeight`, which is what makes the baselines line up at all
    // — with neither set, each face falls back to its own natural box and the
    // two bottoms that get aligned sit at different distances from the text.
    khmer: {
      fontFamily: 'KantumruyPro_500Medium',
      fontSize: KM_SIZE,
      lineHeight: KM_LINE,
      // The scale's own Khmer tracking, by hand — this label is the one Khmer
      // word in the app that doesn't come from a token. See `kmTrack`.
      letterSpacing: KM_SIZE * 0.02,
    },
    latin: { ...type.tabLabel, fontSize: EN_SIZE, lineHeight: EN_LINE },
    labelActive: { color: c.primary },
    labelIdle: { color: c.inactive },
    divider: { width: 1, height: 12, backgroundColor: c.border, marginBottom: 3 },
  })
