import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { findAirport } from '@/lib/openflights-parse'
import { discoverFlights } from '@/lib/live-discovery'

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams
    const db = await getDb()
    const from = findAirport(db, q.get('from') || '')
    const to = findAirport(db, q.get('to') || '')
    const airline = (q.get('airline') || '').toUpperCase()
    if (!from || !to || !/^[A-Z0-9]{2,3}$/.test(airline)) return NextResponse.json({ ok: false, error: 'Valid airline, origin and destination codes required' }, { status: 400 })
    const results = await Promise.all([discoverFlights(from.iata), discoverFlights(to.iata)])
    const aircraft = [...new Map(results.flatMap(r => r.data).map(f => [f.id || f.hex || `${f.flightNumber}:${f.from}:${f.to}`, f])).values()].filter(f =>
      (f.airlineIcao === airline || f.airlineIata === airline) &&
      ((f.from === from.iata && f.to === to.iata) || (f.from === to.iata && f.to === from.iata)))
    return NextResponse.json({ ok: true, data: { aircraft, count: aircraft.length }, degraded: results.some(r => r.degraded), retired: results.flatMap(r=>r.retired), history:{persistent:results.every(r=>r.history.persistent)}, availability:{live:results.every(r=>r.availability.live==='unavailable')?'unavailable':results.some(r=>r.availability.live==='partial')?'partial':'available'} })
  } catch {
    return NextResponse.json({ ok: false, error: 'Live traffic unavailable' }, { status: 502 })
  }
}
