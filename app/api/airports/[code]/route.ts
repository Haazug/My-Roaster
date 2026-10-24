import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { topRank } from '@/lib/top-airlines'
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
    const groups = new Map<string, any>()
    for (const r of routes) {
      const key = `${r.from}-${r.to}`
      let g = groups.get(key)
      if (!g) {
        g = { from: r.from, to: r.to, fromAirport: db.airports.get(r.from), toAirport: db.airports.get(r.to), codeshare: r.codeshare, equip: r.equip, airlines: [] as any[] }
        groups.set(key, g)
      }
      const al = db.airlines.get(r.airlineId)
      if (al && !g.airlines.some((x: any) => x.id === al.id)) g.airlines.push({ id: al.id, iata: al.iata, icao: al.icao, name: al.name, active: al.active })
    }
    const routesWithAirports = Array.from(groups.values())
      .map((g) => ({ ...g, airlines: g.airlines.sort((a: any, b: any) => topRank(a.icao) - topRank(b.icao) || Number(b.active) - Number(a.active)) }))
      .sort((a, b) => b.airlines.length - a.airlines.length)

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
