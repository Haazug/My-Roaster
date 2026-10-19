import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { aircraft as aircraftTable } from '@/lib/aircraft'
import { findAirline, findAirport, haversineKm, kmToNm } from '@/lib/openflights-parse'

export async function GET(_: Request, { params }: { params: Promise<{ airline: string; pair: string }> }) {
  try {
    const { airline: code, pair } = await params
    const [fromCode, toCode] = decodeURIComponent(pair).split('-')
    const db = await getDb()
    const airline = findAirline(db, code)
    const from = fromCode ? findAirport(db, fromCode) : undefined
    const to = toCode ? findAirport(db, toCode) : undefined
    if (!airline || !from || !to) return NextResponse.json({ error: 'Route not found' }, { status: 404 })
    const route = (db.routesByAirline.get(airline.id) ?? []).find((r) => r.from === from.iata && r.to === to.iata)
    const km = haversineKm(from, to)
    const aircraft = (route?.equip ?? []).map((e) => ({ code: e, name: aircraftTable[e]?.[0] ?? e, icao: aircraftTable[e]?.[1] ?? e }))
    return NextResponse.json({ airline, from, to, operated: Boolean(route), codeshare: route?.codeshare ?? false, aircraft, distanceKm: Math.round(km), distanceNm: Math.round(kmToNm(km)) })
  } catch {
    return NextResponse.json({ error: 'Data unavailable' }, { status: 503 })
  }
}
