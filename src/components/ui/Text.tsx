import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native'
import type { TextProps as RNTextProps, TextInputProps, TextStyle } from 'react-native'
import { maxFontSizeMultiplierFor } from '@/lib/fontScale'

/**
 * The app's `Text` and `TextInput`, which exist for exactly one reason: **to
 * bound OS font scaling**.
 *
 * React Native's `Text` defaults `allowFontScaling` to true (`Text.js`:
 * `allowFontScaling !== false`), so every size in `theme/typography.ts` is
 * multiplied at render by whatever the phone's Display → Text Size slider says.
 * Nothing else in the layout moves with it, so type that fits on the reviewer's
 * phone is clipped on the reader's. `lib/fontScale.ts` carries the clamp and
 * the reasoning behind its shape; this module is only the wiring.
 *
 * **Import `Text` from here, never from `react-native`.** There is no global
 * default to fall back on: React 19 dropped `defaultProps` for function
 * components, and RN's `Text` reads the prop straight off `props` with no
 * `defaultProps` of its own, so the usual `Text.defaultProps = …` shim is
 * silently inert on this stack. A wrapper is the only thing that actually
 * applies app-wide.
 *
 * `fontSize` is read off the flattened style, so the clamp needs no cooperation
 * from the call site and can't drift from the token the text is actually set
 * in. A call site that knows its container better can still pass its own
 * `maxFontSizeMultiplier` and this gets out of the way — `TabBar` and
 * `RecipeForm`'s step indicator both do, being fixed columns with no room.
 */

/** Pull `fontSize` out of any style shape a call site might pass. */
function fontSizeOf(style: unknown): number | undefined {
  const flat = StyleSheet.flatten(style as TextStyle | undefined)
  return flat?.fontSize
}

// `ref` is declared explicitly rather than reached for through `forwardRef`:
// React 19 passes it to function components as an ordinary prop, and RN's own
// prop types don't carry it. `grocery.tsx` focuses its composer field this way.
export type TextProps = RNTextProps & { ref?: React.Ref<RNText> }

export function Text({ style, maxFontSizeMultiplier, ...rest }: TextProps) {
  return (
    <RNText
      style={style}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? maxFontSizeMultiplierFor(fontSizeOf(style))}
      {...rest}
    />
  )
}

/**
 * The same clamp for `TextInput`, which scales on the identical default and
 * sits inside the app's tightest boxes — `Field`, `SearchBar`, and the three
 * bare inputs in `RecipeForm`'s ingredient row, which is one line by design and
 * has nowhere to grow.
 */
export type AppTextInputProps = TextInputProps & { ref?: React.Ref<RNTextInput> }

export function TextInput({ style, maxFontSizeMultiplier, ...rest }: AppTextInputProps) {
  return (
    <RNTextInput
      style={style}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? maxFontSizeMultiplierFor(fontSizeOf(style))}
      {...rest}
    />
  )
}
