import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { live } from '@/lib/live'
import { lookupCallsign } from '@/lib/route-lookup'

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const code = (await params).code.toUpperCase()
    const db = await getDb()
    const ap = db.airports.get(code)
    if (!ap) return NextResponse.json({ ok: false, data: [] }, { status: 404 })
    const near = (await live(`/point/${ap.lat}/${ap.lon}/60`))
      .filter((a) => a.callsign)
      .sort((a, b) => (a.altFt ?? 0) - (b.altFt ?? 0))
      .slice(0, 25)
    const out: any[] = []
    for (let i = 0; i < near.length; i += 5) {
      const batch = near.slice(i, i + 5)
      const res = await Promise.all(batch.map((a) => lookupCallsign(a.callsign)))
      res.forEach((r, k) => {
        if (r && (r.from === code || r.to === code || r.fromIcao === ap.icao || r.toIcao === ap.icao)) {
          out.push({ hex: batch[k].hex, ...r, altFt: batch[k].altFt, onGround: batch[k].onGround })
        }
      })
    }
    return NextResponse.json({ ok: true, data: out })
  } catch {
    return NextResponse.json({ ok: false, data: [] }, { status: 502 })
  }
}
