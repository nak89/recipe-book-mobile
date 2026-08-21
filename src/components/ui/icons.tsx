import { StyleSheet, View } from 'react-native'
import type { ViewStyle } from 'react-native'

/**
 * Chronicle's six icons, transcribed from DESIGN_SYSTEM.md § Icons.
 *
 * They are **hairline constructions, not glyphs** — every one is a rounded
 * rectangle, a circle and a rule at 1.2–1.4px, and that weight is the whole
 * point: "the icons must sit at the same optical weight as the ruled lines, not
 * heavier." A font icon at this size lands visually bolder than the 1px rule
 * running beside it, and the page stops reading as one material.
 *
 * Built from `View` borders rather than SVG paths deliberately. The design
 * states each icon as a CSS construction — a border width, a radius, a rotation
 * — and those map one-to-one onto React Native styles, so this is a
 * transcription. Redrawing them as SVG paths would mean inventing coordinates
 * the handoff never gave, and it would add a dependency to do it. (For the
 * record, `react-native-svg` 15.12.1 *is* in `expo/bundledNativeModules.json`,
 * so it ships in Expo Go and would have been available — it just isn't needed.)
 *
 * Each renders at the exact size the design specifies rather than scaling from
 * a nominal box: the sizes differ per icon (21×15 for the book, 13 for the
 * magnifier) because they are optically matched, not set on a grid. `scale`
 * exists for the rare case that needs one bigger, and multiplies everything
 * including the stroke, so the hairline stays proportional.
 */

interface IconProps {
  color: string
  /** Multiplies every dimension *and* the stroke. Default 1 = the specced size. */
  scale?: number
  style?: ViewStyle
}

/** 21×15 rounded rect, 1.4px border, r4, plus a 1.4px vertical spine at 50%. */
export function BookIcon({ color, scale = 1, style }: IconProps) {
  const w = 21 * scale
  const h = 15 * scale
  const stroke = 1.4 * scale
  return (
    <View style={[{ width: w, height: h }, style]}>
      <View
        style={{
          width: w,
          height: h,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: 4 * scale,
        }}
      />
      {/* The spine. Centred by position rather than by flex so it lands on the
          exact 50% the design asks for regardless of the stroke's own width. */}
      <View
        style={{
          position: 'absolute',
          left: w / 2 - stroke / 2,
          top: 0,
          width: stroke,
          height: h,
          backgroundColor: color,
        }}
      />
    </View>
  )
}

/** 13px circle, 1.4px border, plus a 6×1.4px handle at bottom-right rotated 45°. */
export function MagnifierIcon({ color, scale = 1, style }: IconProps) {
  const d = 13 * scale
  const stroke = 1.4 * scale
  const handle = 6 * scale
  // The handle leaves the circle on the 45° diagonal, so its origin is the
  // circle's own radius projected onto both axes — not the bounding box corner,
  // which would leave a visible gap between the two.
  const offset = d / 2 + (d / 2) * Math.SQRT1_2 - stroke / 2
  return (
    <View style={[{ width: d + handle * 0.8, height: d + handle * 0.8 }, style]}>
      <View
        style={{
          width: d,
          height: d,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: d / 2,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: offset,
          top: offset,
          width: handle,
          height: stroke,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  )
}

/** 18×16 rect r4, a full-width 1.4px rule 3px from the top, two 4px legs above. */
export function CalendarIcon({ color, scale = 1, style }: IconProps) {
  const w = 18 * scale
  const h = 16 * scale
  const stroke = 1.4 * scale
  const leg = 4 * scale
  return (
    <View style={[{ width: w, height: h + leg * 0.5, paddingTop: leg * 0.5 }, style]}>
      {/* The two binding legs, drawn above the body so they read as rings
          rather than as ticks inside it. */}
      <View style={[styles.legs, { width: w, top: 0, paddingHorizontal: 4 * scale }]}>
        <View style={{ width: stroke, height: leg, backgroundColor: color }} />
        <View style={{ width: stroke, height: leg, backgroundColor: color }} />
      </View>
      <View
        style={{
          width: w,
          height: h,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: 4 * scale,
        }}
      >
        {/* The header rule. Inset by the body's own stroke so it meets both
            sides cleanly instead of overhanging them. */}
        <View
          style={{
            position: 'absolute',
            left: -stroke,
            right: -stroke,
            top: 3 * scale,
            height: stroke,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  )
}

/**
 * 10×9 half-round handle over a 1.4px body, radius `3 3 7 7`.
 *
 * The design calls the body a trapezoid. It is drawn here as a rounded
 * rectangle whose bottom corners are more than twice as round as its top ones,
 * which is what produces the taper you actually read as a basket — a true
 * trapezoid outline needs a clip path, and at 15px the difference is invisible
 * while the radii are exactly as specified.
 */
export function BasketIcon({ color, scale = 1, style }: IconProps) {
  const stroke = 1.4 * scale
  const handleW = 10 * scale
  const handleH = 9 * scale
  const bodyW = 17 * scale
  const bodyH = 11 * scale
  return (
    <View style={[{ width: bodyW, height: handleH + bodyH - stroke, alignItems: 'center' }, style]}>
      {/* Half-round: only the top half of the loop is drawn, so the body's own
          top edge closes it rather than a second line crossing it. */}
      <View
        style={{
          width: handleW,
          height: handleH,
          borderWidth: stroke,
          borderBottomWidth: 0,
          borderColor: color,
          borderTopLeftRadius: handleW / 2,
          borderTopRightRadius: handleW / 2,
        }}
      />
      <View
        style={{
          width: bodyW,
          height: bodyH,
          borderWidth: stroke,
          borderColor: color,
          borderTopLeftRadius: 3 * scale,
          borderTopRightRadius: 3 * scale,
          borderBottomLeftRadius: 7 * scale,
          borderBottomRightRadius: 7 * scale,
        }}
      />
    </View>
  )
}

/**
 * 15×7 open tray, a 1.2px vertical stem, and a 9px chevron rotated 45°.
 *
 * `stroke` is separable from `scale` on this icon alone, because it is the one
 * that gets drawn at more than one size: it sits inside the masthead's 44pt
 * ring, which needs the geometry grown but the hairline held at the same 1.2 the
 * ring itself uses. Left unset it behaves exactly as before, scaling with
 * everything else.
 */
export function ShareIcon({
  color,
  scale = 1,
  stroke = 1.2 * scale,
  style,
}: IconProps & { stroke?: number }) {
  const w = 15 * scale
  const trayH = 7 * scale
  const stem = 8 * scale
  const chevron = 9 * scale
  return (
    <View style={[{ width: w, height: trayH + stem, alignItems: 'center' }, style]}>
      {/* Two borders only — the tray is open at the top, which is what makes it
          read as something being lifted out of rather than a box. */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: w,
          height: trayH,
          borderWidth: stroke,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: 2 * scale,
          borderBottomRightRadius: 2 * scale,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: chevron * 0.32,
          width: stroke,
          height: stem,
          backgroundColor: color,
        }}
      />
      {/* Half a square, rotated — the two remaining borders form the arrowhead. */}
      <View
        style={{
          position: 'absolute',
          top: chevron * 0.32,
          width: chevron * 0.62,
          height: chevron * 0.62,
          borderTopWidth: stroke,
          borderLeftWidth: stroke,
          borderColor: color,
          transform: [{ rotate: '45deg' }],
        }}
      />
    </View>
  )
}

/** 16×12 rect r2 with a concentric 7px circle. */
export function CameraIcon({ color, scale = 1, style }: IconProps) {
  const w = 16 * scale
  const h = 12 * scale
  const stroke = 1.4 * scale
  const lens = 7 * scale
  return (
    <View
      style={[
        {
          width: w,
          height: h,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: 2 * scale,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <View
        style={{
          width: lens,
          height: lens,
          borderWidth: stroke,
          borderColor: color,
          borderRadius: lens / 2,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  legs: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between' },
})

/**
 * The filter mark on the dish row's "All dishes" chip: three rules, 13 · 9 · 5,
 * 1.2px each, 3px apart.
 *
 * A funnel is the usual glyph and it is wrong for this page — a filled or
 * outlined funnel is a *shape*, and every other mark in this system is a
 * construction of the same rules the page itself is drawn with. Three
 * shortening lines say "narrowed" in the material the app already uses.
 *
 * The stroke is 1.2 rather than the file's usual 1.4 because this one sits
 * inside a 34pt chip beside 12pt type rather than on a 44pt ring.
 */
export function FilterIcon({ color, scale = 1, style }: IconProps) {
  const stroke = 1.2 * scale
  const widths = [13, 9, 5].map((w) => w * scale)
  return (
    <View style={[{ gap: 3 * scale, alignItems: 'flex-start' }, style]}>
      {widths.map((width, i) => (
        <View key={i} style={{ width, height: stroke, backgroundColor: color }} />
      ))}
    </View>
  )
}
