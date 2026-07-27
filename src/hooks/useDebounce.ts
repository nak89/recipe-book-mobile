import { useEffect, useState } from 'react'

/**
 * Search filters the already-fetched list in memory, so this isn't about
 * sparing the network — it's about not re-running the filter and re-rendering
 * the grid on every keystroke.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
