import { ApiError } from '@/lib/api'
import type { StringKey } from './strings'

/**
 * Maps the two kinds of English error text the app can receive onto translation
 * keys.
 *
 * Neither source is ours to change. Supabase Auth is called directly from
 * `AuthContext`, so its messages arrive as plain English `Error.message`; and the
 * Express API's messages are shaped for a developer reading a response body, not
 * for a cook reading a failed save.
 *
 * ## Why map rather than translate on the server
 *
 * The backend would have to grow a wire-format change and the e2e suite asserts
 * on the current response shape. Mapping here costs one file and no coordination
 * — and the app already does something similar, pinning a 409 onto the title
 * field in `RecipeForm`.
 *
 * ## The fallback rule
 *
 * Anything unrecognised falls back to a **generic translated** message, never to
 * the original English. An error surfaces at the worst possible moment — a save
 * or a sign-in that just failed — which is precisely when a language the user
 * can't read is least forgivable. A vague message they can read beats a precise
 * one they can't.
 */

/**
 * Supabase Auth messages, matched loosely. Substring rather than equality
 * because these strings are Supabase's to reword, and a wording change should
 * degrade to the generic fallback rather than to raw English.
 */
const AUTH_PATTERNS: { match: string; key: StringKey }[] = [
  { match: 'invalid login credentials', key: 'error.auth.invalidCredentials' },
  { match: 'already registered', key: 'error.auth.emailTaken' },
  { match: 'user already exists', key: 'error.auth.emailTaken' },
  { match: 'password should be at least', key: 'error.auth.passwordTooShort' },
  { match: 'unable to validate email', key: 'error.auth.invalidEmail' },
  { match: 'invalid email', key: 'error.auth.invalidEmail' },
  { match: 'email not confirmed', key: 'error.auth.emailNotConfirmed' },
  { match: 'rate limit', key: 'error.tooManyRequests' },
  { match: 'network', key: 'error.network' },
]

/** A translation key for whatever came back from a sign-in or sign-up attempt. */
export function authErrorKey(error: unknown): StringKey {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  return AUTH_PATTERNS.find((p) => message.includes(p.match))?.key ?? 'error.generic'
}

/**
 * A translation key for a failed API call.
 *
 * Keyed off `ApiError.status`, which is structured data the server genuinely
 * commits to, rather than off its prose. The 409 case is the one worth naming:
 * it's the only error here a user can actually act on, and the form already
 * routes it onto the title field.
 */
export function apiErrorKey(error: unknown): StringKey {
  if (!(error instanceof ApiError)) return 'error.network'
  switch (error.status) {
    case 400:
      return 'error.api.invalid'
    case 401:
      return 'error.api.sessionExpired'
    case 403:
      return 'error.api.forbidden'
    case 404:
      return 'error.api.notFound'
    case 409:
      return 'error.api.titleTaken'
    case 413:
      return 'error.api.tooLarge'
    case 429:
      return 'error.tooManyRequests'
    default:
      return error.status >= 500 ? 'error.api.server' : 'error.generic'
  }
}
