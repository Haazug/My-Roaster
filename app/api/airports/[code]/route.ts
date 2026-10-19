import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { nearbyAirports } from '@/lib/openflights-parse'

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params
    const upperCode = (code || '').toUpperCase()
    
    const db = await getDb()
    const airport = db.airports.get(upperCode)
    
    if (!airport) {
      return NextResponse.json({ error: 'Airport not found' }, { status: 404 })
    }

    const routes = db.routesByAirport.get(upperCode) || []
    const routesWithAirports = routes.map((r) => ({
      from: r.from,
      to: r.to,
      fromAirport: db.airports.get(r.from),
      toAirport: db.airports.get(r.to),
      codeshare: r.codeshare,
      equip: r.equip,
    }))

    const nearby = nearbyAirports(db, airport.lat, airport.lon, 300, 12)

    return NextResponse.json({
      airport,
      routes: routesWithAirports,
      nearby: nearby.map(a => ({ ...a, routes: db.routesByAirport.get(a.iata)?.length ?? 0 })),
    })
  } catch (error) {
    console.error('Airport detail error:', error)
    return NextResponse.json({ error: 'Failed to load airport' }, { status: 500 })
  }
}
