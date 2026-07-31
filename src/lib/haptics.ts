import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

/**
 * Haptics, wrapped so call sites don't have to think about the two ways this
 * fails.
 *
 * The app runs on web, where there is no haptic engine at all, and on Android
 * devices where the user may have system vibration switched off — either way
 * the promise can reject, and an unhandled rejection from a *decorative* effect
 * shouldn't reach the console, let alone a screen. Nothing here is awaited: the
 * feedback either happens now or is worthless.
 */
export function openMenuFeedback() {
  if (Platform.OS === 'web') return
  // Medium is what a long-press context menu feels like on iOS — Light reads as
  // an accidental brush, Heavy as an error.
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
}

/**
 * Fired the moment a pull-to-refresh commits, not while you're dragging.
 *
 * Light on purpose: this one is confirming a gesture you're mid-way through, so
 * it should feel like the click of a switch. The same Medium as the long-press
 * menu would feel like something went wrong.
 */
export function refreshFeedback() {
  if (Platform.OS === 'web') return
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}
