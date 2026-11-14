import type { StringKey } from '@/i18n/strings'

const CODES: Record<string, StringKey> = {
  invalid_credentials: 'error.auth.invalidCredentials',
  email_exists: 'error.auth.emailTaken',
  user_already_exists: 'error.auth.emailTaken',
  weak_password: 'error.auth.passwordTooShort',
  email_address_invalid: 'error.auth.invalidEmail',
  email_address_not_authorized: 'error.auth.emailDeliveryUnavailable',
  email_not_confirmed: 'error.auth.emailNotConfirmed',
  over_email_send_rate_limit: 'error.auth.rateLimited',
  over_request_rate_limit: 'error.auth.rateLimited',
}

const PATTERNS: [string, StringKey][] = [
  ['invalid login credentials', 'error.auth.invalidCredentials'],
  ['already registered', 'error.auth.emailTaken'],
  ['user already exists', 'error.auth.emailTaken'],
  ['password should be at least', 'error.auth.passwordTooShort'],
  ['unable to validate email', 'error.auth.invalidEmail'],
  ['invalid email', 'error.auth.invalidEmail'],
  ['email address not authorized', 'error.auth.emailDeliveryUnavailable'],
  ['email not confirmed', 'error.auth.emailNotConfirmed'],
  ['rate limit', 'error.auth.rateLimited'],
  ['security purposes', 'error.auth.rateLimited'],
  ['network', 'error.network'],
  ['failed to fetch', 'error.network'],
  ['fetch failed', 'error.network'],
]

/** Keep provider details for classification, but display only translated app copy. */
export function authErrorKey(error: unknown): StringKey {
  if (!error || typeof error !== 'object') return 'error.generic'
  const details = error as { code?: unknown; status?: unknown; message?: unknown }
  if (details.status === 429) return 'error.auth.rateLimited'
  if (typeof details.code === 'string' && CODES[details.code]) return CODES[details.code]
  const message = typeof details.message === 'string' ? details.message.toLowerCase() : ''
  return PATTERNS.find(([match]) => message.includes(match))?.[1] ?? 'error.generic'
}
