import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { findAirport, searchAirports } from '@/lib/openflights-parse'

export async function GET(req: Request) {
  try {
    const q = (new URL(req.url).searchParams.get('q') || '').trim()
    if (q.length < 2) return NextResponse.json([])
    const db = await getDb()
    const exact = findAirport(db, q)
    const found = searchAirports(db, q, 6)
    const list = exact ? [exact, ...found.filter((a) => a.iata !== exact.iata)] : found
    return NextResponse.json(list.slice(0, 6))
  } catch {
    return NextResponse.json({ error: 'Data unavailable' }, { status: 503 })
  }
}
