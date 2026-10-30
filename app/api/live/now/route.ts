import { NextResponse } from 'next/server'
import { discoverFlights } from '@/lib/live-discovery'

export async function GET() {
  try {
    return NextResponse.json({ ok: true, ...await discoverFlights() })
  } catch {
    return NextResponse.json({ ok: false, data: [], error: 'Live traffic unavailable' }, { status: 502 })
  }
}
