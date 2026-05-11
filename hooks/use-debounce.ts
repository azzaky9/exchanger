import { useEffect, useState } from "react"

/**
 * Returns a debounced copy of `value` that only updates after
 * `delay` ms of silence. Use this to avoid hammering an API or
 * pushing URL params on every keystroke.
 *
 * @example
 * const debouncedSearch = useDebounce(search, 300)
 * useEffect(() => { fetchResults(debouncedSearch) }, [debouncedSearch])
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
