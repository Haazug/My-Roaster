import 'server-only'
import { getDb } from '@/lib/db'

type A = { id: string; iata: string; icao: string; name: string; country: string; active: boolean }
let cache: { byIcao: Map<string, A>; byIata: Map<string, A> } | null = null

async function build() {
  if (cache) return cache
  const db: any = await getDb()
  const byIcao = new Map<string, A>()
  const byIata = new Map<string, A>()
  const score = (a: A) => (a.active ? 1e6 : 0) + (db.routesByAirline.get(a.id)?.length || 0)
  for (const a of db.airlines.values()) {
    for (const [m, k] of [[byIcao, a.icao], [byIata, a.iata]] as const) {
      if (!k) continue
      const cur = m.get(k)
      if (!cur || score(a) > score(cur)) m.set(k, a)
    }
  }
  cache = { byIcao, byIata }
  return cache
}

export async function airlineByIcao(c: string) { return (await build()).byIcao.get(String(c).toUpperCase()) || null }
export async function airlineByIata(c: string) { return (await build()).byIata.get(String(c).toUpperCase()) || null }

// "DLH123" -> { icao: 'DLH', num: '123' }; private callsigns (N123AB) do not match
export function parseCallsign(cs: string) {
  const m = String(cs || '').trim().toUpperCase().match(/^([A-Z]{3})(\d{1,4})([A-Z]?)$/)
  return m ? { icao: m[1], num: m[2] + m[3] } : null
}
