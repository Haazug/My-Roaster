import {BRASILEIRINHO} from '@/lib/brasileirinho'
import { allianceFor } from '@/lib/airline-metadata'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { mergeRoutes, hubRoutes } from '@/lib/route-merge'

export async function GET() {
  try {
    const db = await getDb()
    const list = [...db.airlines.values()]
      .map((a) => ({ ...a, alliance:allianceFor(a.icao), numRoutes: mergeRoutes(hubRoutes(db.routesByAirline.get(a.id) ?? [],(db as any).hubs?.get(a.id)||[])).length }))
      .filter((a) => a.numRoutes > 0)
      .sort((a, b) => b.numRoutes - a.numRoutes)
    return NextResponse.json([...list,BRASILEIRINHO])
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Data unavailable' }, { status: 503 })
  }
}
