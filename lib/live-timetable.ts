import type { HistoryRecord, LiveHistory } from './live-history-sqlite'

const HOUR = 3600_000
const time = (value: unknown): number | undefined => {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d\d:\d\d)$/.test(value)) return undefined
  const n = Date.parse(value)
  return Number.isFinite(n) ? n : undefined
}
const airportCode = (value: unknown) => typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value === 'LAD' ? 'NBJ' : value : null
const code = (value: unknown) => typeof value === 'string' && /^[A-Z0-9]{2,3}$/.test(value) ? value : ''

type RawFlight = {
  flight_date?: string; flight_status?: string
  departure?: { iata?: string; scheduled?: string; estimated?: string; actual?: string }
  arrival?: { iata?: string; scheduled?: string; estimated?: string; actual?: string }
  airline?: { name?: string; iata?: string; icao?: string }
  flight?: { iata?: string; icao?: string; number?: string; codeshared?: unknown }
  aircraft?: { icao24?: string; icao?: string }
  live?: { updated?: string; latitude?: number; longitude?: number; altitude?: number; is_ground?: boolean }
}

export function timetableRecord(raw: RawFlight, now = Date.now()): HistoryRecord | null {
  const from = airportCode(raw.departure?.iata), to = airportCode(raw.arrival?.iata)
  const number = raw.flight?.iata || raw.flight?.icao || ''
  if (!from || !to || from === to || !/^[A-Z0-9]{2,3}\d{1,4}[A-Z]?$/.test(number)) return null
  const scheduled = time(raw.departure?.scheduled)
  const actual = time(raw.departure?.actual)
  const depart = actual || time(raw.departure?.estimated) || scheduled
  if (!depart || depart > now || now - depart > 30 * HOUR) return null
  const arrived = time(raw.arrival?.actual)
  const terminal = ['landed', 'cancelled', 'diverted', 'incident'].includes(raw.flight_status || '') || !!arrived || raw.live?.is_ground === true
  // Never promote a merely scheduled/delayed flight to airborne because its clock passed.
  if (!terminal && raw.flight_status !== 'active' && !actual) return null
  const eta = time(raw.arrival?.estimated) || time(raw.arrival?.scheduled)
  const expiresAt = terminal ? now + 48 * HOUR : Math.min(depart + 30 * HOUR, eta ? eta + HOUR : depart + 18 * HOUR)
  const serviceDate = raw.flight_date && /^\d{4}-\d{2}-\d{2}$/.test(raw.flight_date) ? raw.flight_date : new Date(scheduled || depart).toISOString().slice(0, 10)
  const id = `schedule:${number}:${from}:${to}:${scheduled || serviceDate}`
  const liveAt = time(raw.live?.updated)
  return {
    id, hex: raw.aircraft?.icao24?.toUpperCase() || '', callsign: raw.flight?.icao || number, flightNumber: number,
    airlineIata: code(raw.airline?.iata), airlineIcao: code(raw.airline?.icao), airlineName: raw.airline?.name || 'Unknown airline',
    from, to, fromCity: '', toCity: '', type: raw.aircraft?.icao,
    lat: raw.live?.latitude ?? 0, lon: raw.live?.longitude ?? 0, altFt: raw.live?.altitude == null ? null : Math.round(raw.live.altitude * 3.28084),
    onGround: terminal, terminal, observedAt: liveAt || actual || depart, updatedAt: now, expiresAt,
    departedAt: actual, arrivesAt: eta, serviceDate, source: 'timetable', status: 'estimated', remainingMinutes: null,
  }
}

export type TimetableResult = { configured: boolean; complete: boolean; total: number | null; error?: string }
export class AviationstackTimetable {
  private pending = new Map<string, Promise<TimetableResult>>()
  constructor(private history: LiveHistory, private apiKey: string, private fetcher: typeof fetch = fetch, private maxPages = 3) {}
  async sync(airport?: string): Promise<TimetableResult> {
    const scopes = airport ? [`dep:${airport}`, `arr:${airport}`] : ['active']
    const results = await Promise.all(scopes.map(scope => {
      const active = this.pending.get(scope)
      if (active) return active
      const work = this.scan(scope)
      this.pending.set(scope, work)
      return work.finally(() => this.pending.delete(scope))
    }))
    return { configured: true, complete: results.every(r => r.complete), total: results.every(r => r.total !== null) ? results.reduce((n, r) => n + (r.total || 0), 0) : null }
  }
  private async scan(scope: string): Promise<TimetableResult> {
    const now = Date.now()
    const previous = await this.history.getSync(scope)
    // Cache successful pages across processes, respecting the provider's metered requests.
    if (previous && now - previous.checkedAt < 5 * 60_000) return { configured: true, complete: previous.complete, total: previous.total }
    let offset = previous && !previous.complete ? previous.nextOffset : 0
    for (let page = 0; page < this.maxPages; page++) {
      const url = new URL('https://api.aviationstack.com/v1/flights')
      url.searchParams.set('access_key', this.apiKey)
      url.searchParams.set('limit', '100')
      url.searchParams.set('offset', String(offset))
      if (scope === 'active') url.searchParams.set('flight_status', 'active')
      else { const [direction, airport] = scope.split(':'); url.searchParams.set(`${direction}_iata`, airport) }
      const response = await this.fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
      if (!response.ok) throw new Error(`Timetable provider HTTP ${response.status}`)
      const body = await response.json()
      if (body.error) throw new Error('Timetable provider rejected the request; check plan, quota and server credentials')
      if (!Array.isArray(body.data)) throw new Error('Invalid timetable response')
      const records = body.data.map((row: RawFlight) => timetableRecord(row, now)).filter((row: HistoryRecord | null): row is HistoryRecord => row !== null)
      await this.history.write(records)
      const count = body.data.length
      const total = Number.isFinite(body.pagination?.total) ? body.pagination.total as number : null
      const next = offset + count
      const complete = total !== null ? next >= total : count < 100
      if (!complete && count === 0) throw new Error('Timetable pagination did not advance')
      await this.history.setSync(scope, { checkedAt: now, nextOffset: complete ? 0 : next, complete, total })
      if (complete) return { configured: true, complete, total }
      offset = next
    }
    const state = await this.history.getSync(scope)
    return { configured: true, complete: false, total: state?.total ?? null }
  }
}
