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
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

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

  async function signup(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password })
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

  const value = useMemo<AuthContextType>(
    () => ({
      session,
      token: session?.access_token ?? null,
      loading,
      email: session?.user.email ?? null,
      displayName: nameFromSession(session),
      memberSince: session?.user.created_at ? new Date(session.user.created_at) : null,
      login,
      signup,
      logout,
      updateDisplayName,
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
