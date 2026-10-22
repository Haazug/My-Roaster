import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { mergeRoutes } from '@/lib/route-merge'

export async function GET() {
  try {
    const db = await getDb()
    const list = [...db.airlines.values()]
      .map((a) => ({ ...a, numRoutes: mergeRoutes(db.routesByAirline.get(a.id) ?? []).length }))
      .filter((a) => a.numRoutes > 0)
      .sort((a, b) => b.numRoutes - a.numRoutes)
    return NextResponse.json(list)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Data unavailable' }, { status: 503 })
  }
}
