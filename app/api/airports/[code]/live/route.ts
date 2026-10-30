import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { findAirport } from '@/lib/openflights-parse'
import { discoverFlights } from '@/lib/live-discovery'

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const airport = findAirport(await getDb(), (await params).code)
    if (!airport) return NextResponse.json({ ok: false, data: [], error: 'Airport not found' }, { status: 404 })
    const result = await discoverFlights(airport.iata)
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json({ ok: false, data: [], error: 'Live traffic unavailable' }, { status: 502 })
  }
}
