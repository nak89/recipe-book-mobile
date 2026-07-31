import { useEffect, useRef } from 'react'
import { Animated, Easing, Platform, StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { radius, useThemedStyles } from '@/theme'
import type { ThemeColors } from '@/theme'

/**
 * The pulse every placeholder shares.
 *
 * One value per screen, passed to each `Skeleton`, so the whole layout breathes
 * together. Giving each block its own animation drifts them out of phase within
 * a second or two, and a page of independently blinking grey boxes reads as
 * broken rather than loading.
 */
export function usePulse(): Animated.Value {
  const pulse = useRef(new Animated.Value(0.5)).current

  useEffect(() => {
    const step = (toValue: number) =>
      Animated.timing(pulse, {
        toValue,
        duration: 700,
        easing: Easing.inOut(Easing.ease),
        // react-native-web has no native driver to hand off to.
        useNativeDriver: Platform.OS !== 'web',
      })

    const animation = Animated.loop(Animated.sequence([step(1), step(0.5)]))
    animation.start()
    // A loop keeps running after unmount otherwise — on a fast connection that
    // leaves a timer behind on every screen you visit.
    return () => animation.stop()
  }, [pulse])

  return pulse
}

/** One grey block. Size and position it with `style`. */
export default function Skeleton({
  pulse,
  style,
}: {
  pulse: Animated.Value
  style?: StyleProp<ViewStyle>
}) {
  const styles = useThemedStyles(makeStyles)
  return <Animated.View style={[styles.block, style, { opacity: pulse }]} />
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  block: { backgroundColor: c.surfaceSunken, borderRadius: radius.sm },
})
