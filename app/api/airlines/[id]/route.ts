import { allianceFor } from '@/lib/airline-metadata'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { aircraftName } from '@/lib/aircraft'
import { mergeRoutes } from '@/lib/route-merge'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const db = await getDb()
    const a = db.airlines.get(id)
    if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const routes = mergeRoutes(db.routesByAirline.get(id) ?? []).map((r) => ({
      from: r.from,
      to: r.to,
      fromAirport: db.airports.get(r.from),
      toAirport: db.airports.get(r.to),
      aircraft: r.equip.map((e) => aircraftName(e)),
      codeshare: r.codeshare,
      roundTrip: r.roundTrip,
    }))
    return NextResponse.json({ airline: {...a, alliance:allianceFor(a.icao)}, hubs: ((db as any).hubs?.get(id) || []).map((c:string)=>db.airports.get(c)).filter(Boolean), catalog: 'historical-reference', numRoutes: routes.length, routes })
  } catch {
    return NextResponse.json({ error: 'Data unavailable' }, { status: 503 })
  }
}
