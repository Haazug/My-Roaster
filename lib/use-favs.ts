'use client'
import { useLocalStorage } from '@/lib/use-local-storage'

export type FavItem = { id: string; label: string; sub?: string; href: string; iata?: string; icao?: string }
const KEYS = { airline: 'myroster.favAirlines', airport: 'myroster.favAirports' } as const

export function useFavs(kind: 'airline' | 'airport') {
  const [items, setItems, hydrated] = useLocalStorage<FavItem[]>(KEYS[kind], [])
  const has = (id: string) => items.some((x) => x.id === id)
  const toggle = (it: FavItem) => setItems((cur) => (cur.some((x) => x.id === it.id) ? cur.filter((x) => x.id !== it.id) : [it, ...cur]))
  return { items, has, toggle, hydrated }
}

export type Recent = FavItem & { kind: 'airline' | 'airport' | 'route' | 'flight'; t: number }
export function useRecents() {
  const [items, setItems, hydrated] = useLocalStorage<Recent[]>('myroster.recents', [])
  const add = (r: Omit<Recent, 't'>) => setItems((cur) => [{ ...r, t: Date.now() }, ...cur.filter((x) => x.id !== r.id)].slice(0, 12))
  const clear = () => setItems([])
  return { items, add, clear, hydrated }
}
