export interface SignedPhoto { source: string; url: string; expiresAt: number }

export function isStoredPhoto(source: string, supabaseUrl: string | undefined): boolean {
  try {
    const url = new URL(source)
    return !!supabaseUrl && url.origin === new URL(supabaseUrl).origin &&
      url.pathname.startsWith('/storage/v1/object/public/')
  } catch { return false }
}

/** Batch simultaneous image mounts; cache only in memory and isolate sessions. */
export function createPhotoResolver(sign: (sources: string[], token: string) => Promise<SignedPhoto[]>) {
  type Waiting = { resolve: (photo: SignedPhoto) => void; reject: (error: unknown) => void }
  const session = (token: string) => ({ token, cache: new Map<string, Promise<SignedPhoto>>(), pending: new Map<string, Waiting>(), scheduled: false })
  let active = session('')
  return function resolve(source: string, token: string): Promise<SignedPhoto> {
    if (active.token !== token) active = session(token)
    const state = active
    const existing = state.cache.get(source)
    if (existing) return existing.then(photo => {
      if (photo.expiresAt > Date.now() + 60_000) return photo
      // Several rows can notice expiry together. Only remove the expired
      // promise, never a refresh another row already started.
      if (state.cache.get(source) === existing) state.cache.delete(source)
      return resolve(source, token)
    })
    if (state.cache.size >= 500) state.cache.delete(state.cache.keys().next().value!)
    const promise = new Promise<SignedPhoto>((resolve, reject) => state.pending.set(source, { resolve, reject }))
    state.cache.set(source, promise)
    if (!state.scheduled) {
      state.scheduled = true
      queueMicrotask(async () => {
        const batch = state.pending
        state.pending = new Map()
        state.scheduled = false
        const sources = [...batch.keys()]
        const promises = new Map(sources.map(source => [source, state.cache.get(source)]))
        try {
          for (let i = 0; i < sources.length; i += 50) {
            const chunk = sources.slice(i, i + 50)
            const photos = await sign(chunk, token)
            for (const source of chunk) {
              const photo = photos.find(p => p.source === source)
              if (!photo) throw new Error('Photo unavailable')
              batch.get(source)!.resolve(photo)
            }
          }
        } catch (error) {
          for (const [source, waiting] of batch) {
            if (state.cache.get(source) === promises.get(source)) state.cache.delete(source)
            waiting.reject(error)
          }
        }
      })
    }
    return promise
  }
}
