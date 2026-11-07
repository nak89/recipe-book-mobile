/** In-memory, session-scoped data. No expiration timer or persistent credentials. */
export function createSessionResource<T>() {
  let owner: string | undefined
  let value: T | undefined
  let pending: Promise<T> | undefined
  let revision = 0

  function clear() {
    revision++
    value = undefined
    pending = undefined
    owner = undefined
  }

  return {
    peek(token: string | null): T | undefined {
      return token !== null && token === owner ? value : undefined
    },
    clear,
    load(token: string, fetcher: () => Promise<T>): Promise<T> {
      if (owner !== token) {
        clear()
        owner = token
      }
      if (pending) return pending
      const startedAt = revision
      const result = Promise.resolve().then(fetcher).then(data => {
        // A sign-out, account change or successful mutation invalidates older
        // reads, even when the network response arrives after the invalidation.
        if (revision === startedAt && owner === token) value = data
        return data
      }).finally(() => {
        if (pending === result) pending = undefined
      })
      pending = result
      return result
    },
  }
}
