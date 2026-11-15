import { Platform } from 'react-native'

const pendingKey = 'recipe-book-share-after-login'
const pendingTimeout = 30 * 60 * 1000
let pending: { code: string; until: number } | undefined

export function isSharedRecipeCode(code: unknown): code is string {
  return typeof code === 'string' && /^[A-Za-z0-9_-]{43}$/.test(code)
}

export function sharedRecipeUrl(code: string) {
  const path = `/share/${code}`
  const origin = process.env.EXPO_PUBLIC_RECIPE_SHARE_ORIGIN
  if (origin) return new URL(path, origin).href
  if (Platform.OS === 'web') return new URL(path, window.location.origin).href
  if (__DEV__) {
    const url = new URL(path, process.env.EXPO_PUBLIC_API_URL)
    url.port = '8081'
    return url.href
  }
  throw new Error('Missing recipe share website')
}

export function rememberSharedRecipe(code: string) {
  pending = { code, until: Date.now() + pendingTimeout }
  if (Platform.OS === 'web') {
    try { window.sessionStorage.setItem(pendingKey, JSON.stringify(pending)) } catch {}
  }
}

export function pendingSharedRecipe() {
  if (!pending && Platform.OS === 'web') {
    try { pending = JSON.parse(window.sessionStorage.getItem(pendingKey) ?? 'null') ?? undefined } catch {}
  }
  if (!pending || !isSharedRecipeCode(pending.code) || !(pending.until > Date.now())) return
  return { pathname: '/share/[code]', params: { code: pending.code } } as const
}

export function clearPendingSharedRecipe() {
  pending = undefined
  if (Platform.OS === 'web') {
    try { window.sessionStorage.removeItem(pendingKey) } catch {}
  }
}
