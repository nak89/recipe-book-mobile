import { Platform } from 'react-native'
import type { Recipe, RecipeInput } from '@/types/recipe'

const API_URL = process.env.EXPO_PUBLIC_API_URL

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
    throw new Error(body?.error ?? 'Request failed')
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
    throw new Error(body?.error ?? 'Failed to upload photo')
  }
  const data = await res.json()
  return data.url
}
