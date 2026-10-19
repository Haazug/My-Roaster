'use client'
import { useLocalStorage } from '@/lib/use-local-storage'
import type { RosterFlight } from '@/lib/roster-data'
export function useFavourites() { const [items, setItems] = useLocalStorage<RosterFlight[]>('myroster.favourites', []); const toggle = (flight: RosterFlight) => setItems(items.some((item) => item.id === flight.id) ? items.filter((item) => item.id !== flight.id) : [...items, flight]); return { items, toggle, has: (id: string) => items.some((item) => item.id === id) } }
