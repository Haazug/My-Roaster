import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = (await params).code.toUpperCase()
    const db: any = await getDb()
    const ap = db.airports.get(code)
    if (!ap) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const routes: any[] = db.routesByAirport.get(code) || []
    const dests = new Map<string, number>()
    const airlines = new Map<string, number>()
    for (const r of routes) {
      const other = r.from === code ? r.to : r.from
      dests.set(other, (dests.get(other) || 0) + 1)
      airlines.set(r.airlineId, (airlines.get(r.airlineId) || 0) + 1)
    }
    const top = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8)
    const topAirlines = top(airlines).map(([id, n]) => { const a = db.airlines.get(id); return a ? { id, iata: a.iata, icao: a.icao, name: a.name, routes: n } : null }).filter(Boolean)
    const topDestinations = top(dests).map(([c, n]) => { const a = db.airports.get(c); return a ? { iata: a.iata, city: a.city, country: a.country, airlines: n } : null }).filter(Boolean)
    const hubOf: any[] = []
    for (const [id, h] of (db.hubs ? Array.from(db.hubs.entries()) : []) as [string, string[]][]) {
      if (h.includes(code)) { const a = db.airlines.get(id); if (a) hubOf.push({ id, iata: a.iata, icao: a.icao, name: a.name }) }
    }
    return NextResponse.json({
      airport: { iata: ap.iata, icao: ap.icao, name: ap.name, city: ap.city, country: ap.country, lat: ap.lat, lon: ap.lon },
      destinations: dests.size, airlines: airlines.size, topAirlines, topDestinations, hubOf: hubOf.slice(0, 8),
    })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
