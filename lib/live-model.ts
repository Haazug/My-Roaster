// Shared live semantics: proximity discovers aircraft; only a resolved route assigns airports.
export type ResolvedFlight = {
  hex: string; callsign: string; flightNumber: string; airlineIata: string; airlineIcao: string; airlineName: string
  from: string | null; to: string | null; fromCity: string; toCity: string
  type?: string; altFt: number | null; onGround: boolean; gs?: number; lat: number; lon: number
  observedAt: number; status: 'observed' | 'estimated'; remainingMinutes: null
}

export function flightIdentity(callsign: string, iata = '', published = '') {
  const cs = callsign.trim().toUpperCase()
  // An operational callsign such as DTA6AB is not a passenger flight number.
  const known = published.trim().toUpperCase()
  if (/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(known)) return known
  const numeric = cs.match(/^[A-Z]{3}(\d{1,4})$/)
  return numeric && iata ? `${iata}${numeric[1]}` : cs
}

export function airportDirection(f: Pick<ResolvedFlight, 'from' | 'to'>, code: string) {
  const key = code.toUpperCase() === 'LAD' ? 'NBJ' : code.toUpperCase()
  return f.from === key ? 'departing' : f.to === key ? 'arriving' : null
}

export class FlightObservations {
  private entries = new Map<string, ResolvedFlight>()
  constructor(private retentionMs = 20 * 60_000, private freshMs = 90_000, private maxEntries = 5000) {}
  record(f: ResolvedFlight) {
    // A newly observed unknown route must not inherit an old flight's endpoints.
    this.entries.delete(f.hex)
    this.entries.set(f.hex, f)
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!)
  }
  list(now = Date.now()) {
    const out: ResolvedFlight[] = []
    for (const [key, f] of this.entries) {
      const age = now - f.observedAt
      if (age > this.retentionMs) { this.entries.delete(key); continue }
      if (f.onGround || !f.from || !f.to) continue
      out.push({ ...f, status: age > this.freshMs ? 'estimated' : 'observed', remainingMinutes: null })
    }
    return out
  }
}

export function liveRouteHref(f: Pick<ResolvedFlight, 'from' | 'to' | 'airlineIata' | 'airlineIcao' | 'flightNumber'>) {
  const airline = f.airlineIata || f.airlineIcao
  if (!f.from || !f.to || !airline) return null
  return `/route/${encodeURIComponent(airline)}/${f.from}-${f.to}?flight=${encodeURIComponent(f.flightNumber)}`
}

// Prefer the longest prefix: DTA must be matched before DT.
export function flightNumberPart(code: string, iata: string, icao: string) {
  code = code.trim().toUpperCase()
  const prefix = [iata, icao].filter(Boolean).sort((a, b) => b.length - a.length).find(p => code.startsWith(p))
  const number = prefix ? code.slice(prefix.length) : !iata && !icao ? (code.match(/^(?:[A-Z]{3}|[A-Z0-9]{2})(\d{1,4}[A-Z]?)$/)?.[1] || '') : ''
  return /^\d{1,4}[A-Z]?$/.test(number) ? number : ''
}
