import { Platform } from 'react-native'
import { supabase, supabasePublishableKey, supabaseUrl } from '@/lib/supabase'

export const googleAuthEnabled =
  Platform.OS === 'web' && (__DEV__ || process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === 'true')

const callbackPath = '/auth/callback'
const attemptKey = 'recipe-book-google-auth'

type GoogleAuthIntent =
  | { destination: '/login' | '/signup' }
  | { destination: '/profile'; userId: string }

type GoogleAuthAttempt = GoogleAuthIntent & { flowId: string }

type GoogleAuthResult = {
  destination: GoogleAuthIntent['destination'] | '/'
  error?: ReturnType<typeof googleAuthErrorKey> | 'auth.google.restart'
}

export function googleAuthErrorKey(code: unknown) {
  switch (code) {
    case 'access_denied':
    case 'user_cancelled':
      return 'auth.google.cancelled'
    case 'identity_already_exists':
      return 'auth.google.alreadyLinked'
    case 'provider_disabled':
    case 'manual_linking_disabled':
      return 'auth.google.unavailable'
    case 'secure_context_required':
      return 'auth.google.secureContext'
    default:
      return 'auth.google.failed'
  }
}

export async function startGoogleAuth(intent: GoogleAuthIntent) {
  if (!googleAuthEnabled) return
  if (!window.isSecureContext) throw { code: 'secure_context_required' }

  // Starting OAuth constructs a URL without checking the provider. Check
  // first so disabled projects keep users on the form with a translated error.
  if (intent.destination !== '/profile') {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabasePublishableKey ?? '' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) throw new Error('Could not read Supabase auth settings')
    const settings = await response.json()
    if (!settings.external?.google) throw { code: 'provider_disabled' }
  }

  // Remember the verifier's flow ID in this tab. The SDK keeps the verifier
  // itself, and the redirect allowlist can match the callback's exact path.
  window.sessionStorage.removeItem(attemptKey)
  const options = {
    redirectTo: new URL(callbackPath, window.location.origin).href,
    queryParams: { prompt: 'select_account' },
    skipBrowserRedirect: true,
  }
  const credentials = { provider: 'google' as const, options }
  const { data, error } = intent.destination === '/profile'
    ? await supabase.auth.linkIdentity(credentials)
    : await supabase.auth.signInWithOAuth(credentials)
  if (error) throw error
  if (!data.url || !data.flowId) throw new Error('Missing Google authorization URL or PKCE flow ID')

  const attempt: GoogleAuthAttempt = { ...intent, flowId: data.flowId }
  window.sessionStorage.setItem(attemptKey, JSON.stringify(attempt))
  window.location.assign(data.url)
}

export async function finishGoogleAuth(): Promise<GoogleAuthResult> {
  let destination: GoogleAuthIntent['destination'] = '/login'

  try {
    const url = new URL(window.location.href)
    // GoTrue can return OAuth errors in the fragment or the query string.
    const fragment = new URLSearchParams(url.hash.slice(1))
    window.history.replaceState(window.history.state, '', callbackPath)

    const stored = window.sessionStorage.getItem(attemptKey)
    window.sessionStorage.removeItem(attemptKey)
    const attempt = stored ? JSON.parse(stored) as GoogleAuthAttempt : null
    if (attempt?.destination === '/profile' || attempt?.destination === '/signup') {
      destination = attempt.destination
    }

    const error = url.searchParams.get('error_code') ?? fragment.get('error_code')
      ?? url.searchParams.get('error') ?? fragment.get('error')
    if (error) return { destination, error: googleAuthErrorKey(error) }

    const code = url.searchParams.get('code')
    if (!code || !attempt?.flowId) return { destination, error: 'auth.google.restart' }

    if (attempt.destination === '/profile') {
      const { data } = await supabase.auth.getSession()
      if (!attempt.userId || data.session?.user.id !== attempt.userId) {
        return { destination, error: 'auth.google.restart' }
      }
    }

    const result = await supabase.auth.exchangeCodeForSession(code, { flowId: attempt.flowId })
    if (result.error) {
      const key = result.error.name === 'AuthPKCECodeVerifierMissingError'
        ? 'auth.google.restart'
        : googleAuthErrorKey(result.error.code)
      return { destination, error: key }
    }

    if (attempt.destination === '/profile') {
      if (result.data.user.id !== attempt.userId) {
        await supabase.auth.signOut({ scope: 'local' })
        return { destination: '/login', error: 'auth.google.failed' }
      }
      if (!result.data.user.identities?.some(identity => identity.provider === 'google')) {
        return { destination, error: 'auth.google.failed' }
      }
    }

    return { destination: attempt.destination === '/profile' ? '/profile' : '/' }
  } catch {
    return { destination, error: 'auth.google.failed' }
  }
}
