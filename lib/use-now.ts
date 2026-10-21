'use client'
import { useEffect, useState } from 'react'

// Current time as a Date, refreshed while the page is open.
// Starts as null so server and browser render the same thing (no hydration error).
export function useNow(ms = 15000) {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), ms)
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date())
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [ms])
  return now
}
