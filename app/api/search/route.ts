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
    const compact = upper.replace(/\s+/g, '')
    const reg = upper.match(/^[A-Z0-9]{1,2}-[A-Z0-9]{2,5}$/)
    const code = compact.match(/^([A-Z0-9]{2,3}?)(\d{1,4})$/)
    const merge = (lists: LiveAircraft[][]) => {
      const m = new Map<string, LiveAircraft>()
      for (const l of lists) for (const a of l) m.set(a.hex, a)
      return [...m.values()].sort((a, b) => Number(a.onGround) - Number(b.onGround))
    }
    const callsignQuery = async (icao: string, num: string) => {
      const forms = Array.from(new Set([num, num.padStart(4, '0'), num.padStart(3, '0')])).map((n) => icao + n)
      return merge(await Promise.all(forms.map((c) => timeout(live(`/callsign/${c}`), 10000, [] as LiveAircraft[]))))
    }
    if (reg) {
      flights = await timeout(live(`/reg/${encodeURIComponent(upper)}`), 10000, [])
    } else if (code) {
      // IATA (LH) and ICAO (DLH) prefixes are both tried
      const al = findAirline(db, code[1])
      const icao = al?.icao || (code[1].length === 3 ? code[1] : '')
      if (icao) flights = await callsignQuery(icao, code[2])
    }
    if (!flights.length && !reg) {
      // airline by name or code: its aircraft that are airborne right now (callsign prefix = ICAO)
      const al = searchAirlines(db, q, 1)[0]
      if (al?.icao) {
        const hubs: string[] = ((db as any).hubs?.get(al.id) || []).slice(0, 3)
        const pts = hubs.map((h) => db.airports.get(h)).filter(Boolean) as any[]
        const lists = await Promise.all(pts.map((pt) => timeout(live(`/point/${pt.lat}/${pt.lon}/250`), 10000, [] as LiveAircraft[])))
        flights = merge(lists.map((l) => l.filter((a) => a.callsign.startsWith(al.icao)))).slice(0, 25)
      }
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
