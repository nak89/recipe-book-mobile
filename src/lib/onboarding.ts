import { useCallback, useEffect, useSyncExternalStore } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'onboarding.seenIntro'

/**
 * Whether this device has shown the two pre-auth screens — the language picker
 * and "what it does".
 *
 * Device-local on purpose, and it's the one piece of onboarding state that is:
 * both run *before* there is an account, so there's no `user_metadata` to write
 * to. Everything after sign-up — the display name, the starter packs — hangs off
 * `user_metadata.onboardedAt` instead, because those have account-level effects
 * and a device flag would let a second phone repeat them.
 *
 * The practical consequence is that reinstalling shows them again even to an
 * existing user. That's acceptable: they land on sign-in one tap later, and the
 * alternative is a network round-trip before the first frame.
 *
 * ## Why this is a store and not `useState`
 *
 * Two components read it — `about.tsx`, which marks it seen, and the `(auth)`
 * layout, which redirects to the picker until it is. With per-instance state the
 * layout never observes the write, so navigating away from `/language`
 * immediately redirects straight back to it and the user is trapped in a
 * two-screen loop with no way into the app. One module-level value with
 * subscribers is what keeps the writer and the guard looking at the same thing.
 */
let seen: boolean | null = null
let started = false
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function load() {
  if (started) return
  started = true
  AsyncStorage.getItem(STORAGE_KEY)
    .then((stored) => {
      seen = stored === 'true'
      emit()
    })
    .catch(() => {
      // Unreadable storage shouldn't strand anyone in front of a carousel they
      // can't get past. Treat it as seen and let them go and sign in.
      seen = true
      emit()
    })
}

/**
 * Puts the carousel back, for the dev reset on the profile screen.
 *
 * A plain function rather than part of the hook because the caller doesn't want
 * the value, only the write — and it publishes through the same store, so the
 * `(auth)` guard sees the change immediately and routes to `/intro` instead of
 * `/login` the moment the session goes.
 */
export async function resetSeenIntro() {
  seen = false
  emit()
  await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {})
}

/**
 * Marks the pre-auth screens done, from either of `about.tsx`'s two exits.
 *
 * A standalone function rather than the hook's `markSeen` because the caller
 * wants only the write, and because both exits have to go through one place —
 * "Skip" and "Carry on" leaving by different routes is how one of them ends up
 * not writing the flag and looping the user back to the picker.
 *
 * It publishes to the store **before** awaiting the disk write, so a caller that
 * navigates immediately still finds the guard up to date.
 */
export async function markIntroSeen() {
  seen = true
  emit()
  await AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {})
}

export function useSeenIntro() {
  // Three states, and `null` is load-bearing: it means "not read yet", which is
  // not the same as "not seen". Acting on `false` before the read resolves would
  // flash the carousel at someone who has already dismissed it.
  const value = useSyncExternalStore(
    subscribe,
    () => seen,
    () => seen
  )

  useEffect(load, [])

  const markSeen = useCallback(() => {
    // Publish first, persist after — navigation away from the carousel must not
    // wait on a disk write, and losing that race only costs one extra viewing in
    // a case that already requires storage to be failing.
    seen = true
    emit()
    AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {})
  }, [])

  return { seen: value, markSeen }
}
