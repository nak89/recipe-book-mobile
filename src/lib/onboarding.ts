import { useCallback, useEffect, useSyncExternalStore } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'onboarding.seenIntro'

/**
 * Whether this device has shown the pre-auth intro carousel.
 *
 * Device-local on purpose, and it's the one piece of onboarding state that is:
 * the carousel runs *before* there is an account, so there's no
 * `user_metadata` to write it to. Everything after sign-up — the name, the
 * starter packs, the tutorial — hangs off `user_metadata.onboardedAt` instead,
 * because those have account-level effects and a device flag would let a second
 * phone repeat them.
 *
 * The practical consequence is that reinstalling shows the carousel again even
 * to an existing user. That's acceptable: they land on login immediately after,
 * and the alternative is a network round-trip before the first frame.
 *
 * ## Why this is a store and not `useState`
 *
 * Two components read it — the carousel, which marks it seen, and the `(auth)`
 * layout, which redirects to the carousel until it is. With per-instance state
 * the layout never observes the carousel's write, so navigating away from
 * `/intro` immediately redirects straight back to it and the user is trapped.
 * One module-level value with subscribers is what keeps the writer and the
 * guard looking at the same thing.
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
 * Puts the carousel back, for the dev reset in the profile tab.
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
