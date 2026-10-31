import { NextResponse } from 'next/server'
import {getDb} from '@/lib/db'
import { lookupCallsign } from '@/lib/route-lookup'

export async function GET(_: Request, { params }: { params: Promise<{ cs: string }> }) {
  const { cs } = await params
  try {
    const data = await lookupCallsign(cs)
    const db=data?await getDb():null
    return NextResponse.json({ok:!!data,data:data?{...data,fromAirport:db?.airports.get(data.from),toAirport:db?.airports.get(data.to)}:null})
  } catch {
    return NextResponse.json({ ok: false, data: null, error: 'Route lookup unavailable' }, { status: 502 })
  }
}
