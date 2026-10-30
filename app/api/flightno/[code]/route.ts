import { NextResponse } from 'next/server'
import { live } from '@/lib/live'
import { lookupCallsign } from '@/lib/route-lookup'
import { airlineByIata, airlineByIcao } from '@/lib/airline-lookup'

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const raw = decodeURIComponent((await params).code).toUpperCase().replace(/[\s-]/g, '')
    for (const pl of [3, 2]) {
      const pre = raw.slice(0, pl)
      const num = raw.slice(pl).replace(/^0+(?=\d)/, '')
      if (!/^\d{1,4}[A-Z]?$/.test(num)) continue
      const al: any = pl === 3 ? await airlineByIcao(pre) : await airlineByIata(pre)
      if (!al) continue
      const icaoCs = al.icao ? `${al.icao}${num}` : ''
      const iataCs = al.iata ? `${al.iata}${num}` : ''
      let route = icaoCs ? await lookupCallsign(icaoCs).catch(()=>null) : null
      if (!route && iataCs) route = await lookupCallsign(iataCs).catch(()=>null)
      if(route && ((route.airlineIcao && route.airlineIcao!==al.icao) || (route.airlineIata && route.airlineIata!==al.iata))) route=null
      let ac: any = null
      try { ac = (await live(`/callsign/${icaoCs || iataCs}`))[0] || null } catch {}
      if (!route && !ac) return NextResponse.json({ ok: false, airline: { id: al.id, iata: al.iata, icao: al.icao, name: al.name } })
      return NextResponse.json({
        ok: true,
        number: `${al.iata || al.icao}${num}`,
        callsign: icaoCs || iataCs,
        airline: { id: al.id, iata: al.iata, icao: al.icao, name: al.name },
        route,
        live: ac ? { hex: ac.hex, altFt: ac.altFt, onGround: ac.onGround } : null,
      })
    }
    return NextResponse.json({ ok: false })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
