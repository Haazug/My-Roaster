import 'server-only'

export type FlightRoute = {
  callsign: string
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

const cache = new Map<string, { at: number; value: FlightRoute | null }>()
const fix = (c: string) => (c === 'LAD' ? 'NBJ' : c)
const fixIcao = (c: string) => (c === 'FNLU' ? 'FNBJ' : c)

export async function lookupCallsign(cs: string): Promise<FlightRoute | null> {
  const key = String(cs || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{3,8}$/.test(key)) return null
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < (hit.value ? 6 * 3600_000 : 30 * 60_000)) return hit.value
  try {
    const res = await fetch(`https://api.adsbdb.com/v0/callsign/${key}`, { cache: 'no-store', headers: { 'User-Agent': 'MyRoster' } })
    let value: FlightRoute | null = null
    if (res.ok) {
      const f = (await res.json())?.response?.flightroute
      if (f?.origin?.iata_code && f?.destination?.iata_code) {
        value = {
          callsign: key,
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
    if (res.ok || res.status === 404) cache.set(key, { at: Date.now(), value })
    return value
  } catch {
    return null
  }
}
