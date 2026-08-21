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

/**
 * Fired when the favourite heart is tapped — on the press, next to the
 * optimistic flip, not after the request lands.
 *
 * The heart already fills under your finger and rolls back if the save fails,
 * so waiting on the server would put the buzz a beat behind the thing it is
 * confirming. Light because this is a toggle people hit repeatedly; anything
 * heavier stops being satisfying and starts being tiring.
 *
 * Both toggle handlers call this — the dashboard's covers the two card variants
 * *and* the action sheet, the detail screen's covers the hero. That's all three
 * hearts, and keeping the call beside the state change is what stops the buzz
 * and the fill drifting apart.
 */
export function favouriteFeedback() {
  if (Platform.OS === 'web') return
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

/**
 * Onboarding: advancing a carousel slide, and picking a starter pack.
 *
 * `selectionAsync` rather than an impact, because nothing is being *hit* — the
 * user is moving through a set of options, which is the exact case iOS's
 * selection feedback exists for. It is noticeably lighter than
 * `ImpactFeedbackStyle.Light`, which matters on a screen that can fire it three
 * times in as many seconds.
 */
export function selectionFeedback() {
  if (Platform.OS === 'web') return
  Haptics.selectionAsync().catch(() => {})
}

/**
 * Picking a row up to reorder it, and putting it back down.
 *
 * A drag has two moments worth marking and they are not the same moment. The
 * pickup is the one that needs to be felt: the gesture activates after a few
 * pixels of travel, with no press-and-hold to tell you it took, so without a
 * buzz the row simply starts moving and you learn you have it by watching. The
 * drop is a confirmation of something you can already see land, so it is the
 * lighter of the two — `selectionAsync`, the same feedback the carousel uses
 * for moving between options, because that is what a drop is.
 */
export function grabFeedback() {
  if (Platform.OS === 'web') return
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}

/** The other half of `grabFeedback` — see the note there. */
export function dropFeedback() {
  if (Platform.OS === 'web') return
  Haptics.selectionAsync().catch(() => {})
}
