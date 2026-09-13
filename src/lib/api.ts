import { File as FsFile } from 'expo-file-system'
import { Platform } from 'react-native'
import type { Difficulty, Mealtime, PlanSlot, Recipe, RecipeInput } from '@/types/recipe'
// Type-only, so the i18n barrel — and the React context inside it — never enters
// this module's runtime graph. `api.ts` is imported by every screen.
import type { LinePart } from '@/lib/grocery'

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

/** One aggregated line of the shopping list, derived from the week's plan. */
export interface GroceryLine {
  /** `foldedName|foldedUnit` — the address of this line's stored state. */
  key: string
  name: string
  unit: string
  /** The plan's own sum, before any correction the user typed over it. */
  planAmount: number
  /** What to show: the override if there is one, otherwise `planAmount`. */
  amount: number
  amountOverride: number | null
  ticked: boolean
  /**
   * `planAmount` broken back into the meals that made it, and only the meals
   * that contributed anything.
   *
   * This is what the "Today" scope and the dish chips both narrow by. A line is
   * a whole week of one ingredient and a total can't be taken back apart, so
   * without the pieces a filter has nothing to filter on — which is exactly why
   * the day chip used to do nothing at all. See `LinePart` in `lib/grocery.ts`
   * for why the two axes travel as one list rather than as two maps.
   */
  parts: LinePart[]
}

/**
 * A dish the week's plan was derived from — one chip in the filter row.
 *
 * De-duplicated by the server: the aggregation walks *slots*, so a dinner
 * planned twice is bought for twice, but it is still one chip to press.
 */
export interface GroceryDish {
  id: string
  title: string
  photoUrl: string | null
}

/** A manual "Added by you" item, which no recipe asked for. */
export interface GroceryItem {
  id: string
  name: string
  amount: number
  unit: string
  ticked: boolean
}

export interface GroceryList {
  from: string
  to: string
  lines: GroceryLine[]
  items: GroceryItem[]
  /** In first-planned order — the order the week reads in, not the alphabet. */
  dishes: GroceryDish[]
}

/**
 * The shopping list for a week of plan.
 *
 * Derived server-side on every read and never stored, so changing a dinner
 * changes the list — there is no rebuild step and nothing can go stale. What
 * *is* stored is the ticks, the hand-typed amount corrections and the manual
 * items, which the server merges in before replying.
 *
 * `from` must be the Monday: it doubles as the address every line's state row
 * is filed under. The screen narrows to "Today" or "Missing only" on its own
 * side rather than re-fetching, so the whole screen is one request.
 */
export function getGroceryList(from: string, to: string, token: string) {
  return request<GroceryList>(`/grocery?from=${from}&to=${to}`, token)
}

/**
 * Ticks a line, corrects its amount, or both.
 *
 * Omitting a field leaves it alone; passing `amountOverride: null` clears the
 * correction so the line goes back to reporting the plan's sum. That
 * distinction is the whole reason the field is nullable — see the note on the
 * nutrition columns, which set the same trap.
 */
export function setGroceryLine(
  weekStart: string,
  key: string,
  patch: { ticked?: boolean; amountOverride?: number | null },
  token: string
) {
  return request<Pick<GroceryLine, 'key' | 'ticked' | 'amountOverride'>>('/grocery/line', token, {
    method: 'PUT',
    body: JSON.stringify({ weekStart, key, ...patch }),
  })
}

export function addGroceryItem(
  weekStart: string,
  item: { name: string; amount: number; unit: string },
  token: string
) {
  return request<GroceryItem>('/grocery/items', token, {
    method: 'POST',
    body: JSON.stringify({ weekStart, ...item }),
  })
}

export function updateGroceryItem(
  id: string,
  patch: { name?: string; amount?: number; unit?: string; ticked?: boolean },
  token: string
) {
  return request<GroceryItem>(`/grocery/items/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function removeGroceryItem(id: string, token: string) {
  return request<void>(`/grocery/items/${id}`, token, { method: 'DELETE' })
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

/**
 * The shared library behind Explore. Eight Cambodian recipes by Chef Nak that
 * live on the server and are browsed rather than owned.
 *
 * **These are Khmer, and only Khmer.** The library used to travel in both
 * languages with the client picking; it no longer does — title, description,
 * headline, ingredients, steps, tools and cuisine are all Khmer on the server.
 * That is the app's ordinary content rule rather than an exception to it: the
 * toggle translates chrome and never content, and a recipe is content. An
 * English UI shows these in Khmer exactly as it shows a Khmer recipe the user
 * wrote themselves. See the note at the top of the backend's `data/library.ts`.
 *
 * `subject`, `mealtime` and `difficulty` are the exception, and are stored
 * English enum values the client labels through `i18n/labels.ts` — a chip
 * reading "បង្អែម" still filters on `'Sweets'`.
 */
export interface LibrarySummary {
  id: string
  /** Khmer. There is no English title. */
  title: string
  description: string
  photoUrl: string
  /**
   * The one ingredient that names the dish, for Explore's tile caption. Authored
   * on the server rather than derived — the browse payload carries no
   * ingredients, and the first row of a list is the biggest quantity rather than
   * the defining flavour.
   */
  headline: string
  /** One of the BY SUBJECT chips, or null for a recipe that fits none of them. */
  subject: LibrarySubject | null
  mealtime: Mealtime | null
  difficulty: Difficulty
  cuisine: string
  totalMinutes: number
  servings: number
  tools: string[]
}

/**
 * Four, not the design's five. `Noodles` is specified in SCREENS.md §11 but
 * every noodle recipe on chefnak.com is a video with no transcript, so the chip
 * would have rendered and returned nothing. Dropping it was the call rather than
 * writing Cambodian recipes that aren't Chef Nak's.
 */
export type LibrarySubject = 'Soups' | 'Grilled' | 'Sweets' | 'Festival'

export const LIBRARY_SUBJECTS: LibrarySubject[] = ['Soups', 'Grilled', 'Sweets', 'Festival']

export interface LibraryRecipe extends LibrarySummary {
  ingredients: { name: string; quantity: number; unit: string }[]
  steps: string[]
  /** Chef Nak's closing note, shown under the method. */
  note: string
  /** The chefnak.com page this came from — rendered as the attribution line. */
  source: string
  /** The caller's own copy, if they have taken one. Drives the CTA's two states. */
  savedRecipeId: string | null
}

export function getLibrary(token: string) {
  return request<{ recipes: LibrarySummary[]; savedIds: string[] }>('/library', token)
}

export function getLibraryRecipe(id: string, token: string) {
  return request<LibraryRecipe>(`/library/${id}`, token)
}

/**
 * Copies one library recipe into the caller's book.
 *
 * **No body.** It used to send `{ language }`, because the library shipped in
 * two and the language decided which title was stored. There is one title now,
 * so the recipe is addressed entirely by its URL.
 *
 * Idempotent on the server via `Recipe.libraryId`, so tapping twice leaves
 * exactly one recipe — and, more usefully, so does tapping again after you have
 * renamed your copy. That is the whole reason the column exists; a title check
 * would see the rename as a different recipe. Returns 409 only when the account
 * already wrote its *own* recipe under that title.
 */
export function copyLibraryRecipe(id: string, token: string) {
  return request<Recipe>(`/library/${id}/copy`, token, { method: 'POST' })
}

/**
 * Copies the whole library at once — onboarding's "Begin with eight classics".
 *
 * One request rather than eight, for the reason `importStarterPacks` is one:
 * each would otherwise cost its own live `supabase.auth.getUser()` round-trip,
 * with no atomicity across them.
 *
 * `skipped` counts what the account already had, by library id or by title.
 * Zero imported is a success, not an error — someone who quits partway through
 * onboarding and comes back re-runs this, and that is an ordinary path.
 */
export function importLibrary(token: string) {
  return request<{ imported: number; skipped: number }>('/library/import', token, {
    method: 'POST',
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
    // On web the picker hands back a blob:/data: uri, and fetch can read it into a
    // real Blob. The native branch below can't: there is no file:// support here and
    // RN's Blob won't take bytes, so the two platforms stay separate.
    const blob = await fetch(uri).then((r) => r.blob())
    const type = blob.type || 'image/jpeg'
    const extension = type.split('/')[1] ?? 'jpg'
    formData.append('photo', blob, `photo.${extension}`)
  } else {
    // The global fetch is Expo's WinterCG one as of SDK 57, and it rejects React
    // Native's legacy { uri, name, type } part outright — "Unsupported FormDataPart
    // implementation", asserted by a test of Expo's own. It takes a string, a real
    // Blob, or an object exposing bytes(); this is the third, the shape Expo's tests
    // call a FileBlob. Building a Blob instead is not an option: RN's Blob refuses to
    // be constructed from a Uint8Array.
    const file = new FsFile(uri)
    const filename = file.name || uri.split('/').pop() || 'photo.jpg'
    const match = /\.(\w+)$/.exec(filename)
    // name and type are spelled out rather than left to the File: they become the
    // part's filename and content-type, and the upload route rejects anything whose
    // mimetype isn't image/*, while File.type is documented to be '' for a file it
    // cannot read.
    const type = file.type || (match ? `image/${match[1]}` : 'image/jpeg')
    formData.append('photo', {
      name: filename,
      type,
      bytes: () => file.bytes(),
    } as unknown as Blob)
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
