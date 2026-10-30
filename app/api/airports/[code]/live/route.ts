import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { live } from '@/lib/live'
import { lookupCallsign } from '@/lib/route-lookup'
import { airlineByIcao, parseCallsign } from '@/lib/airline-lookup'

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = (await params).code.toUpperCase()
    const db: any = await getDb()
    const ap = db.airports.get(code)
    if (!ap) return NextResponse.json({ ok: false, data: [] }, { status: 404 })
    const focus = ['Angola', 'South Africa', 'Morocco', 'Egypt', 'Nigeria'].includes(ap.country)
    const near = (await live(`/point/${ap.lat}/${ap.lon}/${focus ? 140 : 60}`))
      .filter((a) => a.callsign)
      .sort((a, b) => (a.altFt ?? 0) - (b.altFt ?? 0))
      .slice(0, focus ? 60 : 40)
    const out: any[] = []
    for (let i = 0; i < near.length; i += 5) {
      const batch = near.slice(i, i + 5)
      const res = await Promise.all(
        batch.map(async (a) => {
          const p = parseCallsign(a.callsign)
          const [route, al] = await Promise.all([
            i < 25 ? lookupCallsign(a.callsign) : Promise.resolve(null),
            p ? airlineByIcao(p.icao) : Promise.resolve(null),
          ])
          return { a, route, al }
        })
      )
      for (const { a, route, al } of res) {
        const involves = !!route && (route.from === code || route.to === code || route.fromIcao === ap.icao || route.toIcao === ap.icao)
        out.push({
          hex: a.hex, callsign: a.callsign, type: a.type || null, altFt: a.altFt, onGround: a.onGround, gs: a.gs ?? null,
          airlineIata: route?.airlineIata || al?.iata || '',
          airlineIcao: route?.airlineIcao || al?.icao || '',
          airlineName: route?.airlineName || al?.name || '',
          from: route?.from || null, to: route?.to || null,
          fromCity: route?.fromCity || '', toCity: route?.toCity || '',
          kind: involves ? (route!.from === code || route!.fromIcao === ap.icao ? 'departing' : 'arriving') : 'nearby',
        })
      }
    }
    out.sort((x, y) => Number(y.kind !== 'nearby') - Number(x.kind !== 'nearby'))
    return NextResponse.json({ ok: true, data: out })
  } catch {
    return NextResponse.json({ ok: false, data: [] }, { status: 502 })
  }
}
