import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { live, type LiveAircraft } from '@/lib/live'
import { findAirline, searchAirlines, searchAirports, searchRoutes } from '@/lib/openflights-parse'
import { aircraft } from '@/lib/aircraft'

const timeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))])

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 80)
  const sources = {
    flightConnections: `https://www.flightconnections.com/pt/search?query=${encodeURIComponent(q)}`,
    flightradar24: `https://www.flightradar24.com/data/flights/${encodeURIComponent(q.replace(/\s+/g, '').toLowerCase())}`,
    openSky: 'https://map.opensky-network.org',
  }
  if (!q) return NextResponse.json({ query: q, airlines: [], airports: [], routes: [], flights: [], aircraftTypes: [], sources })
  try {
    const db = await Promise.race([
      getDb(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('search timeout')), 8000)),
    ])
    const upper = q.toUpperCase()
    let flights: LiveAircraft[] = []
    const reg = upper.match(/^[A-Z0-9]{1,2}-[A-Z0-9]{2,5}$/)
    const code = upper.replace(/\s+/g, '').match(/^([A-Z0-9]{2,3}?)(\d{1,4})$/)
    if (reg) {
      flights = await timeout(live(`/reg/${encodeURIComponent(upper)}`), 6000, [])
    } else if (code) {
      const airline = findAirline(db, code[1])
      if (airline?.icao) flights = await timeout(live(`/callsign/${airline.icao}${code[2]}`), 6000, [])
    }
    const aircraftTypes = Object.values(aircraft)
      .filter(([name, icao]) => icao === upper || name.toUpperCase().replace(/\s/g, '').includes(upper.replace(/\s/g, '')))
      .map(([name, icao]) => ({ name, icao }))
      .filter((v, i, arr) => arr.findIndex((x) => x.icao === v.icao) === i)
    if (aircraftTypes.length && upper.length >= 3) {
      flights = flights.length ? flights : await timeout(live(`/type/${encodeURIComponent(aircraftTypes[0].icao)}`), 6000, [])
    }
    return NextResponse.json({
      query: q,
      airlines: searchAirlines(db, q),
      airports: searchAirports(db, q),
      routes: searchRoutes(db, q),
      flights: flights.slice(0, 20),
      aircraftTypes,
      sources,
    })
  } catch {
    return NextResponse.json({ query: q, airlines: [], airports: [], routes: [], flights: [], aircraftTypes: [], sources, degraded: true })
  }
}
