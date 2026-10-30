import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { aircraft as aircraftTable } from '@/lib/aircraft'
import { findAirline, findAirport, haversineKm, kmToNm } from '@/lib/openflights-parse'
import { mergeRoutes, pairKey } from '@/lib/route-merge'

export async function GET(_: Request, { params }: { params: Promise<{ airline: string; pair: string }> }) {
  try {
    const { airline: code, pair } = await params
    const [fromCode, toCode] = decodeURIComponent(pair).split('-')
    const db = await getDb()
    const airline = findAirline(db, code)
    const from = fromCode ? findAirport(db, fromCode) : undefined
    const to = toCode ? findAirport(db, toCode) : undefined
    if (!airline || !from || !to) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

    const all = db.routesByAirline.get(airline.id) ?? []
    // aceita os dois sentidos: LAD-LIS e LIS-LAD são a mesma rota
    const asked = all.find((r) => r.from === from.iata && r.to === to.iata)
    const other = all.find((r) => r.from === to.iata && r.to === from.iata)
    const route = asked ?? other

    const merged = mergeRoutes(all,(db as any).hubs?.get(airline.id)||[]).find((m) => pairKey(m.from, m.to) === pairKey(from.iata, to.iata))
    const legs =
      merged && merged.roundTrip
        ? [
            { label: 'Ida', pair: `${merged.from}-${merged.to}`, from: merged.from, to: merged.to, active: from.iata === merged.from },
            { label: 'Volta', pair: `${merged.to}-${merged.from}`, from: merged.to, to: merged.from, active: from.iata === merged.to },
          ]
        : []

    const km = haversineKm(from, to)
    const aircraft = (route?.equip ?? []).map((e) => ({ code: e, name: aircraftTable[e]?.[0] ?? e, icao: aircraftTable[e]?.[1] ?? e }))
    return NextResponse.json({
      airline, from, to,
      operated: Boolean(route),
      codeshare: route?.codeshare ?? false,
      aircraft,
      distanceKm: Math.round(km),
      distanceNm: Math.round(kmToNm(km)),
      roundTrip: Boolean(merged?.roundTrip),
      legs,
    })
  } catch {
    return NextResponse.json({ error: 'Data unavailable' }, { status: 503 })
  }
}
