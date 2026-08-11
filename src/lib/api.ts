import { Platform } from 'react-native'
import type { Mealtime, PlanSlot, Recipe, RecipeInput } from '@/types/recipe'

const API_URL = process.env.EXPO_PUBLIC_API_URL

export interface FieldIssue {
  /** Dotted path from the server's zod error, e.g. `title`, `ingredients.0.name`. */
  field: string
  message: string
}

/**
 * Carries the status and the server's per-field issues, not just a message.
 * A form needs both: 409 means "duplicate title" and belongs on the title
 * field, and a 400's `details` say exactly which input the server rejected.
 */
export class ApiError extends Error {
  status: number
  details: FieldIssue[]

  constructor(message: string, status: number, details: FieldIssue[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  if (!API_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_URL — set it in .env')
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.error ?? 'Request failed', res.status, body?.details ?? [])
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export function getRecipes(token: string) {
  return request<Recipe[]>('/recipes', token)
}

export function getRecipe(id: string, token: string) {
  return request<Recipe>(`/recipes/${id}`, token)
}

export function createRecipe(data: RecipeInput, token: string) {
  return request<Recipe>('/recipes', token, { method: 'POST', body: JSON.stringify(data) })
}

export function updateRecipe(id: string, data: RecipeInput, token: string) {
  return request<Recipe>(`/recipes/${id}`, token, { method: 'PUT', body: JSON.stringify(data) })
}

export function deleteRecipe(id: string, token: string) {
  return request<void>(`/recipes/${id}`, token, { method: 'DELETE' })
}

// Dedicated endpoint rather than a full PUT — favouriting shouldn't have to
// round-trip (and re-create) every ingredient and step row.
export function setFavourite(id: string, isFavourite: boolean, token: string) {
  return request<Recipe>(`/recipes/${id}/favourite`, token, {
    method: 'PATCH',
    body: JSON.stringify({ isFavourite }),
  })
}

/**
 * The meal planner. A slot is addressed by `(date, mealtime)`, so filling one is
 * an idempotent PUT to a known address rather than a POST — two taps on the same
 * slot leave one row, which is what makes the screen's optimistic writes safe.
 *
 * `date` is a `YYYY-MM-DD` string in both directions. Don't hand these functions
 * a `Date`: `toISOString()` on a local-midnight Date returns the *previous* day
 * anywhere west of UTC, which is exactly the bug the column type exists to
 * prevent. Use `toDateKey` from `lib/week.ts`.
 */
export function getPlan(from: string, to: string, token: string) {
  return request<PlanSlot[]>(`/meal-plan?from=${from}&to=${to}`, token)
}

export function setPlanSlot(date: string, mealtime: Mealtime, recipeId: string, token: string) {
  return request<PlanSlot>(`/meal-plan/${date}/${mealtime}`, token, {
    method: 'PUT',
    body: JSON.stringify({ recipeId }),
  })
}

export function clearPlanSlot(date: string, mealtime: Mealtime, token: string) {
  return request<void>(`/meal-plan/${date}/${mealtime}`, token, { method: 'DELETE' })
}

/** A starter pack as onboarding's picker needs it — no recipe bodies, by design. */
export interface StarterPackSummary {
  id: string
  name: string
  emoji: string
  blurb: string
  /**
   * Khmer card copy. The endpoint returns both languages and the client picks,
   * so the API stays stateless about language — the same reason the preference
   * never leaves the device.
   *
   * `sampleTitles` has no Khmer counterpart on purpose: those are recipe titles,
   * and the fifteen pack recipes are deliberately not translated.
   */
  nameKm: string
  blurbKm: string
  count: number
  sampleTitles: string[]
}

export function getStarterPacks(token: string) {
  return request<StarterPackSummary[]>('/starter-packs', token)
}

/**
 * Sends pack *ids*, never recipes. Fifteen recipe bodies would blow past the
 * server's 100kb body limit, and ids keep the whole import to one transaction
 * instead of fifteen requests that could fail halfway through.
 *
 * `skipped` counts titles the account already had. Re-importing is deliberately
 * a no-op rather than an error, so someone who quits mid-onboarding and comes
 * back doesn't hit a wall of duplicate-title failures.
 */
export function importStarterPacks(packIds: string[], token: string) {
  return request<{ imported: number; skipped: number }>('/recipes/import', token, {
    method: 'POST',
    body: JSON.stringify({ packIds }),
  })
}

// Uploads a picked photo (local file uri) to the backend, which stores it
// and returns a hosted URL to save as the recipe's photoUrl.
export async function uploadPhoto(uri: string, token: string): Promise<string> {
  if (!API_URL) {
    throw new Error('Missing EXPO_PUBLIC_API_URL — set it in .env')
  }
  const formData = new FormData()

  if (Platform.OS === 'web') {
    // On web the picker hands back a blob:/data: uri — the uri/name/type shape
    // below is React Native only and would serialise to "[object Object]".
    const blob = await fetch(uri).then((r) => r.blob())
    const type = blob.type || 'image/jpeg'
    const extension = type.split('/')[1] ?? 'jpg'
    formData.append('photo', blob, `photo.${extension}`)
  } else {
    const filename = uri.split('/').pop() ?? 'photo.jpg'
    const match = /\.(\w+)$/.exec(filename)
    const type = match ? `image/${match[1]}` : 'image/jpeg'
    // React Native's fetch accepts this uri/name/type shape for file parts.
    formData.append('photo', { uri, name: filename, type } as unknown as Blob)
  }

  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    // No Content-Type — the runtime sets it with the multipart boundary.
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.error ?? 'Failed to upload photo', res.status, body?.details ?? [])
  }
  const data = await res.json()
  return data.url
}
