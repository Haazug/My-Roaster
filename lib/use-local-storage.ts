"use client"

import { useCallback, useEffect, useState } from "react"

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    try { const raw = window.localStorage.getItem(key); if (raw) setValue(JSON.parse(raw)) } catch {}
    setHydrated(true)
  }, [key])
  const update = useCallback((next: T | ((current: T) => T)) => {
    setValue(current => { const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next; try { window.localStorage.setItem(key, JSON.stringify(resolved)) } catch {}; return resolved })
  }, [key])
  return [value, update, hydrated] as const
}
