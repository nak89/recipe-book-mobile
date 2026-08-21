import { Platform, StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import MaskedView from '@react-native-masked-view/masked-view'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { blur as blurTokens, sizes } from '@/theme'

/**
 * The band of blur under the status bar.
 *
 * Every screen that scrolls runs its scroller full-height and pads its
 * *content* instead, so a recipe photograph travels up underneath the clock
 * rather than being cut off against `bg`. Something has to stand between the
 * two, and a solid strip would put the hard line straight back.
 *
 * **Every layer is masked, and that is the whole component.** A `BlurView` is a
 * rectangle: wherever it stops, the picture goes from blurred to sharp in one
 * pixel, and that pixel is a straight line across the screen. Stacking unmasked
 * blurs does *not* fix it — it replaces one line with several fainter ones,
 * which is what a first attempt shipped and what got sent straight back. Each
 * layer is wrapped in a `MaskedView` over a vertical `LinearGradient`, so it
 * fades out instead of stopping and nothing in the composite has a boundary
 * left to see.
 *
 * Layer `i` reaches `(i+1)/layers` down the band and carries
 * `maxIntensity × (layers−i)/layers`, so coverage and strength fall off
 * together: short-and-strong at the top where every layer overlaps,
 * tall-and-weak spanning down to nothing.
 *
 * **The defaults are the subtle end on purpose** — see `blur` in the theme,
 * which is the one dial worth turning.
 */
export default function ProgressiveBlurHeader({
  height,
  maxIntensity,
  layers = 4,
  tint,
}: {
  /** Defaults to the safe-area inset plus `sizes.headerBlurRamp`. */
  height?: number
  maxIntensity?: number
  layers?: number
  tint?: 'light' | 'dark'
}) {
  const insets = useSafeAreaInsets()

  const band = height ?? insets.top + sizes.headerBlurRamp
  const peak = maxIntensity ?? blurTokens.header
  // The blur's own tint, not the app's: `expo-blur` asks whether the material
  // is a light one or a dark one, and this product is paper. There is one
  // palette — see `ThemeContext` — so this is a prop rather than a branch.
  const material = tint ?? 'light'

  return (
    <View style={[styles.band, { height: band }]} pointerEvents="none">
      {Array.from({ length: layers }, (_, i) => {
        const reach = (i + 1) / layers
        const intensity = (peak * (layers - i)) / layers
        return (
          <Layer key={i} reach={reach} intensity={intensity} tint={material} height={band} />
        )
      })}
    </View>
  )
}

/**
 * One masked layer.
 *
 * **`@react-native-masked-view`'s web build is a stub** that renders the mask
 * element and throws the content away, so it must never run in a browser. Web
 * gets a CSS `mask-image` instead, which works because `BlurView` there is a
 * `View` with `backdrop-filter` and react-native-web passes style keys it
 * doesn't recognise straight through to the DOM. The app is judged on a phone;
 * this branch exists so the screenshot harness doesn't render a white slab.
 */
function Layer({
  reach,
  intensity,
  tint,
  height,
}: {
  reach: number
  intensity: number
  tint: 'light' | 'dark'
  height: number
}) {
  if (Platform.OS === 'web') {
    return (
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[
          StyleSheet.absoluteFill,
          // `maskImage` is a DOM property, not a react-native style key —
          // react-native-web passes anything it doesn't recognise straight
          // through, which is the whole mechanism here.
          { maskImage: `linear-gradient(to bottom, #000 0%, transparent ${reach * 100}%)` } as object,
        ]}
      />
    )
  }

  return (
    <MaskedView
      style={StyleSheet.absoluteFill}
      maskElement={
        <LinearGradient
          // Opaque at the top, gone by `reach`. The stop is expressed in
          // `locations` rather than by shortening the gradient, so every layer
          // covers the same rectangle and only the falloff differs.
          colors={['#000', 'transparent']}
          locations={[0, reach]}
          style={{ height }}
        />
      }
    >
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
    </MaskedView>
  )
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Above the page, below the tab bar — the bar is solid paper and reserves
    // its own space at the other end of the screen, so they never meet.
    zIndex: 10,
  },
})
