import {hubRoutes} from '@/lib/route-merge'
import { allianceFor } from '@/lib/airline-metadata'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db: any = await getDb()
    const al = db.airlines.get(id)
    if (!al) return NextResponse.json({ error: 'not found' }, { status: 404 })
    const routes = hubRoutes<any>(db.routesByAirline.get(id)||[],db.hubs?.get(id)||[])
    const deg = new Map<string, number>()
    for (const r of routes) for (const c of [r.from, r.to]) deg.set(c, (deg.get(c) || 0) + 1)
    const ap = (c: string) => {
      const a = db.airports.get(c)
      return a ? { iata: a.iata, icao: a.icao, name: a.name, city: a.city, country: a.country, routes: deg.get(c) || 0 } : null
    }
    const sorted = Array.from(deg.entries()).sort((a, b) => b[1] - a[1])
    const hubCodes: string[] = db.hubs?.get(id) || sorted.slice(0, 2).map((e) => e[0])
    const countries = new Set(Array.from(deg.keys()).map((c) => db.airports.get(c)?.country).filter(Boolean))
    const pairs = new Set(routes.map((r) => [r.from, r.to].sort().join('-')))
    return NextResponse.json({
      airline: { id: al.id, name: al.name, iata: al.iata, icao: al.icao, country: al.country, active: al.active, alliance:allianceFor(al.icao) },
      hubs: hubCodes.map(ap).filter(Boolean),
      top: sorted.slice(0, 10).map((e) => ap(e[0])).filter(Boolean),
      airports: deg.size,
      countries: countries.size,
      pairs: pairs.size,
    })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
