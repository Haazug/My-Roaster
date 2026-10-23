import { NextResponse } from 'next/server'
import { lookupCallsign } from '@/lib/route-lookup'

export async function GET(_: Request, { params }: { params: Promise<{ cs: string }> }) {
  const { cs } = await params
  const data = await lookupCallsign(cs)
  return NextResponse.json({ ok: !!data, data })
}
