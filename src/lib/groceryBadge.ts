import { useSyncExternalStore } from 'react'

/**
 * How many things are still to buy, for the dot on the Grocery tab.
 *
 * ## Why this is a store and not state or context
 *
 * Two components need it and they sit on opposite sides of the navigator: the
 * grocery screen computes it as it renders its list, and the tab bar draws it
 * — and the tab bar is the navigator's own chrome, mounted *outside* every
 * screen. A context would have to wrap the whole tab layout to reach both,
 * which puts a re-render of the navigator on every tick of a checkbox.
 *
 * This is the same shape `lib/onboarding.ts` uses, and for the same reason: a
 * value written by one component and read by another that isn't its child.
 *
 * The dot is tamarind. Under the old palette it was the alert red, one of two
 * saturated colours; Chronicle has exactly one accent, so "needs you" and
 * "selected" are now the same hue and are told apart by shape and position.
 */
let outstanding = 0
const listeners = new Set<() => void>()

/**
 * Publishes the count. Called by the grocery screen whenever its list changes.
 *
 * Bails when the value hasn't moved, because this runs inside a render effect
 * and an unconditional emit would re-render the tab bar on every keystroke in
 * the composer.
 */
export function setGroceryOutstanding(count: number) {
  if (count === outstanding) return
  outstanding = count
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useGroceryOutstanding(): number {
  return useSyncExternalStore(
    subscribe,
    () => outstanding,
    // Server snapshot, for react-native-web's SSR-shaped render path.
    () => outstanding
  )
}

// `requestGroceryComposer`/`useGroceryComposerRequests` retired with the dock's
// "+". They existed because that button lived in the navigator's chrome, on the
// far side of the navigator from the composer it opened. Market's masthead now
// carries its own "+", so the button and the composer are in one component and
// the store between them had nothing left to bridge.
