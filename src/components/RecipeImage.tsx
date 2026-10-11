import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { Image, type ImageProps } from 'expo-image'
import { useAuth } from '@/context/AuthContext'
import { resolvePhoto } from '@/lib/api'
import { isStoredPhoto, type SignedPhoto } from '@/lib/photoAccess'

/** Public library images pass through. User uploads never fall back to public URLs. */
export default function RecipeImage({ source, ...props }: ImageProps) {
  const { token } = useAuth()
  const uri = typeof source === 'string' ? source : source && !Array.isArray(source) && typeof source === 'object' && 'uri' in source ? source.uri : undefined
  const managed = !!uri && isStoredPhoto(uri, process.env.EXPO_PUBLIC_SUPABASE_URL)
  const [photo, setPhoto] = useState<(SignedPhoto & { token: string }) | null>(null)

  useEffect(() => {
    if (!managed || !uri || !token) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      try {
        const next = await resolvePhoto(uri, token)
        if (cancelled) return
        setPhoto({ ...next, token })
        clearTimeout(timer)
        timer = setTimeout(() => { void refresh() }, Math.max(1000, next.expiresAt - Date.now() - 55_000))
      } catch {
        if (!cancelled) {
          // Keep an already loaded image during an outage; retry without an
          // unbounded render/error loop and without exposing a public fallback.
          clearTimeout(timer)
          timer = setTimeout(() => { void refresh() }, 30_000)
        }
      }
    }
    void refresh()
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh()
    })
    return () => { cancelled = true; clearTimeout(timer); listener.remove() }
  }, [managed, uri, token])

  const resolved = managed
    ? photo && photo.source === uri && photo.token === token ? { uri: photo.url } : undefined
    : source
  return <Image {...props} source={resolved} recyclingKey={managed ? `${token}:${uri}` : props.recyclingKey} cachePolicy={managed ? 'memory' : props.cachePolicy} />
}
