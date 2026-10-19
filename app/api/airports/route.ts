import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = await getDb()
    const airports = [...db.airports.values()]
      .map((a) => ({ ...a, routes: db.routesByAirport.get(a.iata)?.length ?? 0 }))
      .filter((a) => a.routes > 0)
      .sort((a, b) => b.routes - a.routes)
    return NextResponse.json(airports)
  } catch {
    return NextResponse.json({ error: 'Data unavailable' }, { status: 503 })
  }
}
