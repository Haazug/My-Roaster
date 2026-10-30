import 'server-only'
import { live, type LiveAircraft } from '@/lib/live'
import { lookupCallsign } from '@/lib/route-lookup'
import { airlineByIcao, parseCallsign } from '@/lib/airline-lookup'
import { getDb } from '@/lib/db'
import { FlightObservations, airportDirection, flightIdentity, type ResolvedFlight } from '@/lib/live-model'

// Shared within this server process. A durable provider/index is needed for multi-instance history.
const observations = new FlightObservations()
const pending = new Map<string, Promise<void>>()
const scanned = new Map<string, number>()
const satellites = ['NBJ', 'LIS', 'JNB', 'DXB', 'LHR', 'JFK', 'GRU', 'HND']

export async function resolveAircraft(a: LiveAircraft, observedAt = Date.now()): Promise<ResolvedFlight> {
  const p = parseCallsign(a.callsign)
  const [route, airline] = await Promise.all([
    lookupCallsign(a.callsign),
    p ? airlineByIcao(p.icao) : Promise.resolve(null),
  ])
  const airlineIata = route?.airlineIata || airline?.iata || ''
  return {
    ...a, airlineIata, airlineIcao: route?.airlineIcao || airline?.icao || p?.icao || '',
    airlineName: route?.airlineName || airline?.name || 'Unknown airline',
    flightNumber: flightIdentity(a.callsign, airlineIata, route?.flightNumber),
    from: route?.from || null, to: route?.to || null,
    fromCity: route?.fromCity || '', toCity: route?.toCity || '',
    observedAt, status: 'observed', remainingMinutes: null,
  }
}

async function discover(code: string) {
  if (Date.now() - (scanned.get(code) || 0) < 45_000) return
  const existing = pending.get(code)
  if (existing) return existing
  const work = (async () => {
    const db = await getDb()
    const ap = db.airports.get(code)
    if (!ap) return
    const aircraft = await live(`/point/${ap.lat}/${ap.lon}/140`)
    const observedAt = Date.now()
    // Bound route-provider traffic; rotate the scan to avoid starving higher-altitude aircraft.
    const offset = Math.floor(observedAt / 45_000) * 20 % Math.max(aircraft.length, 1)
    const selected = [...aircraft.slice(offset), ...aircraft.slice(0, offset)].slice(0, 20)
    let failed = false
    for (let i = 0; i < selected.length; i += 5) {
      const batch = await Promise.allSettled(selected.slice(i, i + 5).map(a => resolveAircraft(a, observedAt)))
      for (const result of batch) {
        if (result.status === 'fulfilled') observations.record(result.value)
        else failed = true
      }
    }
    if (failed) throw new Error('Some flight routes could not be resolved')
    scanned.set(code, Date.now())
  })()
  pending.set(code, work)
  try { await work } finally { pending.delete(code) }
}

export async function discoverFlights(airport?: string) {
  // Scan the same satellites on each request too: endpoint assignment must not rely
  // on another serverless worker having populated this process's memory.
  const codes = [...new Set(airport ? [airport, ...satellites] : satellites)]
  const outcomes = await Promise.allSettled(codes.map(discover))
  const flights = observations.list()
  return {
    data: airport ? flights.filter(f => airportDirection(f, airport)).map(f => ({ ...f, kind: airportDirection(f, airport) })) : flights,
    coverage: 'Detected routes only; coverage is partial, not an airport timetable or a global flight census.',
    scannedAirports: codes,
    degraded: outcomes.some(r => r.status === 'rejected'),
    checkedAt: new Date().toISOString(),
  }
}
