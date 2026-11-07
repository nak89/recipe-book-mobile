import { useEffect, useState } from 'react'
import { AppState, StyleSheet, View } from 'react-native'
import { useIsFocused } from 'expo-router'
import Animated, { cubicBezier } from 'react-native-reanimated'
import type { CSSAnimationKeyframes } from 'react-native-reanimated'
import { Text } from '@/components/ui/Text'
import { useT } from '@/i18n'
import { curve, spacing, useMotion, useThemedStyles } from '@/theme'
import type { ThemeColors, TypeScale } from '@/theme'

// The tip stays in the bowl: a slow grinding motion, without bounce or pulse.
const grind: CSSAnimationKeyframes = {
  '0%, 100%': { transform: [{ translateX: -6 }, { translateY: -2 }, { rotate: '13deg' }] },
  '30%': { transform: [{ translateX: 4 }, { translateY: 3 }, { rotate: '30deg' }] },
  '55%': { transform: [{ translateX: 7 }, { translateY: 0 }, { rotate: '35deg' }] },
  '80%': { transform: [{ translateX: -3 }, { translateY: 3 }, { rotate: '19deg' }] },
}

/** A shared initial-load view. The caller owns the request and loading state. */
export default function MortarLoader() {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const focused = useIsFocused()
  const [appState, setAppState] = useState(AppState.currentState)

  useEffect(() => {
    const listener = AppState.addEventListener('change', setAppState)
    return () => listener.remove()
  }, [])

  const label = `${t('common.loading')}…`

  return (
    <View style={styles.container} accessible accessibilityLabel={label} accessibilityRole="progressbar" accessibilityState={{ busy: true }} accessibilityLiveRegion="polite">
      {focused && appState === 'active' && <MortarArtwork />}
    </View>
  )
}

/** Shown immediately for the explicitly chosen initial network-loading state. */
function MortarArtwork() {
  const styles = useThemedStyles(makeStyles)
  const t = useT()
  const { duration, reduced } = useMotion()
  // Reduced Motion skips the loop entirely. Removing this view (on completion,
  // blur or background) also removes its CSS animation.
  const animation = reduced ? undefined : {
    animationName: grind,
    animationDuration: duration.mortarGrind,
    animationIterationCount: 'infinite' as const,
    animationTimingFunction: cubicBezier(...curve.inOutSine),
  }

  return (
    <>
      <View style={styles.scene} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.foot} />
        <View style={styles.back} />
        <View style={styles.ingredients}>
          <View style={[styles.herb, styles.herbA]} />
          <View style={[styles.herb, styles.herbB]} />
          <View style={[styles.herb, styles.herbC]} />
        </View>
        <Animated.View style={[styles.pestleMotion, animation]}>
          <View style={styles.pestle}>
            <View style={styles.pestleGrain} />
            <View style={styles.pestleGrainShort} />
          </View>
        </Animated.View>
        <View style={styles.body}>
          <View style={styles.grain}><View style={styles.innerGrain} /></View>
        </View>
        <View style={styles.lip} />
      </View>
      <Text style={styles.label} accessible={false}>{t('common.loading')}…</Text>
    </>
  )
}

// Illustration coordinates describe the approved 176 × 152 drawing, not UI
// control sizes. Colour, type, spacing and motion still come from the theme.
const makeStyles = (c: ThemeColors, type: TypeScale) => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg, padding: spacing.xl, gap: spacing.lg },
  scene: { width: 176, height: 152 },
  foot: { position: 'absolute', left: 57, top: 132, width: 62, height: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: c.woodEnd },
  back: { position: 'absolute', left: 28, top: 79, width: 120, height: 35, borderRadius: '50%', backgroundColor: c.woodEnd },
  ingredients: { position: 'absolute', left: 34, top: 83, width: 108, height: 25, borderRadius: '50%', backgroundColor: c.oat, overflow: 'hidden' },
  herb: { position: 'absolute', width: 10, height: 4, borderTopLeftRadius: 7, borderBottomRightRadius: 7, backgroundColor: c.primary, transform: [{ rotate: '-22deg' }] },
  herbA: { left: 13, top: 8 },
  herbB: { left: 28, top: 14, transform: [{ rotate: '35deg' }] },
  herbC: { left: 77, top: 9 },
  pestleMotion: { position: 'absolute', left: 77, top: 6, width: 27, height: 107, transformOrigin: '50% 90%', transform: [{ rotate: '23deg' }] },
  pestle: { flex: 1, backgroundColor: c.primary, borderRadius: 13, transform: [{ rotate: '2deg' }] },
  pestleGrain: { position: 'absolute', left: 6, top: 10, bottom: 18, width: 9, borderLeftWidth: 1, borderColor: c.textInverse, opacity: 0.25, borderRadius: '50%' },
  pestleGrainShort: { position: 'absolute', right: 5, top: 22, bottom: 10, width: 5, borderLeftWidth: 1, borderColor: c.textInverse, opacity: 0.25, borderRadius: '50%' },
  body: { position: 'absolute', left: 30, top: 96, width: 116, height: 42, backgroundColor: c.primary, borderBottomLeftRadius: 45, borderBottomRightRadius: 45, overflow: 'hidden' },
  grain: { position: 'absolute', left: 12, top: 8, width: 94, height: 23, borderWidth: 1, borderColor: c.textInverse, borderRadius: '50%', opacity: 0.25, transform: [{ rotate: '7deg' }] },
  innerGrain: { position: 'absolute', left: 13, top: 6, width: 64, height: 10, borderWidth: 1, borderColor: c.textInverse, borderRadius: '50%' },
  lip: { position: 'absolute', left: 28, top: 80, width: 120, height: 30, borderBottomWidth: 6, borderColor: c.primary, borderRadius: '50%' },
  label: { ...type.metadata, color: c.text, opacity: 0.65, textAlign: 'center' },
})
