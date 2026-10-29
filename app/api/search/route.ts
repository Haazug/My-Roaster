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
    const hubFlights = async (airlineId: string, icao: string) => {
      const ids: string[] = ((db as any).hubs?.get(airlineId) || []).slice(0, 2)
      const lists = await Promise.all(
        ids.map((c) => {
          const a = db.airports.get(c)
          return a ? timeout(live(`/point/${a.lat}/${a.lon}/250`), 9000, [] as LiveAircraft[]) : Promise.resolve([] as LiveAircraft[])
        })
      )
      const m = new Map<string, LiveAircraft>()
      for (const l of lists) for (const ac of l) if (ac.callsign.toUpperCase().startsWith(icao)) m.set(ac.hex, ac)
      return Array.from(m.values())
    }
    if (reg) {
      flights = await timeout(live(`/reg/${encodeURIComponent(upper)}`), 9000, [])
    } else if (code) {
      const airline = findAirline(db, code[1])
      if (airline?.icao) {
        flights = await timeout(live(`/callsign/${airline.icao}${code[2]}`), 9000, [])
        if (!flights.length) flights = await hubFlights(airline.id, airline.icao)
      }
    } else if (q.length >= 3) {
      const al = searchAirlines(db, q, 1)[0]
      if (al?.icao) flights = await hubFlights(al.id, al.icao)
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
