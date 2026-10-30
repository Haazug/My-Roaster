import 'server-only'

export type FlightRoute = {
  callsign: string
  flightNumber: string
  airlineName: string
  airlineIcao: string
  airlineIata: string
  from: string
  to: string
  fromIcao: string
  toIcao: string
  fromCity: string
  toCity: string
}

const pending = new Map<string, Promise<FlightRoute | null>>()
const cache = new Map<string, { at: number; value: FlightRoute | null }>()
const fix = (c: string) => (c === 'LAD' ? 'NBJ' : c)
const fixIcao = (c: string) => (c === 'FNLU' ? 'FNBJ' : c)

export async function lookupCallsign(cs: string): Promise<FlightRoute | null> {
  const key = String(cs || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{3,8}$/.test(key)) return null
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < (hit.value ? 5 * 60_000 : 60_000)) return hit.value
  const active = pending.get(key)
  if (active) return active
  const work = fetchRoute(key)
  pending.set(key, work)
  try { return await work } finally { pending.delete(key) }
}

async function fetchRoute(key: string): Promise<FlightRoute | null> {
    const res = await fetch(`https://api.adsbdb.com/v0/callsign/${key}`, { cache: 'no-store', headers: { 'User-Agent': 'MyRoster' }, signal: AbortSignal.timeout(6000) })
    if (!res.ok && res.status !== 404) throw new Error(`Route provider HTTP ${res.status}`)
    let value: FlightRoute | null = null
    if (res.ok) {
      const f = (await res.json())?.response?.flightroute
      if (f?.origin?.iata_code && f?.destination?.iata_code) {
        value = {
          callsign: key,
          flightNumber: f.callsign_iata || '',
          airlineName: f.airline?.name || '',
          airlineIcao: f.airline?.icao || '',
          airlineIata: f.airline?.iata || '',
          from: fix(f.origin.iata_code),
          to: fix(f.destination.iata_code),
          fromIcao: fixIcao(f.origin.icao_code || ''),
          toIcao: fixIcao(f.destination.icao_code || ''),
          fromCity: f.origin.municipality || '',
          toCity: f.destination.municipality || '',
        }
      }
    }
    if (res.ok || res.status === 404) {
      if (cache.size >= 5000) cache.delete(cache.keys().next().value!)
      cache.set(key, { at: Date.now(), value })
    }
    return value
}
