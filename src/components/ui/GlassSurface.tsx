import type { ReactNode } from 'react'
import { BlurView } from 'expo-blur'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { StyleSheet, View } from 'react-native'
import type { StyleProp, ViewProps, ViewStyle } from 'react-native'
import { useTheme } from '@/theme'

/**
 * A translucent surface, in the best form the platform can manage.
 *
 * Three tiers, best first:
 *
 * 1. **iOS 26+** — `GlassView` is Apple's real Liquid Glass material. It
 *    refracts and specularly highlights whatever scrolls under it, which is
 *    the thing a blur can only approximate.
 * 2. **Everything else with a working blur** — `BlurView` over a translucent
 *    floor (`glass`). The floor matters most on Android, where the blur is
 *    cheap enough that a pill over a bright photo would otherwise lose its
 *    edges.
 * 3. **No blur at all** — the floor alone, which is a plain translucent pill.
 *    Nothing breaks; it just stops being glass.
 *
 * The check is a native call whose answer can't change while the app is
 * running, so it's read once at module scope rather than per render.
 */
const LIQUID_GLASS = isLiquidGlassAvailable()

export default function GlassSurface({
  style,
  children,
  ...rest
}: ViewProps & {
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}) {
  const { colors: c, isDark } = useTheme()

  if (LIQUID_GLASS) {
    return (
      <GlassView
        {...rest}
        style={style}
        glassEffectStyle="regular"
        // Not 'auto'. The app's own toggle can disagree with the phone, and the
        // system default follows the phone — which would put a light pill under
        // a dark app for anyone who overrode their OS setting.
        colorScheme={isDark ? 'dark' : 'light'}
      >
        <Veil color={c.glass} />
        {children}
      </GlassView>
    )
  }

  return (
    <View {...rest} style={style}>
      {/* A sibling behind the content rather than a parent around it — the
          caller's border radius lives on the wrapper, and nesting content
          inside BlurView costs an extra clipping layer for nothing. */}
      <BlurView
        // High intensity on purpose: at low values the pill reads as a flat
        // translucent panel. Dark sits a little lower because a heavy blur over
        // near-black turns to mud rather than frost.
        intensity={isDark ? 65 : 85}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <Veil color={c.glass} />
      {children}
    </View>
  )
}

/**
 * The tint, painted **over** the blurred backdrop.
 *
 * It cannot be the blur view's own `backgroundColor`, which is what this used
 * to be and why the pill had no neutral bias at all:
 *
 * - on web, `expo-blur` renders `style={[style, blurStyle]}` and `blurStyle`
 *   sets `backgroundColor` — so ours was overridden and silently dropped;
 * - on iOS the blur is a `UIVisualEffectView` whose effect layer sits above the
 *   view's own background, so a colour underneath is swamped by the backdrop.
 *
 * Painted on top, the result is the same on every platform and the pill keeps a
 * light cast in light mode even over dark recipe photography. `pointerEvents`
 * is off so it can't swallow a tab press.
 */
function Veil({ color }: { color: string }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />
}
