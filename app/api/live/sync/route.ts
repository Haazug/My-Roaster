import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { discoverFlights } from '@/lib/live-discovery'

export const runtime = 'nodejs'
export const maxDuration = 300
export async function GET(request: Request) {
  const secret = process.env.LIVE_SYNC_TOKEN
  const given = request.headers.get('authorization') || ''
  const expected = `Bearer ${secret || ''}`
  if (!secret || Buffer.byteLength(given) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await discoverFlights(undefined, { background: true })
  return NextResponse.json({ ...result, data: undefined, count: result.data.length })
}
