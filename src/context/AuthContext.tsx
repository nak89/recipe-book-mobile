import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  token: string | null
  loading: boolean
  email: string | null
  /** Never null once signed in — falls back to the email's local part. */
  displayName: string
  memberSince: Date | null
  /** False until the post-signup flow (name, packs, tutorial) has been finished or skipped. */
  onboarded: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
  completeOnboarding: () => Promise<void>
  /** Dev only — see the reset button on the profile screen. */
  resetOnboarding: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Cap on the display name, shared by the onboarding step and the profile
 * editor. Long enough for any real name, short enough that `initials()` and the
 * profile header still lay out. It lives here because this is what owns the
 * name — two literals in two screens is exactly the pair that drifts.
 */
export const MAX_NAME_LENGTH = 40

/**
 * There is no `User` table — Supabase Auth owns identity — so the display name
 * lives in `user_metadata`. That keeps it a pure auth-layer change: no Prisma
 * migration, no backend route, and it rides along on the session the app
 * already holds.
 */
function nameFromSession(session: Session | null): string {
  const email = session?.user.email ?? ''
  const stored = session?.user.user_metadata?.displayName
  if (typeof stored === 'string' && stored.trim()) return stored.trim()
  return email.split('@')[0] || 'there'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
  }

  /**
   * Sign-up now carries the display name, because the form now asks for it.
   *
   * It goes in `signUp`'s own `options.data` rather than in a follow-up
   * `updateUser`, and that is what closes a real gap: a second call can fail on
   * its own, leaving an account that exists with no name on it and a user
   * looking at a dashboard that greets them by the local part of their email.
   * One call means the account is either created named or not created.
   */
  async function signup(email: string, password: string, name?: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: name ? { data: { displayName: name.trim() } } : undefined,
    })
    if (error) throw new Error(error.message)
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function updateDisplayName(name: string) {
    const { data, error } = await supabase.auth.updateUser({
      data: { displayName: name.trim() },
    })
    if (error) throw new Error(error.message)
    // updateUser also emits USER_UPDATED, but setting it here means the profile
    // screen re-renders immediately rather than a tick later.
    setSession((current) => (current && data.user ? { ...current, user: data.user } : current))
  }

  /**
   * Marks the post-signup flow done. Called on *finish and on skip* — skipping
   * is a decision, not a deferral, and re-offering it on the next launch would
   * make it a nag.
   *
   * Supabase merges `data` into the existing `user_metadata` rather than
   * replacing it, which is what lets this write `onboardedAt` without clobbering
   * `displayName` set two screens earlier.
   */
  async function completeOnboarding() {
    const { data, error } = await supabase.auth.updateUser({
      data: { onboardedAt: new Date().toISOString() },
    })
    if (error) throw new Error(error.message)
    setSession((current) => (current && data.user ? { ...current, user: data.user } : current))
  }

  /**
   * The inverse, for the dev reset button — puts the account back to never
   * having been through the flow.
   *
   * `null` rather than omitting the key, for the same reason the recipe routes
   * send `null` for a cleared nutrition field: a merge treats an absent key as
   * "leave it alone", so only an explicit null actually clears it. `onboarded`
   * reads it through `Boolean()`, so null and absent are then the same thing.
   */
  async function resetOnboarding() {
    const { data, error } = await supabase.auth.updateUser({
      data: { onboardedAt: null },
    })
    if (error) throw new Error(error.message)
    setSession((current) => (current && data.user ? { ...current, user: data.user } : current))
  }

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      token: session?.access_token ?? null,
      loading,
      email: session?.user.email ?? null,
      displayName: nameFromSession(session),
      memberSince: session?.user.created_at ? new Date(session.user.created_at) : null,
      // Absence is the whole gate: an account that has never finished the flow
      // has no `onboardedAt`, and so does one that force-quit halfway through.
      // Both should see it, so both are treated the same.
      onboarded: Boolean(session?.user.user_metadata?.onboardedAt),
      login,
      signup,
      logout,
      updateDisplayName,
      completeOnboarding,
      resetOnboarding,
    }),
    [session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
